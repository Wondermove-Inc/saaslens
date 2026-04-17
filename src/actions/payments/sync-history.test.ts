// src/actions/payments/sync-history.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-auth", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/services/payment/sync-history-service", () => ({
  getSyncHistories: vi.fn(),
}));

import { getCachedSession } from "@/lib/auth/require-auth";
import { getSyncHistories } from "@/lib/services/payment/sync-history-service";
import { getSyncHistory } from "./sync-history";

const mockGetCachedSession = vi.mocked(getCachedSession);
const mockGetSyncHistories = vi.mocked(getSyncHistories);

const mockSyncHistoryData = {
  data: [
    {
      id: "sh-1",
      organizationId: "org-1",
      type: "CARD_SYNC" as const,
      status: "SUCCESS" as const,
      triggeredBy: "USER",
      userId: "user-1",
      corporateCardId: "card-1",
      fileName: null,
      startedAt: new Date("2024-01-01"),
      completedAt: new Date("2024-01-01"),
      totalRecords: 10,
      successCount: 10,
      failedCount: 0,
      matchedCount: 8,
      unmatchedCount: 2,
      errorMessage: null,
      errorDetails: null,
    },
  ],
  total: 1,
};

describe("getSyncHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedSession.mockResolvedValue(null as never);
  });

  it("returns { success: false } when not authenticated", async () => {
    mockGetCachedSession.mockResolvedValue(null as never);

    const result = await getSyncHistory({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns { success: false } when organizationId missing", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: null },
    } as never);

    const result = await getSyncHistory({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("calls getSyncHistories with correct params including organizationId", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockResolvedValue(mockSyncHistoryData);

    await getSyncHistory({ corporateCardId: "card-1", type: "CARD_SYNC" });

    expect(mockGetSyncHistories).toHaveBeenCalledWith({
      organizationId: "org-1",
      corporateCardId: "card-1",
      type: "CARD_SYNC",
      limit: 20,
      offset: 0,
    });
  });

  it("converts page/limit to offset correctly", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockResolvedValue(mockSyncHistoryData);

    await getSyncHistory({ page: 3, limit: 10 });

    expect(mockGetSyncHistories).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 20, // (3-1) * 10
      })
    );
  });

  it("uses default page=1 and limit=20 when not provided", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockResolvedValue(mockSyncHistoryData);

    await getSyncHistory({});

    expect(mockGetSyncHistories).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 0,
      })
    );
  });

  it("returns success with data and total", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockResolvedValue(mockSyncHistoryData);

    const result = await getSyncHistory({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSyncHistoryData);
  });

  it("returns error when service throws", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockRejectedValue(new Error("DB error"));

    const result = await getSyncHistory({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
