import { SyncStatus, SyncType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Prisma 모킹
vi.mock("@/lib/db", () => ({
  prisma: {
    syncHistory: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    corporateCard: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  completeSyncHistory,
  createSyncHistory,
  getSyncHistories,
  updateCardFailCount,
} from "./sync-history-service";

const mockSyncHistoryCreate = prisma.syncHistory.create as ReturnType<
  typeof vi.fn
>;

const mockSyncHistoryUpdate = prisma.syncHistory.update as ReturnType<
  typeof vi.fn
>;

const mockSyncHistoryFindMany = prisma.syncHistory.findMany as ReturnType<
  typeof vi.fn
>;

const mockSyncHistoryCount = prisma.syncHistory.count as ReturnType<
  typeof vi.fn
>;

const mockCorporateCardUpdate = prisma.corporateCard.update as ReturnType<
  typeof vi.fn
>;

const mockSyncHistory = {
  id: "sync-1",
  organizationId: "org-1",
  type: SyncType.CARD_SYNC,
  status: SyncStatus.RUNNING,
  corporateCardId: "card-1",
  fileName: null,
  totalRecords: 0,
  successCount: 0,
  failedCount: 0,
  matchedCount: 0,
  unmatchedCount: 0,
  errorMessage: null,
  errorDetails: null,
  startedAt: new Date("2026-03-18T00:00:00Z"),
  completedAt: null,
  triggeredBy: "USER",
  userId: "user-1",
};

describe("sync-history-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSyncHistory", () => {
    it("올바른 필드로 레코드를 생성하고 생성된 엔티티를 반환해야 한다", async () => {
      mockSyncHistoryCreate.mockResolvedValue(mockSyncHistory);

      const input = {
        organizationId: "org-1",
        type: SyncType.CARD_SYNC,
        triggeredBy: "USER" as const,
        userId: "user-1",
        corporateCardId: "card-1",
      };

      const result = await createSyncHistory(input);

      expect(mockSyncHistoryCreate).toHaveBeenCalledOnce();
      expect(mockSyncHistoryCreate).toHaveBeenCalledWith({
        data: {
          organizationId: "org-1",
          type: SyncType.CARD_SYNC,
          status: SyncStatus.RUNNING,
          triggeredBy: "USER",
          userId: "user-1",
          corporateCardId: "card-1",
          fileName: undefined,
        },
      });
      expect(result).toEqual(mockSyncHistory);
    });
  });

  describe("completeSyncHistory", () => {
    it("status, counts, completedAt를 업데이트해야 한다", async () => {
      const completedHistory = {
        ...mockSyncHistory,
        status: SyncStatus.SUCCESS,
        totalRecords: 100,
        successCount: 90,
        failedCount: 10,
        matchedCount: 85,
        unmatchedCount: 5,
        completedAt: new Date("2026-03-18T01:00:00Z"),
      };

      mockSyncHistoryUpdate.mockResolvedValue(completedHistory);

      const result = await completeSyncHistory("sync-1", {
        status: "SUCCESS",
        totalRecords: 100,
        successCount: 90,
        failedCount: 10,
        matchedCount: 85,
        unmatchedCount: 5,
      });

      expect(mockSyncHistoryUpdate).toHaveBeenCalledOnce();
      const callArg = mockSyncHistoryUpdate.mock.calls[0][0];
      expect(callArg.where).toEqual({ id: "sync-1" });
      expect(callArg.data.status).toBe(SyncStatus.SUCCESS);
      expect(callArg.data.totalRecords).toBe(100);
      expect(callArg.data.successCount).toBe(90);
      expect(callArg.data.failedCount).toBe(10);
      expect(callArg.data.matchedCount).toBe(85);
      expect(callArg.data.unmatchedCount).toBe(5);
      expect(callArg.data.completedAt).toBeInstanceOf(Date);
      expect(result).toEqual(completedHistory);
    });

    it("FAILED status일 때 errorMessage와 errorDetails를 설정해야 한다", async () => {
      const failedHistory = {
        ...mockSyncHistory,
        status: SyncStatus.FAILED,
        errorMessage: "카드사 API 오류",
        errorDetails: { code: "API_ERROR", statusCode: 500 },
        completedAt: new Date("2026-03-18T01:00:00Z"),
      };

      mockSyncHistoryUpdate.mockResolvedValue(failedHistory);

      await completeSyncHistory("sync-1", {
        status: "FAILED",
        totalRecords: 0,
        successCount: 0,
        failedCount: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        errorMessage: "카드사 API 오류",
        errorDetails: { code: "API_ERROR", statusCode: 500 },
      });

      const callArg = mockSyncHistoryUpdate.mock.calls[0][0];
      expect(callArg.data.status).toBe(SyncStatus.FAILED);
      expect(callArg.data.errorMessage).toBe("카드사 API 오류");
      expect(callArg.data.errorDetails).toEqual({
        code: "API_ERROR",
        statusCode: 500,
      });
    });
  });

  describe("updateCardFailCount", () => {
    it("success=false일 때 consecutiveFailCount를 1 증가시켜야 한다", async () => {
      mockCorporateCardUpdate.mockResolvedValue({ consecutiveFailCount: 3 });

      const result = await updateCardFailCount("card-1", false);

      expect(mockCorporateCardUpdate).toHaveBeenCalledOnce();
      expect(mockCorporateCardUpdate).toHaveBeenCalledWith({
        where: { id: "card-1" },
        data: {
          consecutiveFailCount: { increment: 1 },
        },
        select: { consecutiveFailCount: true },
      });
      expect(result).toEqual({ consecutiveFailCount: 3 });
    });

    it("success=true일 때 consecutiveFailCount를 0으로 초기화해야 한다", async () => {
      mockCorporateCardUpdate.mockResolvedValue({ consecutiveFailCount: 0 });

      const result = await updateCardFailCount("card-1", true);

      expect(mockCorporateCardUpdate).toHaveBeenCalledOnce();
      expect(mockCorporateCardUpdate).toHaveBeenCalledWith({
        where: { id: "card-1" },
        data: {
          consecutiveFailCount: 0,
        },
        select: { consecutiveFailCount: true },
      });
      expect(result).toEqual({ consecutiveFailCount: 0 });
    });
  });

  describe("getSyncHistories", () => {
    it("organizationId로 필터링된 페이지네이션 결과를 반환해야 한다", async () => {
      mockSyncHistoryFindMany.mockResolvedValue([mockSyncHistory]);
      mockSyncHistoryCount.mockResolvedValue(1);

      const result = await getSyncHistories({ organizationId: "org-1" });

      expect(mockSyncHistoryFindMany).toHaveBeenCalledOnce();
      expect(mockSyncHistoryCount).toHaveBeenCalledOnce();
      expect(result.data).toEqual([mockSyncHistory]);
      expect(result.total).toBe(1);
    });

    it("corporateCardId가 제공되면 해당 필터를 적용해야 한다", async () => {
      mockSyncHistoryFindMany.mockResolvedValue([mockSyncHistory]);
      mockSyncHistoryCount.mockResolvedValue(1);

      await getSyncHistories({
        organizationId: "org-1",
        corporateCardId: "card-1",
      });

      const callArg = mockSyncHistoryFindMany.mock.calls[0][0];
      expect(callArg?.where).toMatchObject({
        organizationId: "org-1",
        corporateCardId: "card-1",
      });
    });

    it("type이 제공되면 해당 필터를 적용해야 한다", async () => {
      mockSyncHistoryFindMany.mockResolvedValue([mockSyncHistory]);
      mockSyncHistoryCount.mockResolvedValue(1);

      await getSyncHistories({
        organizationId: "org-1",
        type: SyncType.CSV_IMPORT,
      });

      const callArg = mockSyncHistoryFindMany.mock.calls[0][0];
      expect(callArg?.where).toMatchObject({
        organizationId: "org-1",
        type: SyncType.CSV_IMPORT,
      });
    });

    it("기본값으로 limit=20, offset=0이 적용되고 startedAt desc 정렬이 되어야 한다", async () => {
      mockSyncHistoryFindMany.mockResolvedValue([]);
      mockSyncHistoryCount.mockResolvedValue(0);

      await getSyncHistories({ organizationId: "org-1" });

      const callArg = mockSyncHistoryFindMany.mock.calls[0][0];
      expect(callArg?.take).toBe(20);
      expect(callArg?.skip).toBe(0);
      expect(callArg?.orderBy).toEqual({ startedAt: "desc" });
    });
  });
});
