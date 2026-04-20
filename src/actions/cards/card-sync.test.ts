// src/actions/cards/card-sync.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock 설정 (import 전에 선언)
vi.mock("@/lib/db", () => ({
  prisma: {
    corporateCard: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
    },
    saaSCatalog: {
      findMany: vi.fn(),
    },
    merchantPattern: {
      findMany: vi.fn(),
    },
    cardTransaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-auth", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  decryptJson: vi.fn().mockReturnValue({
    cardNo: "1234567890123456",
    corpId: "corp-1",
    corpNo: "1234567890",
  }),
}));

vi.mock("@/lib/services/hyphen", () => ({
  getCardApprovals: vi.fn(),
  getLastNDaysRange: vi.fn().mockReturnValue({
    sdate: "20250101",
    edate: "20250131",
  }),
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/services/payment/merchant-matcher", () => ({
  matchMerchant4LayerSync: vi.fn(),
  normalizeMerchantName: vi.fn((name: string) => name.toLowerCase().trim()),
}));

vi.mock("@/lib/services/saas-matcher", () => ({
  checkNonSaaSCache: vi.fn().mockResolvedValue(new Set()),
  findNonSaaSKeywordHit: vi.fn().mockReturnValue(null),
  matchMerchantWithLLM: vi.fn(),
  saveNonSaaSVendors: vi.fn(),
}));

vi.mock("@/lib/services/payment/subscription-auto-link", () => ({
  findActiveSubscriptionForApp: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/payment/sync-history-service", () => ({
  createSyncHistory: vi.fn().mockResolvedValue({ id: "sync-history-1" }),
  completeSyncHistory: vi.fn().mockResolvedValue({}),
  updateCardFailCount: vi.fn().mockResolvedValue({ consecutiveFailCount: 0 }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getCachedSession } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { getCardApprovals } from "@/lib/services/hyphen";
import { matchMerchant4LayerSync } from "@/lib/services/payment/merchant-matcher";
import { findActiveSubscriptionForApp } from "@/lib/services/payment/subscription-auto-link";
import {
  completeSyncHistory,
  createSyncHistory,
  updateCardFailCount,
} from "@/lib/services/payment/sync-history-service";
import {
  checkNonSaaSCache,
  findNonSaaSKeywordHit,
  matchMerchantWithLLM,
  saveNonSaaSVendors,
} from "@/lib/services/saas-matcher";
import { syncCardTransactions } from "./card-sync";

// 테스트 헬퍼: ApprovalItem 생성
function createApprovalItem(overrides: Record<string, string> = {}) {
  return {
    apprNo: "APPR001",
    useDt: "20250115",
    useTm: "143000",
    useStore: "AWS",
    useAmt: "10000",
    settleDt: "20250120",
    storeBizNo: "1234567890",
    storeType: "소프트웨어",
    storeAddr: "서울시 강남구",
    useDiv: "일시불",
    instMon: null,
    addTax: "1000",
    ...overrides,
  };
}

const mockSession = {
  user: {
    id: "user-1",
    organizationId: "org-1",
    role: "ADMIN",
  },
};

const mockCard = {
  id: "card-1",
  organizationId: "org-1",
  cardCd: "SHINHAN",
  cardNo: "****1234",
  cardNm: "법인카드1",
  cardLast4: "1234",
  encryptedCredentials: "encrypted",
  isActive: true,
  teamId: "team-1",
  assignedUserId: "user-1",
  lastSyncAt: null,
  lastError: null,
};

describe("syncCardTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.corporateCard.findFirst).mockResolvedValue(
      mockCard as never
    );
    vi.mocked(prisma.corporateCard.update).mockResolvedValue({} as never);
    vi.mocked(prisma.app.findMany).mockResolvedValue([]);
    vi.mocked(prisma.saaSCatalog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.merchantPattern.findMany).mockResolvedValue([]);
    vi.mocked(prisma.cardTransaction.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.cardTransaction.create).mockResolvedValue({} as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    vi.mocked(getCardApprovals).mockResolvedValue({
      data: { list: [] },
    } as never);
    vi.mocked(matchMerchant4LayerSync).mockReturnValue(null);
    vi.mocked(checkNonSaaSCache).mockResolvedValue(new Set());
    vi.mocked(findNonSaaSKeywordHit).mockReturnValue(null);
    vi.mocked(matchMerchantWithLLM).mockResolvedValue({
      appId: null,
      appName: null,
      confidence: 0,
      matchedBy: null,
      matchSource: "LLM",
    });
    vi.mocked(createSyncHistory).mockResolvedValue({
      id: "sync-history-1",
    } as never);
    vi.mocked(completeSyncHistory).mockResolvedValue({} as never);
    vi.mocked(updateCardFailCount).mockResolvedValue({
      consecutiveFailCount: 0,
    } as never);
  });

  describe("인증 및 카드 조회", () => {
    it("세션이 없으면 인증 오류 반환", async () => {
      vi.mocked(getCachedSession).mockResolvedValue(null);

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("인증이 필요합니다");
    });

    it("카드가 없으면 카드 미발견 오류 반환", async () => {
      vi.mocked(prisma.corporateCard.findFirst).mockResolvedValue(null);

      const result = await syncCardTransactions("card-999");

      expect(result.success).toBe(false);
      expect(result.message).toBe("카드를 찾을 수 없습니다");
    });
  });

  describe("Phase 1: 4-Layer 매칭", () => {
    it("카탈로그 패턴 매칭으로 앱을 찾으면 matched에 추가", async () => {
      const awsItem = createApprovalItem({
        useStore: "AMAZON WEB SERVICES",
        apprNo: "APPR-AWS",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [awsItem] },
      } as never);

      vi.mocked(prisma.app.findMany).mockResolvedValue([
        { id: "app-aws", name: "AWS", catalogId: "catalog-aws" },
      ] as never);

      vi.mocked(prisma.saaSCatalog.findMany).mockResolvedValue([
        {
          id: "catalog-aws",
          name: "AWS",
          slug: "aws",
          patterns: [
            {
              pattern: "amazon web services",
              matchType: "EXACT",
              confidence: 0.95,
            },
          ],
        },
      ] as never);

      // 4-layer matcher가 매칭 결과 반환
      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "app-aws",
        appName: "AWS",
        confidence: 0.95,
        matchSource: "CATALOG",
        matchLayer: 1,
        normalized: "amazon web services",
      });

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(result.data?.created).toBe(1);
      expect(matchMerchant4LayerSync).toHaveBeenCalledWith(
        { merchantName: "AMAZON WEB SERVICES", memo: "일시불" },
        expect.any(Array),
        expect.any(Array),
        0.8
      );
      // matchSource가 CATALOG로 저장되었는지 확인
      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: "app-aws",
          matchSource: "CATALOG",
          matchStatus: "AUTO_MATCHED",
        }),
      });
    });

    it("퍼지 매칭으로 앱을 찾으면 matched에 추가", async () => {
      const slackItem = createApprovalItem({
        useStore: "SLCK TECHNOLOGIES",
        apprNo: "APPR-SLACK",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [slackItem] },
      } as never);

      vi.mocked(prisma.app.findMany).mockResolvedValue([
        { id: "app-slack", name: "Slack", catalogId: null },
      ] as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "app-slack",
        appName: "Slack",
        confidence: 0.85,
        matchSource: "CATALOG",
        matchLayer: 3,
        normalized: "slck technologies",
      });

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(result.data?.created).toBe(1);
      expect(matchMerchantWithLLM).not.toHaveBeenCalled();
    });

    it("커스텀 패턴이 4-layer보다 우선 적용됨", async () => {
      const customItem = createApprovalItem({
        useStore: "INTERNAL-SVC-SLACK",
        apprNo: "APPR-CUSTOM",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [customItem] },
      } as never);

      vi.mocked(prisma.merchantPattern.findMany).mockResolvedValue([
        { pattern: "internal-svc", appId: "app-internal" },
      ] as never);

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(result.data?.created).toBe(1);
      // 커스텀 패턴이 먼저 매칭되므로 4-layer는 호출되지 않아야 함
      expect(matchMerchant4LayerSync).not.toHaveBeenCalled();
      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: "app-internal",
          matchSource: "PATTERN",
          matchConfidence: 1,
        }),
      });
    });

    it("4-layer 매칭 실패 시 unmatched로 분류", async () => {
      const unknownItem = createApprovalItem({
        useStore: "UNKNOWN VENDOR",
        apprNo: "APPR-UNK",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [unknownItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchSource: null,
        matchLayer: null,
        normalized: "unknown vendor",
      });

      vi.mocked(matchMerchantWithLLM).mockResolvedValue({
        appId: null,
        appName: null,
        confidence: 0.2,
        matchedBy: null,
        matchSource: "LLM",
      });

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(matchMerchantWithLLM).toHaveBeenCalledTimes(1);
    });
  });

  describe("Phase 2: Non-SaaS 필터링", () => {
    it("Non-SaaS 캐시에 있으면 LLM 호출 스킵", async () => {
      const taxiItem = createApprovalItem({
        useStore: "카카오T택시",
        apprNo: "APPR-TAXI",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [taxiItem] },
      } as never);

      // 4-layer 매칭 실패
      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchSource: null,
        matchLayer: null,
        normalized: "카카오t택시",
      });

      // Non-SaaS 캐시 히트
      vi.mocked(checkNonSaaSCache).mockResolvedValue(new Set(["카카오t택시"]));

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(matchMerchantWithLLM).not.toHaveBeenCalled();
      // Non-SaaS → appId null, matchSource null, UNMATCHED로 저장
      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: null,
          matchSource: null,
          matchStatus: "UNMATCHED",
        }),
      });
    });

    it("Non-SaaS 키워드 히트 시 LLM 호출 스킵 및 캐시 저장", async () => {
      const foodItem = createApprovalItem({
        useStore: "우아한형제들",
        apprNo: "APPR-FOOD",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [foodItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchSource: null,
        matchLayer: null,
        normalized: "우아한형제들",
      });

      vi.mocked(findNonSaaSKeywordHit).mockReturnValue("배달/음식");

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(matchMerchantWithLLM).not.toHaveBeenCalled();
      expect(saveNonSaaSVendors).toHaveBeenCalledWith(
        "org-1",
        expect.arrayContaining([
          expect.objectContaining({
            originalName: "우아한형제들",
            reasoning: "키워드 제외: 배달/음식",
          }),
        ])
      );
    });

    it("Non-SaaS 키워드 히트 시 matchStatus가 UNMATCHED로 저장", async () => {
      const foodItem = createApprovalItem({
        useStore: "우아한형제들",
        apprNo: "APPR-FOOD2",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [foodItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchSource: null,
        matchLayer: null,
        normalized: "우아한형제들",
      });

      vi.mocked(findNonSaaSKeywordHit).mockReturnValue("배달/음식");

      await syncCardTransactions("card-1");

      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: null,
          matchStatus: "UNMATCHED",
        }),
      });
    });

    it("Non-SaaS 캐시 히트 시 matchStatus가 UNMATCHED로 저장", async () => {
      const taxiItem = createApprovalItem({
        useStore: "카카오T택시",
        apprNo: "APPR-TAXI2",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [taxiItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchSource: null,
        matchLayer: null,
        normalized: "카카오t택시",
      });

      vi.mocked(checkNonSaaSCache).mockResolvedValue(new Set(["카카오t택시"]));

      await syncCardTransactions("card-1");

      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: null,
          matchStatus: "UNMATCHED",
        }),
      });
    });
  });

  describe("Phase 3: 개별 LLM 호출", () => {
    it("각 미매칭 거래에 대해 개별 LLM 호출 실행", async () => {
      const item1 = createApprovalItem({
        useStore: "WASABI TECH",
        apprNo: "APPR-W1",
      });
      const item2 = createApprovalItem({
        useStore: "MAILGUN INC",
        apprNo: "APPR-M1",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [item1, item2] },
      } as never);

      // 4-layer 매칭 실패
      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchSource: null,
        matchLayer: null,
        normalized: "",
      });

      vi.mocked(matchMerchantWithLLM)
        .mockResolvedValueOnce({
          appId: "app-wasabi",
          appName: "Wasabi",
          confidence: 0.9,
          matchedBy: "pattern",
          matchSource: "LLM",
        })
        .mockResolvedValueOnce({
          appId: "app-mailgun",
          appName: "Mailgun",
          confidence: 0.85,
          matchedBy: "pattern",
          matchSource: "LLM",
        });

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(result.data?.created).toBe(2);
      // 개별 호출 (1건씩, 배치가 아님)
      expect(matchMerchantWithLLM).toHaveBeenCalledTimes(2);
      expect(matchMerchantWithLLM).toHaveBeenCalledWith({
        organizationId: "org-1",
        merchantName: "WASABI TECH",
        memo: "일시불",
        storeBizNo: "1234567890",
        amount: 10000,
        currency: "KRW",
      });
      expect(matchMerchantWithLLM).toHaveBeenCalledWith({
        organizationId: "org-1",
        merchantName: "MAILGUN INC",
        memo: "일시불",
        storeBizNo: "1234567890",
        amount: 10000,
        currency: "KRW",
      });
    });

    it("LLM 미매칭 시 matchStatus가 UNMATCHED로 저장", async () => {
      const unknownItem = createApprovalItem({
        useStore: "UNKNOWN VENDOR",
        apprNo: "APPR-UNK2",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [unknownItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchSource: null,
        matchLayer: null,
        normalized: "unknown vendor",
      });

      vi.mocked(matchMerchantWithLLM).mockResolvedValue({
        appId: null,
        appName: null,
        confidence: 0.1,
        matchedBy: null,
        matchSource: "LLM",
      });

      await syncCardTransactions("card-1");

      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: null,
          matchSource: "LLM",
          matchStatus: "UNMATCHED",
        }),
      });
    });

    it("LLM 매칭 결과가 matchSource=LLM으로 저장됨", async () => {
      const openaiItem = createApprovalItem({
        useStore: "OPENAI LLC",
        apprNo: "APPR-OAI",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [openaiItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchSource: null,
        matchLayer: null,
        normalized: "openai llc",
      });

      vi.mocked(matchMerchantWithLLM).mockResolvedValue({
        appId: "app-openai",
        appName: "OpenAI",
        confidence: 0.95,
        matchedBy: "pattern",
        matchSource: "LLM",
      });

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: "app-openai",
          matchSource: "LLM",
          matchConfidence: 0.95,
          matchStatus: "AUTO_MATCHED",
        }),
      });
    });
  });

  describe("Phase 4: 저장", () => {
    it("취소 거래는 매칭 없이 저장", async () => {
      const cancelItem = createApprovalItem({
        useStore: "AWS",
        apprNo: "APPR-CANCEL",
        useDiv: "승인취소",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [cancelItem] },
      } as never);

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(result.data?.created).toBe(1);
      expect(matchMerchant4LayerSync).not.toHaveBeenCalled();
      expect(matchMerchantWithLLM).not.toHaveBeenCalled();
      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: null,
          matchSource: null,
          matchStatus: "PENDING",
        }),
      });
    });

    it("기존 AUTO_MATCHED 거래는 matchStatus 유지", async () => {
      const awsItem = createApprovalItem({
        useStore: "AWS",
        apprNo: "APPR-EXISTING",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [awsItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "app-aws",
        appName: "AWS",
        confidence: 0.95,
        matchSource: "CATALOG",
        matchLayer: 1,
        normalized: "aws",
      });

      // 기존에 자동 매칭된 레코드
      vi.mocked(prisma.cardTransaction.findUnique).mockResolvedValue({
        id: "tx-existing",
        matchStatus: "AUTO_MATCHED",
        matchedAppId: "app-aws-old",
      } as never);

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(result.data?.updated).toBe(1);
      expect(prisma.cardTransaction.update).toHaveBeenCalledWith({
        where: { id: "tx-existing" },
        data: expect.objectContaining({
          // AUTO_MATCHED 상태 유지
          matchStatus: "AUTO_MATCHED",
          matchedAppId: "app-aws-old",
        }),
      });
    });

    it("성공 시 감사 로그 생성", async () => {
      const item = createApprovalItem();
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [item] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "app-1",
        appName: "Test App",
        confidence: 0.9,
        matchSource: "CATALOG",
        matchLayer: 1,
        normalized: "aws",
      });

      await syncCardTransactions("card-1");

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "SYNC_CARD_TRANSACTIONS",
          entityType: "CorporateCard",
          entityId: "card-1",
          organizationId: "org-1",
        }),
      });
    });

    it("카드 동기화 시간 업데이트", async () => {
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [] },
      } as never);

      await syncCardTransactions("card-1");

      expect(prisma.corporateCard.update).toHaveBeenCalledWith({
        where: { id: "card-1" },
        data: expect.objectContaining({
          lastSyncAt: expect.any(Date),
          lastError: null,
        }),
      });
    });
  });

  describe("혼합 시나리오", () => {
    it("여러 거래가 각 경로로 올바르게 분류됨", async () => {
      const awsItem = createApprovalItem({
        useStore: "AWS",
        apprNo: "APPR-1",
      });
      const taxiItem = createApprovalItem({
        useStore: "카카오T택시",
        apprNo: "APPR-2",
      });
      const unknownItem = createApprovalItem({
        useStore: "MYSTERY SaaS",
        apprNo: "APPR-3",
      });
      const cancelItem = createApprovalItem({
        useStore: "AWS",
        apprNo: "APPR-4",
        useDiv: "승인취소",
      });

      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [awsItem, taxiItem, unknownItem, cancelItem] },
      } as never);

      // AWS → 4-layer 매칭 성공
      vi.mocked(matchMerchant4LayerSync)
        .mockReturnValueOnce({
          appId: "app-aws",
          appName: "AWS",
          confidence: 0.95,
          matchSource: "CATALOG",
          matchLayer: 1,
          normalized: "aws",
        })
        // 카카오T택시 → 4-layer 실패
        .mockReturnValueOnce({
          appId: null,
          appName: null,
          confidence: 0,
          matchSource: null,
          matchLayer: null,
          normalized: "카카오t택시",
        })
        // MYSTERY SaaS → 4-layer 실패
        .mockReturnValueOnce({
          appId: null,
          appName: null,
          confidence: 0,
          matchSource: null,
          matchLayer: null,
          normalized: "mystery saas",
        });

      // 카카오T택시 → 키워드 필터
      vi.mocked(findNonSaaSKeywordHit)
        .mockReturnValueOnce("택시/교통")
        .mockReturnValueOnce(null);

      // MYSTERY SaaS → LLM
      vi.mocked(matchMerchantWithLLM).mockResolvedValue({
        appId: "app-mystery",
        appName: "Mystery SaaS",
        confidence: 0.8,
        matchedBy: "pattern",
        matchSource: "LLM",
      });

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(result.data?.created).toBe(4);

      // 4-layer: AWS 1건, 키워드NonSaaS 스킵: 카카오T 1건, LLM: MYSTERY 1건, 취소: 1건
      expect(matchMerchant4LayerSync).toHaveBeenCalledTimes(3);
      expect(matchMerchantWithLLM).toHaveBeenCalledTimes(1);
      expect(prisma.cardTransaction.create).toHaveBeenCalledTimes(4);
    });
  });

  describe("SMP-179: 구독 자동 연결", () => {
    it("매칭된 앱에 ACTIVE 구독이 있으면 linkedSubscriptionId 자동 설정", async () => {
      const awsItem = createApprovalItem({
        useStore: "AWS",
        apprNo: "APPR-SUB-LINK",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [awsItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "app-aws",
        appName: "AWS",
        confidence: 0.95,
        matchSource: "CATALOG",
        matchLayer: 1,
        normalized: "aws",
      });

      vi.mocked(findActiveSubscriptionForApp).mockResolvedValue("sub-aws-1");

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: "app-aws",
          linkedSubscriptionId: "sub-aws-1",
        }),
      });
    });

    it("매칭된 앱에 구독이 없으면 linkedSubscriptionId는 null", async () => {
      const slackItem = createApprovalItem({
        useStore: "SLACK",
        apprNo: "APPR-NO-SUB",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [slackItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "app-slack",
        appName: "Slack",
        confidence: 0.9,
        matchSource: "CATALOG",
        matchLayer: 1,
        normalized: "slack",
      });

      vi.mocked(findActiveSubscriptionForApp).mockResolvedValue(null);

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(prisma.cardTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedAppId: "app-slack",
          linkedSubscriptionId: null,
        }),
      });
    });

    it("재동기화 시 기존 AUTO_MATCHED의 linkedSubscriptionId 보존", async () => {
      const awsItem = createApprovalItem({
        useStore: "AWS",
        apprNo: "APPR-RESYNC",
      });
      vi.mocked(getCardApprovals).mockResolvedValue({
        data: { list: [awsItem] },
      } as never);

      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "app-aws",
        appName: "AWS",
        confidence: 0.95,
        matchSource: "CATALOG",
        matchLayer: 1,
        normalized: "aws",
      });

      vi.mocked(findActiveSubscriptionForApp).mockResolvedValue("sub-aws-new");

      // 기존 레코드가 이미 AUTO_MATCHED 상태
      vi.mocked(prisma.cardTransaction.findUnique).mockResolvedValue({
        id: "tx-existing",
        matchStatus: "AUTO_MATCHED",
        matchedAppId: "app-aws",
        linkedSubscriptionId: "sub-aws-old",
      } as never);

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(prisma.cardTransaction.update).toHaveBeenCalledWith({
        where: { id: "tx-existing" },
        data: expect.objectContaining({
          matchedAppId: "app-aws",
          linkedSubscriptionId: "sub-aws-old", // 기존 값 보존
        }),
      });
    });
  });

  describe("에러 처리", () => {
    it("동기화 실패 시 에러 메시지와 lastError 기록", async () => {
      // 앱 조회에서 DB 에러 발생 → 외부 try-catch로 전파
      vi.mocked(prisma.app.findMany).mockRejectedValue(
        new Error("DB 연결 실패")
      );

      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("거래내역 동기화에 실패했습니다");
      expect(prisma.corporateCard.update).toHaveBeenCalledWith({
        where: { id: "card-1" },
        data: expect.objectContaining({
          lastError: "DB 연결 실패",
        }),
      });
    });

    it("승인내역 조회 실패 시 빈 결과로 계속 진행", async () => {
      const { withRetry } = await import("@/lib/services/hyphen");
      vi.mocked(withRetry).mockRejectedValue(new Error("API 호출 실패"));

      const result = await syncCardTransactions("card-1");

      // 승인내역 실패는 내부 try-catch로 처리, 함수는 성공
      expect(result.success).toBe(true);
      expect(result.data?.created).toBe(0);
      expect(result.data?.updated).toBe(0);
    });
  });

  describe("SyncHistory 기록", () => {
    it("동기화 시작 시 SyncHistory를 RUNNING 상태로 생성", async () => {
      await syncCardTransactions("card-1");

      expect(createSyncHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          type: "CARD_SYNC",
          triggeredBy: "USER",
          userId: "user-1",
          corporateCardId: "card-1",
        })
      );
    });

    it("triggeredBy 옵션이 없으면 기본값 USER로 생성", async () => {
      await syncCardTransactions("card-1");

      expect(createSyncHistory).toHaveBeenCalledWith(
        expect.objectContaining({ triggeredBy: "USER" })
      );
    });

    it("triggeredBy CRON 옵션 전달 시 CRON으로 생성", async () => {
      await syncCardTransactions("card-1", { triggeredBy: "CRON" });

      expect(createSyncHistory).toHaveBeenCalledWith(
        expect.objectContaining({ triggeredBy: "CRON" })
      );
    });

    it("성공 시 completeSyncHistory가 SUCCESS 상태로 호출됨", async () => {
      await syncCardTransactions("card-1");

      expect(completeSyncHistory).toHaveBeenCalledWith(
        "sync-history-1",
        expect.objectContaining({ status: "SUCCESS" })
      );
    });

    it("성공 시 updateCardFailCount가 true로 호출됨", async () => {
      await syncCardTransactions("card-1");

      expect(updateCardFailCount).toHaveBeenCalledWith("card-1", true);
    });

    it("에러 발생 시 completeSyncHistory가 FAILED 상태로 호출됨", async () => {
      vi.mocked(prisma.app.findMany).mockRejectedValue(
        new Error("DB 연결 실패")
      );

      await syncCardTransactions("card-1");

      expect(completeSyncHistory).toHaveBeenCalledWith(
        "sync-history-1",
        expect.objectContaining({
          status: "FAILED",
          errorMessage: "DB 연결 실패",
        })
      );
    });

    it("에러 발생 시 updateCardFailCount가 false로 호출됨", async () => {
      vi.mocked(prisma.app.findMany).mockRejectedValue(
        new Error("DB 연결 실패")
      );

      await syncCardTransactions("card-1");

      expect(updateCardFailCount).toHaveBeenCalledWith("card-1", false);
    });

    it("성공 반환 데이터에 syncHistoryId 포함", async () => {
      const result = await syncCardTransactions("card-1");

      expect(result.success).toBe(true);
      expect(result.data?.syncHistoryId).toBe("sync-history-1");
    });

    it("createSyncHistory 실패해도 메인 동기화 흐름은 계속 진행", async () => {
      vi.mocked(createSyncHistory).mockRejectedValue(
        new Error("SyncHistory DB 오류")
      );

      const result = await syncCardTransactions("card-1");

      // SyncHistory 실패해도 메인 동기화는 성공
      expect(result.success).toBe(true);
    });
  });
});
