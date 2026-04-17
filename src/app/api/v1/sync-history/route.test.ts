// src/app/api/v1/sync-history/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/payment/sync-history-service", () => ({
  getSyncHistories: vi.fn(),
}));

vi.mock("@/lib/logging", () => ({
  withLogging: vi.fn((name, fn) => fn),
}));

import { auth } from "@/lib/auth";
import { getSyncHistories } from "@/lib/services/payment/sync-history-service";
import { NextRequest } from "next/server";
import * as handler from "./route";

const mockAuth = vi.mocked(auth);
const mockGetSyncHistories = vi.mocked(getSyncHistories);

const mockSyncData = {
  data: [
    {
      id: "sh-1",
      organizationId: "org-1",
      type: "CARD_SYNC" as const,
      status: "SUCCESS" as const,
      triggeredBy: "USER",
      userId: "user-1",
      corporateCardId: null,
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

describe("GET /api/v1/sync-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);

    const req = new NextRequest("http://localhost/api/v1/sync-history");
    const res = await handler.GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 200 with paginated response", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockResolvedValue(mockSyncData);

    const req = new NextRequest("http://localhost/api/v1/sync-history");
    const res = await handler.GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      data: expect.any(Array),
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it("passes query params to service", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockResolvedValue(mockSyncData);

    const req = new NextRequest(
      "http://localhost/api/v1/sync-history?corporateCardId=card-1&type=CARD_SYNC&page=2&limit=10"
    );
    const res = await handler.GET(req);

    expect(mockGetSyncHistories).toHaveBeenCalledWith({
      organizationId: "org-1",
      corporateCardId: "card-1",
      type: "CARD_SYNC",
      limit: 10,
      offset: 10,
    });
    expect(res.status).toBe(200);
  });

  it("uses defaults when no query params provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockResolvedValue(mockSyncData);

    const req = new NextRequest("http://localhost/api/v1/sync-history");
    await handler.GET(req);

    expect(mockGetSyncHistories).toHaveBeenCalledWith({
      organizationId: "org-1",
      corporateCardId: undefined,
      type: undefined,
      limit: 20,
      offset: 0,
    });
  });

  it("returns 500 on service error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockGetSyncHistories.mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/v1/sync-history");
    const res = await handler.GET(req);

    expect(res.status).toBe(500);
  });
});
