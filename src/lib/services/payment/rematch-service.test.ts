// src/lib/services/payment/rematch-service.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    syncHistory: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentRecord: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    cardTransaction: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
    },
    saaSCatalog: {
      findMany: vi.fn(),
    },
    saaSPattern: {
      findMany: vi.fn(),
    },
  },
}));

// Mock matching functions
vi.mock("@/lib/services/payment/merchant-matcher", () => ({
  matchMerchant4LayerSync: vi.fn(),
}));

vi.mock("@/lib/services/saas-matcher", () => ({
  matchMerchantWithLLM: vi.fn(),
  checkNonSaaSCache: vi.fn(),
  findNonSaaSKeywordHit: vi.fn(),
}));

// Mock sync-history-service
vi.mock("@/lib/services/payment/sync-history-service", () => ({
  createSyncHistory: vi.fn(),
  completeSyncHistory: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { matchMerchant4LayerSync } from "@/lib/services/payment/merchant-matcher";
import {
  completeSyncHistory,
  createSyncHistory,
} from "@/lib/services/payment/sync-history-service";
import {
  checkNonSaaSCache,
  findNonSaaSKeywordHit,
  matchMerchantWithLLM,
} from "@/lib/services/saas-matcher";
import type { RematchOptions } from "./rematch-service";
import { rematchRecords } from "./rematch-service";

const mockPrisma = prisma as unknown as {
  syncHistory: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  paymentRecord: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  cardTransaction: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  app: { findMany: ReturnType<typeof vi.fn> };
  saaSCatalog: { findMany: ReturnType<typeof vi.fn> };
  saaSPattern: { findMany: ReturnType<typeof vi.fn> };
};

const mockMatchMerchant4LayerSync = matchMerchant4LayerSync as ReturnType<
  typeof vi.fn
>;
const mockMatchMerchantWithLLM = matchMerchantWithLLM as ReturnType<
  typeof vi.fn
>;
const mockCheckNonSaaSCache = checkNonSaaSCache as ReturnType<typeof vi.fn>;
const mockFindNonSaaSKeywordHit = findNonSaaSKeywordHit as ReturnType<
  typeof vi.fn
>;
const mockCreateSyncHistory = createSyncHistory as ReturnType<typeof vi.fn>;
const mockCompleteSyncHistory = completeSyncHistory as ReturnType<typeof vi.fn>;

const BASE_OPTIONS: RematchOptions = {
  organizationId: "org-1",
  userId: "user-1",
  recordType: "payment",
  recordIds: ["rec-1", "rec-2"],
  batchSize: 50,
};

const MOCK_SYNC_HISTORY = {
  id: "sync-1",
  organizationId: "org-1",
  type: "REMATCH",
  status: "RUNNING",
  startedAt: new Date(),
};

const MOCK_PAYMENT_RECORDS = [
  {
    id: "rec-1",
    merchantName: "Slack",
    amount: 10000,
    memo: null,
    matchStatus: "UNMATCHED",
    matchedAppId: null,
  },
  {
    id: "rec-2",
    merchantName: "Notion",
    amount: 5000,
    memo: null,
    matchStatus: "PENDING",
    matchedAppId: null,
  },
];

const MOCK_APPS = [
  { id: "app-1", name: "Slack", catalogId: null },
  { id: "app-2", name: "Notion", catalogId: null },
];

const MOCK_CATALOGS_WITH_PATTERNS = [
  { id: "cat-1", name: "Slack", slug: "slack", patterns: [] },
];

describe("rematchRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no running sync history
    mockPrisma.syncHistory.findFirst.mockResolvedValue(null);

    // Default: createSyncHistory returns a history object
    mockCreateSyncHistory.mockResolvedValue(MOCK_SYNC_HISTORY);

    // Default: completeSyncHistory resolves
    mockCompleteSyncHistory.mockResolvedValue(undefined);

    // Default: payment records
    mockPrisma.paymentRecord.findMany.mockResolvedValue(MOCK_PAYMENT_RECORDS);
    mockPrisma.cardTransaction.findMany.mockResolvedValue([]);

    // Default: apps
    mockPrisma.app.findMany.mockResolvedValue(MOCK_APPS);

    // Default: catalogs
    mockPrisma.saaSCatalog.findMany.mockResolvedValue(
      MOCK_CATALOGS_WITH_PATTERNS
    );
    mockPrisma.saaSPattern.findMany.mockResolvedValue([]);

    // Default: no match from 4-layer
    mockMatchMerchant4LayerSync.mockReturnValue({
      appId: null,
      appName: null,
      confidence: 0,
      matchSource: null,
      matchLayer: null,
      normalized: "slack",
    });

    // Default: no match from LLM
    mockMatchMerchantWithLLM.mockResolvedValue({
      appId: null,
      appName: null,
      confidence: 0,
      matchSource: "LLM",
    });

    // Default: non-SaaS cache returns empty set
    mockCheckNonSaaSCache.mockResolvedValue(new Set());

    // Default: no keyword hit
    mockFindNonSaaSKeywordHit.mockReturnValue(null);

    // Default: payment record update resolves
    mockPrisma.paymentRecord.update.mockResolvedValue({});
  });

  it("throws error when a RUNNING rematch SyncHistory exists for the organization (concurrency lock)", async () => {
    mockPrisma.syncHistory.findFirst.mockResolvedValue({
      ...MOCK_SYNC_HISTORY,
      startedAt: new Date(), // recent = within 10 min
    });

    await expect(rematchRecords(BASE_OPTIONS)).rejects.toThrow(
      "재매칭이 이미 진행 중입니다"
    );
  });

  it("creates SyncHistory with status RUNNING at start", async () => {
    await rematchRecords(BASE_OPTIONS);

    expect(mockCreateSyncHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        type: "REMATCH",
      })
    );
  });

  it("skips records with matchStatus MANUAL (idempotent)", async () => {
    mockPrisma.paymentRecord.findMany.mockResolvedValue([
      {
        id: "rec-manual",
        merchantName: "Slack",
        amount: 10000,
        memo: null,
        matchStatus: "MANUAL",
        matchedAppId: "app-1",
      },
    ]);

    const result = await rematchRecords({
      ...BASE_OPTIONS,
      recordIds: ["rec-manual"],
    });

    expect(mockMatchMerchant4LayerSync).not.toHaveBeenCalled();
    expect(result.skippedCount).toBe(1);
    expect(result.totalProcessed).toBe(1);
  });

  it("skips records with matchStatus AUTO_MATCHED (idempotent)", async () => {
    mockPrisma.paymentRecord.findMany.mockResolvedValue([
      {
        id: "rec-auto",
        merchantName: "Slack",
        amount: 10000,
        memo: null,
        matchStatus: "AUTO_MATCHED",
        matchedAppId: "app-1",
      },
    ]);

    const result = await rematchRecords({
      ...BASE_OPTIONS,
      recordIds: ["rec-auto"],
    });

    expect(mockMatchMerchant4LayerSync).not.toHaveBeenCalled();
    expect(result.skippedCount).toBe(1);
    expect(result.totalProcessed).toBe(1);
  });

  it("calls matchMerchant4LayerSync for UNMATCHED/PENDING records", async () => {
    mockMatchMerchant4LayerSync.mockReturnValue({
      appId: "app-1",
      appName: "Slack",
      confidence: 0.95,
      matchSource: "PATTERN",
      matchLayer: 1,
      normalized: "slack",
    });

    await rematchRecords(BASE_OPTIONS);

    expect(mockMatchMerchant4LayerSync).toHaveBeenCalledTimes(
      MOCK_PAYMENT_RECORDS.length
    );
  });

  it("calls matchMerchantWithLLM when 4-layer returns no match", async () => {
    // 4-layer returns no match for both records
    mockMatchMerchant4LayerSync.mockReturnValue({
      appId: null,
      appName: null,
      confidence: 0,
      matchSource: null,
      matchLayer: null,
      normalized: "unknown",
    });

    await rematchRecords(BASE_OPTIONS);

    expect(mockMatchMerchantWithLLM).toHaveBeenCalledTimes(
      MOCK_PAYMENT_RECORDS.length
    );
  });

  it("updates record matchStatus to AUTO_MATCHED when match found", async () => {
    mockMatchMerchant4LayerSync.mockReturnValue({
      appId: "app-1",
      appName: "Slack",
      confidence: 0.95,
      matchSource: "PATTERN",
      matchLayer: 1,
      normalized: "slack",
    });

    const result = await rematchRecords(BASE_OPTIONS);

    expect(mockPrisma.paymentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchStatus: "AUTO_MATCHED",
          matchedAppId: "app-1",
        }),
      })
    );
    expect(result.matchedCount).toBeGreaterThan(0);
  });

  it("keeps matchStatus as UNMATCHED when no match found", async () => {
    // Both 4-layer and LLM return no match
    mockMatchMerchant4LayerSync.mockReturnValue({
      appId: null,
      appName: null,
      confidence: 0,
      matchSource: null,
      matchLayer: null,
      normalized: "unknown",
    });
    mockMatchMerchantWithLLM.mockResolvedValue({
      appId: null,
      appName: null,
      confidence: 0,
      matchSource: "LLM",
    });

    const result = await rematchRecords(BASE_OPTIONS);

    expect(mockPrisma.paymentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchStatus: "UNMATCHED",
        }),
      })
    );
    expect(result.unmatchedCount).toBe(MOCK_PAYMENT_RECORDS.length);
  });

  it("updates SyncHistory to SUCCESS with correct counts", async () => {
    mockMatchMerchant4LayerSync.mockReturnValue({
      appId: "app-1",
      appName: "Slack",
      confidence: 0.95,
      matchSource: "PATTERN",
      matchLayer: 1,
      normalized: "slack",
    });

    await rematchRecords(BASE_OPTIONS);

    expect(mockCompleteSyncHistory).toHaveBeenCalledWith(
      MOCK_SYNC_HISTORY.id,
      expect.objectContaining({
        status: "SUCCESS",
        totalRecords: MOCK_PAYMENT_RECORDS.length,
      })
    );
  });

  it("updates SyncHistory to FAILED on unhandled error (never leaves RUNNING)", async () => {
    mockPrisma.paymentRecord.findMany.mockRejectedValue(
      new Error("DB connection failed")
    );

    await expect(rematchRecords(BASE_OPTIONS)).rejects.toThrow(
      "DB connection failed"
    );

    expect(mockCompleteSyncHistory).toHaveBeenCalledWith(
      MOCK_SYNC_HISTORY.id,
      expect.objectContaining({
        status: "FAILED",
      })
    );
  });

  it("processes records in batches", async () => {
    const manyRecords = Array.from({ length: 10 }, (_, i) => ({
      id: `rec-${i}`,
      merchantName: `Merchant ${i}`,
      amount: 1000,
      memo: null,
      matchStatus: "UNMATCHED",
      matchedAppId: null,
    }));

    mockPrisma.paymentRecord.findMany.mockResolvedValue(manyRecords);

    const result = await rematchRecords({
      ...BASE_OPTIONS,
      recordIds: manyRecords.map((r) => r.id),
      batchSize: 3,
    });

    expect(result.totalProcessed).toBe(10);
    // 4-layer should have been called for all 10 records
    expect(mockMatchMerchant4LayerSync).toHaveBeenCalledTimes(10);
  });

  it("allows processing when RUNNING entry is older than 10 minutes (stale lock override)", async () => {
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
    mockPrisma.syncHistory.findFirst.mockResolvedValue({
      ...MOCK_SYNC_HISTORY,
      startedAt: elevenMinutesAgo,
    });

    // Should not throw - stale lock is overridden
    await expect(rematchRecords(BASE_OPTIONS)).resolves.toBeDefined();
  });
});
