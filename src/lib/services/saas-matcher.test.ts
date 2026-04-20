// src/lib/services/saas-matcher.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkNonSaaSCache,
  findNonSaaSKeywordHit,
  matchMerchantsBatchWithLLM,
  matchMerchantWithLLM,
  NON_SAAS_KEYWORDS,
  processMerchantsInBatches,
  removeFromNonSaaSCache,
  saveNonSaaSVendors,
  type BatchMatchMerchant,
  type BatchMatchResult,
} from "./saas-matcher";

// Prisma mock
vi.mock("@/lib/db", () => ({
  prisma: {
    saaSCatalog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    saaSPattern: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    app: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    vendorInferenceLog: {
      create: vi.fn(),
    },
    nonSaaSVendor: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    // SMP-107: AppTeam 자동 배정을 위한 mock
    user: {
      findUnique: vi.fn(),
    },
    appTeam: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// saas-classifier mock
vi.mock("@/lib/services/saas-classifier", () => ({
  classifyMerchantWithLLM: vi.fn(),
  classifyMerchantsBatchWithLLM: vi.fn(),
}));

// merchant-matcher mock
vi.mock("@/lib/services/payment/merchant-matcher", () => ({
  normalizeMerchantName: vi.fn((name: string) => name.toLowerCase().trim()),
}));

import { prisma } from "@/lib/db";
import {
  classifyMerchantWithLLM as classify,
  classifyMerchantsBatchWithLLM as classifyBatch,
} from "@/lib/services/saas-classifier";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockClassify = classify as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockClassifyBatch = classifyBatch as any;

describe("saas-matcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findNonSaaSKeywordHit", () => {
    it("detects Non-SaaS keyword in merchant name", () => {
      const hit = findNonSaaSKeywordHit("카카오T 블루", null);
      expect(hit).toBe("카카오T");
    });

    it("detects Non-SaaS keyword in memo", () => {
      const hit = findNonSaaSKeywordHit("기타 가맹점", "우아한형제들 배달");
      expect(hit).toBe("우아한형제들");
    });

    it("handles lowercase/uppercase mix", () => {
      // 아이엠택시가 아이엠택시_스마트보다 먼저 매칭됨
      const hit = findNonSaaSKeywordHit("아이엠택시_스마트", "memo");
      expect(hit).toBe("아이엠택시");
    });

    it("detects English keywords case-insensitively", () => {
      // STARBUCKS 키워드가 배열에서 먼저 나옴
      const hit = findNonSaaSKeywordHit("starbucks coffee", null);
      expect(hit).toBe("STARBUCKS");
    });

    it("detects transportation keywords", () => {
      // UBER 키워드가 배열에서 우버보다 먼저 나옴
      const hit = findNonSaaSKeywordHit("UBER TRIP", null);
      expect(hit).toBe("UBER");
    });

    it("detects convenience store keywords", () => {
      const hit = findNonSaaSKeywordHit("GS25 강남점", null);
      expect(hit).toBe("GS25");
    });

    it("detects Korean keywords", () => {
      const hit = findNonSaaSKeywordHit("스타벅스 강남점", null);
      expect(hit).toBe("스타벅스");
    });

    it("returns null when no keyword matches", () => {
      const hit = findNonSaaSKeywordHit("구글 클라우드", "월 구독");
      expect(hit).toBeNull();
    });

    it("handles empty/null inputs", () => {
      expect(findNonSaaSKeywordHit("", null)).toBeNull();
      expect(findNonSaaSKeywordHit("test", "")).toBeNull();
    });
  });

  describe("NON_SAAS_KEYWORDS", () => {
    it("should contain expected keywords", () => {
      expect(NON_SAAS_KEYWORDS).toContain("카카오T");
      expect(NON_SAAS_KEYWORDS).toContain("우아한형제들");
      expect(NON_SAAS_KEYWORDS).toContain("아이엠택시_스마트");
    });
  });

  describe("checkNonSaaSCache", () => {
    it("returns empty set for empty input", async () => {
      const result = await checkNonSaaSCache("org-1", []);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
      expect(mockPrisma.nonSaaSVendor.findMany).not.toHaveBeenCalled();
    });

    it("queries and returns cached vendor names", async () => {
      mockPrisma.nonSaaSVendor.findMany.mockResolvedValueOnce([
        { normalizedName: "starbucks" } as never,
        { normalizedName: "mcdonalds" } as never,
      ]);

      const result = await checkNonSaaSCache("org-1", [
        "starbucks",
        "mcdonalds",
        "slack",
      ]);

      expect(mockPrisma.nonSaaSVendor.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          normalizedName: { in: ["starbucks", "mcdonalds", "slack"] },
        },
        select: { normalizedName: true },
      });

      expect(result.has("starbucks")).toBe(true);
      expect(result.has("mcdonalds")).toBe(true);
      expect(result.has("slack")).toBe(false);
    });
  });

  describe("saveNonSaaSVendors", () => {
    it("does nothing for empty input", async () => {
      await saveNonSaaSVendors("org-1", []);
      expect(mockPrisma.nonSaaSVendor.upsert).not.toHaveBeenCalled();
    });

    it("upserts each vendor", async () => {
      mockPrisma.nonSaaSVendor.upsert.mockResolvedValue({} as never);

      await saveNonSaaSVendors("org-1", [
        {
          normalizedName: "starbucks",
          originalName: "Starbucks Coffee",
          confidence: 0.9,
          reasoning: "Coffee shop",
        },
        {
          normalizedName: "mcdonalds",
          originalName: "McDonald's",
          confidence: 0.85,
        },
      ]);

      expect(mockPrisma.nonSaaSVendor.upsert).toHaveBeenCalledTimes(2);

      expect(mockPrisma.nonSaaSVendor.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_normalizedName: {
            organizationId: "org-1",
            normalizedName: "starbucks",
          },
        },
        create: {
          organizationId: "org-1",
          normalizedName: "starbucks",
          originalName: "Starbucks Coffee",
          confidence: 0.9,
          reasoning: "Coffee shop",
          transactionCount: 1,
        },
        update: {
          transactionCount: { increment: 1 },
          lastSeenAt: expect.any(Date),
        },
      });
    });
  });

  describe("removeFromNonSaaSCache", () => {
    it("deletes matching vendor from cache", async () => {
      mockPrisma.nonSaaSVendor.deleteMany.mockResolvedValueOnce({
        count: 1,
      } as never);

      await removeFromNonSaaSCache("org-1", "starbucks");

      expect(mockPrisma.nonSaaSVendor.deleteMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          normalizedName: "starbucks",
        },
      });
    });
  });

  describe("determineAppStatus - confidence-based status", () => {
    const organizationId = "org-status";

    it("creates app with ACTIVE status for high confidence (>=80%)", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "HighConfidence SaaS",
          website: "https://example.com",
          category: "Productivity",
          confidence: 0.85, // 85% - high confidence
          suggestedPatterns: ["highconf"],
          reasoning: "High confidence SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce(null);
      mockPrisma.saaSCatalog.create.mockResolvedValueOnce({
        id: "cat-high",
        name: "HighConfidence SaaS",
        slug: "highconfidence-saas",
      } as never);
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValueOnce({
        count: 1,
      } as never);
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-high",
        name: "HighConfidence SaaS",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "HighConfidence SaaS",
      });

      // Should create app with ACTIVE status (confidence >= 0.8)
      expect(mockPrisma.app.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "ACTIVE",
        }),
      });
    });

    it("creates app with PENDING_REVIEW status for medium confidence (50-80%)", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "MediumConfidence SaaS",
          website: "https://example.com",
          category: "Productivity",
          confidence: 0.65, // 65% - medium confidence
          suggestedPatterns: ["medconf"],
          reasoning: "Medium confidence SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce(null);
      mockPrisma.saaSCatalog.create.mockResolvedValueOnce({
        id: "cat-med",
        name: "MediumConfidence SaaS",
        slug: "mediumconfidence-saas",
      } as never);
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValueOnce({
        count: 1,
      } as never);
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-med",
        name: "MediumConfidence SaaS",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "MediumConfidence SaaS",
      });

      // Should create app with PENDING_REVIEW status (confidence < 0.8)
      expect(mockPrisma.app.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "PENDING_REVIEW",
        }),
      });
    });

    it("creates app with ACTIVE status for exactly 80% confidence", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "Boundary SaaS",
          website: "https://example.com",
          category: "Productivity",
          confidence: 0.8, // exactly 80% - boundary case
          suggestedPatterns: ["boundary"],
          reasoning: "Boundary confidence SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce(null);
      mockPrisma.saaSCatalog.create.mockResolvedValueOnce({
        id: "cat-bound",
        name: "Boundary SaaS",
        slug: "boundary-saas",
      } as never);
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValueOnce({
        count: 1,
      } as never);
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-bound",
        name: "Boundary SaaS",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "Boundary SaaS",
      });

      // Should create app with ACTIVE status (confidence == 0.8)
      expect(mockPrisma.app.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "ACTIVE",
        }),
      });
    });

    it("creates app with PENDING_REVIEW status for 79% confidence", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "Below Boundary SaaS",
          website: "https://example.com",
          category: "Productivity",
          confidence: 0.79, // 79% - just below boundary
          suggestedPatterns: ["below"],
          reasoning: "Below boundary confidence SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce(null);
      mockPrisma.saaSCatalog.create.mockResolvedValueOnce({
        id: "cat-below",
        name: "Below Boundary SaaS",
        slug: "below-boundary-saas",
      } as never);
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValueOnce({
        count: 1,
      } as never);
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-below",
        name: "Below Boundary SaaS",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "Below Boundary SaaS",
      });

      // Should create app with PENDING_REVIEW status (confidence < 0.8)
      expect(mockPrisma.app.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "PENDING_REVIEW",
        }),
      });
    });
  });

  describe("matchMerchantWithLLM", () => {
    const organizationId = "org-123";

    it("returns non-match when LLM returns null inference", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: null,
        errorCode: "timeout",
      });
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      const result = await matchMerchantWithLLM({
        organizationId,
        merchantName: "Unknown Vendor",
      });

      expect(result.appId).toBeNull();
      expect(result.appName).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchSource).toBe("LLM");
    });

    it("returns non-match when LLM classifies as non-SaaS", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: false,
          canonicalName: null,
          website: null,
          category: null,
          confidence: 0.8,
          suggestedPatterns: [],
          reasoning: "Coffee shop, not SaaS",
        },
      });
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      const result = await matchMerchantWithLLM({
        organizationId,
        merchantName: "Starbucks",
      });

      expect(result.appId).toBeNull();
      expect(result.appName).toBeNull();
      expect(result.confidence).toBe(0.8);
      expect(result.matchSource).toBe("LLM");
    });

    it("creates catalog and app when LLM identifies SaaS", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "Slack",
          website: "https://slack.com",
          category: "Communication",
          confidence: 0.95,
          suggestedPatterns: ["slack", "slack technologies"],
          reasoning: "Enterprise messaging SaaS",
        },
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      // Catalog not found, will be created
      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce(null);
      mockPrisma.saaSCatalog.create.mockResolvedValueOnce({
        id: "catalog-1",
        name: "Slack",
        slug: "slack",
      } as never);

      // No existing patterns
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValueOnce({
        count: 2,
      } as never);

      // App not found, will be created
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-1",
        name: "Slack",
      } as never);

      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      const result = await matchMerchantWithLLM({
        organizationId,
        merchantName: "SLACK TECHNOLOGIES INC",
        amount: 500,
        currency: "USD",
      });

      expect(result.appId).toBe("app-1");
      expect(result.appName).toBe("Slack");
      expect(result.confidence).toBe(0.95);
      expect(result.matchSource).toBe("LLM");

      // Verify catalog creation — "Communication" normalized to "collaboration"
      expect(mockPrisma.saaSCatalog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Slack",
          slug: "slack",
          category: "collaboration",
          website: "https://slack.com",
        }),
      });

      // Verify pattern creation
      expect(mockPrisma.saaSPattern.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ pattern: "slack" }),
          expect.objectContaining({ pattern: "slack technologies" }),
        ]),
      });
    });

    it("uses existing catalog if found", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "Notion",
          website: "https://notion.so",
          category: "Productivity",
          confidence: 0.9,
          suggestedPatterns: ["notion"],
          reasoning: "Productivity SaaS",
        },
      });

      // Catalog found
      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce({
        id: "existing-catalog",
        name: "Notion",
        slug: "notion",
      } as never);

      // Pattern already exists
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([
        { pattern: "notion" } as never,
      ]);

      // App not found, will be created
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "new-app",
        name: "Notion",
      } as never);

      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      const result = await matchMerchantWithLLM({
        organizationId,
        merchantName: "Notion Labs",
      });

      expect(result.appId).toBe("new-app");
      // Catalog should not be created again
      expect(mockPrisma.saaSCatalog.create).not.toHaveBeenCalled();
      // Existing pattern should not be duplicated
      expect(mockPrisma.saaSPattern.createMany).not.toHaveBeenCalled();
    });

    it("uses existing app if found", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "GitHub",
          website: "https://github.com",
          category: "Developer Tools",
          confidence: 0.95,
          suggestedPatterns: [],
          reasoning: "Developer SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce({
        id: "catalog-github",
        name: "GitHub",
        slug: "github",
      } as never);

      // App already exists
      mockPrisma.app.findFirst.mockResolvedValueOnce({
        id: "existing-app",
        name: "GitHub",
      } as never);

      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      const result = await matchMerchantWithLLM({
        organizationId,
        merchantName: "GitHub Inc",
      });

      expect(result.appId).toBe("existing-app");
      expect(result.appName).toBe("GitHub");
      // App should not be created again
      expect(mockPrisma.app.create).not.toHaveBeenCalled();
    });

    it("uses merchantName when canonicalName is not provided", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: null,
          website: null,
          category: null,
          confidence: 0.6,
          suggestedPatterns: [],
          reasoning: "Likely SaaS",
        },
      });

      // No catalog without canonical name
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-unknown",
        name: "Unknown SaaS Vendor",
      } as never);

      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      const result = await matchMerchantWithLLM({
        organizationId,
        merchantName: "Unknown SaaS Vendor",
      });

      expect(result.appName).toBe("Unknown SaaS Vendor");
      expect(mockPrisma.app.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Unknown SaaS Vendor",
          }),
        })
      );
    });
  });

  // ==================== SMP-162: Category 자동 추가 + 정규화 테스트 ====================

  describe("upsertAppForOrganization - category handling (SMP-162)", () => {
    const organizationId = "org-cat-test";

    it("normalizes LLM category before saving to app.create", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "Figma",
          website: "https://figma.com",
          category: "Design Tools", // LLM 출력: 자유 형식
          confidence: 0.9,
          suggestedPatterns: ["figma"],
          reasoning: "Design SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce(null);
      mockPrisma.saaSCatalog.create.mockResolvedValueOnce({
        id: "cat-figma",
        name: "Figma",
        slug: "figma",
      } as never);
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValueOnce({
        count: 1,
      } as never);
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-figma",
        name: "Figma",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "FIGMA INC",
      });

      // "Design Tools" → normalizeCategory → "design"
      expect(mockPrisma.app.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: "design",
        }),
      });
    });

    it("normalizes category when updating existing app with null category", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "Notion",
          website: "https://notion.so",
          category: "Productivity", // LLM 출력
          confidence: 0.9,
          suggestedPatterns: [],
          reasoning: "Productivity SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce({
        id: "cat-notion",
        name: "Notion",
        slug: "notion",
      } as never);
      // App already exists with null category
      mockPrisma.app.findFirst.mockResolvedValueOnce({
        id: "app-notion",
        name: "Notion",
        category: null,
      } as never);
      mockPrisma.app.update.mockResolvedValueOnce({
        id: "app-notion",
        name: "Notion",
        category: "productivity",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      const result = await matchMerchantWithLLM({
        organizationId,
        merchantName: "Notion Labs",
      });

      // "Productivity" → normalizeCategory → "productivity" (standard)
      expect(mockPrisma.app.update).toHaveBeenCalledWith({
        where: { id: "app-notion" },
        data: { category: "productivity" },
      });
      expect(result.appId).toBe("app-notion");
    });

    it("does not update existing app when category is already set", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "Slack",
          website: "https://slack.com",
          category: "Communication",
          confidence: 0.9,
          suggestedPatterns: [],
          reasoning: "SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce({
        id: "cat-slack",
        name: "Slack",
        slug: "slack",
      } as never);
      // App already exists with a category set
      mockPrisma.app.findFirst.mockResolvedValueOnce({
        id: "app-slack",
        name: "Slack",
        category: "Collaboration",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "Slack Technologies",
      });

      expect(mockPrisma.app.update).not.toHaveBeenCalled();
      expect(mockPrisma.app.create).not.toHaveBeenCalled();
    });

    it("sets category to null when inference has no category", async () => {
      mockClassify.mockResolvedValueOnce({
        inference: {
          isSaaS: true,
          canonicalName: "UnknownSaaS",
          website: null,
          category: null,
          confidence: 0.6,
          suggestedPatterns: [],
          reasoning: "Likely SaaS",
        },
      });

      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-unknown",
        name: "UnknownSaaS",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValueOnce({} as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "UnknownSaaS",
      });

      expect(mockPrisma.app.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: null,
        }),
      });
    });
  });

  describe("matchMerchantsBatchWithLLM - category normalization (SMP-162)", () => {
    const organizationId = "org-batch-cat";

    it("normalizes LLM category in batch mode", async () => {
      const merchants: BatchMatchMerchant[] = [
        { id: "tx-1", merchantName: "Asana Inc", amount: 300 },
      ];

      mockClassifyBatch.mockResolvedValueOnce({
        results: [
          {
            id: "tx-1",
            inference: {
              isSaaS: true,
              canonicalName: "Asana",
              website: "https://asana.com",
              category: "Project Management", // LLM 출력
              confidence: 0.92,
              suggestedPatterns: ["asana"],
              reasoning: "SaaS",
            },
          },
        ],
        usage: { totalTokens: 100 },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce(null);
      mockPrisma.saaSCatalog.create.mockResolvedValueOnce({
        id: "cat-asana",
        name: "Asana",
        slug: "asana",
      } as never);
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValueOnce({
        count: 1,
      } as never);
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-asana",
        name: "Asana",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValue({} as never);

      await matchMerchantsBatchWithLLM(organizationId, merchants);

      // "Project Management" → normalizeCategory → "productivity"
      expect(mockPrisma.app.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: "productivity",
        }),
      });
    });
  });

  describe("matchMerchantsBatchWithLLM", () => {
    const organizationId = "org-batch";

    it("returns empty array for empty input", async () => {
      const result = await matchMerchantsBatchWithLLM(organizationId, []);
      expect(result).toEqual([]);
      expect(mockClassifyBatch).not.toHaveBeenCalled();
    });

    it("processes batch and returns mixed results", async () => {
      const merchants: BatchMatchMerchant[] = [
        { id: "tx-1", merchantName: "Slack Technologies", amount: 500 },
        { id: "tx-2", merchantName: "Starbucks Coffee", amount: 15 },
      ];

      mockClassifyBatch.mockResolvedValueOnce({
        results: [
          {
            id: "tx-1",
            inference: {
              isSaaS: true,
              canonicalName: "Slack",
              website: "https://slack.com",
              category: "Communication",
              confidence: 0.95,
              suggestedPatterns: ["slack"],
              reasoning: "SaaS",
            },
          },
          {
            id: "tx-2",
            inference: {
              isSaaS: false,
              canonicalName: null,
              website: null,
              category: null,
              confidence: 0.9,
              suggestedPatterns: [],
              reasoning: "Coffee shop",
            },
          },
        ],
        usage: { totalTokens: 200 },
      });

      // Setup for Slack (SaaS)
      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce(null);
      mockPrisma.saaSCatalog.create.mockResolvedValueOnce({
        id: "cat-slack",
        name: "Slack",
        slug: "slack",
      } as never);
      mockPrisma.saaSPattern.findMany.mockResolvedValueOnce([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValueOnce({
        count: 1,
      } as never);
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);
      mockPrisma.app.create.mockResolvedValueOnce({
        id: "app-slack",
        name: "Slack",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValue({} as never);
      mockPrisma.nonSaaSVendor.upsert.mockResolvedValue({} as never);

      const results = await matchMerchantsBatchWithLLM(
        organizationId,
        merchants
      );

      expect(results).toHaveLength(2);

      // Slack should be SaaS
      const slackResult = results.find((r) => r.id === "tx-1");
      expect(slackResult?.isSaaS).toBe(true);
      expect(slackResult?.appId).toBe("app-slack");
      expect(slackResult?.appName).toBe("Slack");

      // Starbucks should be Non-SaaS
      const starbucksResult = results.find((r) => r.id === "tx-2");
      expect(starbucksResult?.isSaaS).toBe(false);
      expect(starbucksResult?.appId).toBeNull();

      // Non-SaaS vendor should be saved to cache
      expect(mockPrisma.nonSaaSVendor.upsert).toHaveBeenCalled();
    });

    it("handles null inference in batch results", async () => {
      const merchants: BatchMatchMerchant[] = [
        { id: "tx-1", merchantName: "Unknown Merchant" },
      ];

      mockClassifyBatch.mockResolvedValueOnce({
        results: [{ id: "tx-1", inference: null }],
        errorCode: "timeout",
      });

      mockPrisma.vendorInferenceLog.create.mockResolvedValue({} as never);
      mockPrisma.nonSaaSVendor.upsert.mockResolvedValue({} as never);

      const results = await matchMerchantsBatchWithLLM(
        organizationId,
        merchants
      );

      expect(results).toHaveLength(1);
      expect(results[0].isSaaS).toBe(false);
      expect(results[0].appId).toBeNull();
      expect(results[0].confidence).toBe(0);
    });

    it("includes recurrenceHint in batch input", async () => {
      const merchants: BatchMatchMerchant[] = [
        {
          id: "tx-1",
          merchantName: "GitHub",
          recurrenceHint: "monthly",
          amount: 9,
        },
      ];

      mockClassifyBatch.mockResolvedValueOnce({
        results: [
          {
            id: "tx-1",
            inference: {
              isSaaS: true,
              canonicalName: "GitHub",
              website: "https://github.com",
              category: "Developer Tools",
              confidence: 0.95,
              suggestedPatterns: [],
              reasoning: "SaaS",
            },
          },
        ],
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValueOnce({
        id: "cat-gh",
        name: "GitHub",
        slug: "github",
      } as never);
      mockPrisma.app.findFirst.mockResolvedValueOnce({
        id: "app-gh",
        name: "GitHub",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValue({} as never);

      await matchMerchantsBatchWithLLM(organizationId, merchants);

      expect(mockClassifyBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "tx-1",
          merchantName: "GitHub",
          recurrenceHint: "monthly",
          amount: 9,
        }),
      ]);
    });
  });

  describe("processMerchantsInBatches", () => {
    it("processes items in chunks", async () => {
      const items = [
        { id: "1", merchantName: "A" },
        { id: "2", merchantName: "B" },
        { id: "3", merchantName: "C" },
        { id: "4", merchantName: "D" },
        { id: "5", merchantName: "E" },
      ];

      const processor = vi.fn().mockImplementation((batch) =>
        Promise.resolve(
          batch.map((item: { id: string }) => ({
            id: item.id,
            appId: null,
            appName: null,
            confidence: 0,
            matchSource: "LLM" as const,
            isSaaS: false,
          }))
        )
      );

      const results = await processMerchantsInBatches(items, 2, processor);

      expect(results).toHaveLength(5);
      // Should be called 3 times: [A,B], [C,D], [E]
      expect(processor).toHaveBeenCalledTimes(3);
      expect(processor).toHaveBeenNthCalledWith(1, [items[0], items[1]]);
      expect(processor).toHaveBeenNthCalledWith(2, [items[2], items[3]]);
      expect(processor).toHaveBeenNthCalledWith(3, [items[4]]);
    });

    it("returns empty array for empty input", async () => {
      const processor = vi.fn();

      const results = await processMerchantsInBatches([], 10, processor);

      expect(results).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    it("handles single item", async () => {
      const items = [{ id: "1", merchantName: "Single" }];

      const processor = vi.fn().mockResolvedValue([
        {
          id: "1",
          appId: null,
          appName: null,
          confidence: 0.5,
          matchSource: "LLM",
          isSaaS: false,
        } as BatchMatchResult,
      ]);

      const results = await processMerchantsInBatches(items, 10, processor);

      expect(results).toHaveLength(1);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it("processes exactly chunk-sized batches correctly", async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        merchantName: `Item ${i}`,
      }));

      const processor = vi.fn().mockImplementation((batch) =>
        Promise.resolve(
          batch.map((item: { id: string }) => ({
            id: item.id,
            appId: null,
            appName: null,
            confidence: 0,
            matchSource: "LLM" as const,
            isSaaS: false,
          }))
        )
      );

      const results = await processMerchantsInBatches(items, 5, processor);

      expect(results).toHaveLength(10);
      // Should be called exactly 2 times: [0-4], [5-9]
      expect(processor).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== SMP-107: AppTeam 자동 배정 테스트 ====================

  describe("matchMerchantWithLLM - AppTeam auto assignment (SMP-107)", () => {
    const organizationId = "org-team-test";

    beforeEach(() => {
      // 기본 SaaS 응답 설정
      mockClassify.mockResolvedValue({
        inference: {
          isSaaS: true,
          canonicalName: "TestApp",
          website: "https://testapp.com",
          category: "Productivity",
          confidence: 0.9,
          suggestedPatterns: ["testapp"],
          reasoning: "Test SaaS",
        },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValue(null);
      mockPrisma.saaSCatalog.create.mockResolvedValue({
        id: "cat-test",
        name: "TestApp",
        slug: "testapp",
      } as never);
      mockPrisma.saaSPattern.findMany.mockResolvedValue([]);
      mockPrisma.saaSPattern.createMany.mockResolvedValue({
        count: 1,
      } as never);
      mockPrisma.app.findFirst.mockResolvedValue(null);
      mockPrisma.app.create.mockResolvedValue({
        id: "app-test",
        name: "TestApp",
      } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValue({} as never);
      mockPrisma.appTeam.findFirst.mockResolvedValue(null);
      mockPrisma.appTeam.create.mockResolvedValue({
        id: "appteam-1",
        appId: "app-test",
        teamId: "team-1",
      } as never);
    });

    it("creates AppTeam when teamId is provided", async () => {
      await matchMerchantWithLLM({
        organizationId,
        merchantName: "TestApp Inc",
        teamId: "team-1",
      });

      expect(mockPrisma.appTeam.findFirst).toHaveBeenCalledWith({
        where: { appId: "app-test", teamId: "team-1" },
      });
      expect(mockPrisma.appTeam.create).toHaveBeenCalledWith({
        data: {
          appId: "app-test",
          teamId: "team-1",
          assignedBy: null,
        },
      });
    });

    it("creates AppTeam with user's team when userId is provided", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        teamId: "team-2",
      } as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "TestApp Inc",
        userId: "user-1",
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { teamId: true },
      });
      expect(mockPrisma.appTeam.create).toHaveBeenCalledWith({
        data: {
          appId: "app-test",
          teamId: "team-2",
          assignedBy: "user-1",
        },
      });
    });

    it("does not create AppTeam when neither teamId nor userId is provided", async () => {
      await matchMerchantWithLLM({
        organizationId,
        merchantName: "TestApp Inc",
      });

      expect(mockPrisma.appTeam.create).not.toHaveBeenCalled();
    });

    it("does not create AppTeam when user has no team", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        teamId: null,
      } as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "TestApp Inc",
        userId: "user-1",
      });

      expect(mockPrisma.appTeam.create).not.toHaveBeenCalled();
    });

    it("does not create duplicate AppTeam when already exists", async () => {
      mockPrisma.appTeam.findFirst.mockResolvedValue({
        id: "existing-appteam",
        appId: "app-test",
        teamId: "team-1",
      } as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "TestApp Inc",
        teamId: "team-1",
      });

      expect(mockPrisma.appTeam.findFirst).toHaveBeenCalled();
      expect(mockPrisma.appTeam.create).not.toHaveBeenCalled();
    });

    it("prefers teamId over userId when both are provided", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        teamId: "team-user",
      } as never);

      await matchMerchantWithLLM({
        organizationId,
        merchantName: "TestApp Inc",
        teamId: "team-direct",
        userId: "user-1",
      });

      // teamId가 있으면 user.findUnique는 호출되지 않음
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.appTeam.create).toHaveBeenCalledWith({
        data: {
          appId: "app-test",
          teamId: "team-direct",
          assignedBy: "user-1",
        },
      });
    });
  });

  describe("matchMerchantsBatchWithLLM - AppTeam auto assignment (SMP-107)", () => {
    const organizationId = "org-batch-team";

    it("creates AppTeam for each SaaS merchant with teamId", async () => {
      const merchants: BatchMatchMerchant[] = [
        { id: "tx-1", merchantName: "Slack", teamId: "team-1" },
        { id: "tx-2", merchantName: "Notion", teamId: "team-2" },
      ];

      mockClassifyBatch.mockResolvedValue({
        results: [
          {
            id: "tx-1",
            inference: {
              isSaaS: true,
              canonicalName: "Slack",
              website: "https://slack.com",
              category: "Communication",
              confidence: 0.95,
              suggestedPatterns: [],
              reasoning: "SaaS",
            },
          },
          {
            id: "tx-2",
            inference: {
              isSaaS: true,
              canonicalName: "Notion",
              website: "https://notion.so",
              category: "Productivity",
              confidence: 0.9,
              suggestedPatterns: [],
              reasoning: "SaaS",
            },
          },
        ],
        usage: { totalTokens: 200 },
      });

      mockPrisma.saaSCatalog.findFirst.mockResolvedValue({
        id: "cat-1",
        name: "Test",
        slug: "test",
      } as never);
      mockPrisma.app.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.app.create
        .mockResolvedValueOnce({ id: "app-slack", name: "Slack" } as never)
        .mockResolvedValueOnce({ id: "app-notion", name: "Notion" } as never);
      mockPrisma.vendorInferenceLog.create.mockResolvedValue({} as never);
      mockPrisma.appTeam.findFirst.mockResolvedValue(null);
      mockPrisma.appTeam.create.mockResolvedValue({} as never);

      await matchMerchantsBatchWithLLM(organizationId, merchants);

      expect(mockPrisma.appTeam.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.appTeam.create).toHaveBeenCalledWith({
        data: {
          appId: "app-slack",
          teamId: "team-1",
          assignedBy: null,
        },
      });
      expect(mockPrisma.appTeam.create).toHaveBeenCalledWith({
        data: {
          appId: "app-notion",
          teamId: "team-2",
          assignedBy: null,
        },
      });
    });
  });
});
