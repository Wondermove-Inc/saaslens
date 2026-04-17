// src/app/api/v1/payments/rematch/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/payment/rematch-service", () => ({
  rematchRecords: vi.fn(),
}));

vi.mock("@/lib/logging", () => ({
  withLogging: vi.fn((name, fn) => fn),
}));

import { auth } from "@/lib/auth";
import { rematchRecords } from "@/lib/services/payment/rematch-service";
import { NextRequest } from "next/server";
import * as handler from "./route";

const mockAuth = vi.mocked(auth);
const mockRematchRecords = vi.mocked(rematchRecords);

const mockRematchResult = {
  syncHistoryId: "sync-1",
  totalProcessed: 5,
  matchedCount: 4,
  unmatchedCount: 1,
  skippedCount: 0,
  errors: [],
};

describe("POST /api/v1/payments/rematch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);

    const req = new NextRequest("http://localhost/api/v1/payments/rematch", {
      method: "POST",
      body: JSON.stringify({
        recordType: "payment",
        recordIds: ["rec-1"],
      }),
    });
    const res = await handler.POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/payments/rematch", {
      method: "POST",
      body: JSON.stringify({ recordIds: ["rec-1"] }), // missing recordType
    });
    const res = await handler.POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when recordType is invalid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/payments/rematch", {
      method: "POST",
      body: JSON.stringify({
        recordType: "invalid-type",
        recordIds: ["rec-1"],
      }),
    });
    const res = await handler.POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when recordIds is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/payments/rematch", {
      method: "POST",
      body: JSON.stringify({ recordType: "payment", recordIds: [] }),
    });
    const res = await handler.POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 200 with result on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockResolvedValue(mockRematchResult);

    const req = new NextRequest("http://localhost/api/v1/payments/rematch", {
      method: "POST",
      body: JSON.stringify({
        recordType: "payment",
        recordIds: ["rec-1", "rec-2"],
      }),
    });
    const res = await handler.POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(mockRematchResult);
    expect(mockRematchRecords).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      recordType: "payment",
      recordIds: ["rec-1", "rec-2"],
    });
  });

  it("returns 200 for card-transaction type", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockResolvedValue(mockRematchResult);

    const req = new NextRequest("http://localhost/api/v1/payments/rematch", {
      method: "POST",
      body: JSON.stringify({
        recordType: "card-transaction",
        recordIds: ["tx-1"],
      }),
    });
    const res = await handler.POST(req);

    expect(res.status).toBe(200);
  });

  it("returns 409 on concurrency conflict", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockRejectedValue(
      new Error("재매칭이 이미 진행 중입니다")
    );

    const req = new NextRequest("http://localhost/api/v1/payments/rematch", {
      method: "POST",
      body: JSON.stringify({
        recordType: "payment",
        recordIds: ["rec-1"],
      }),
    });
    const res = await handler.POST(req);

    expect(res.status).toBe(409);
  });

  it("returns 500 on unexpected errors", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockRejectedValue(new Error("unexpected"));

    const req = new NextRequest("http://localhost/api/v1/payments/rematch", {
      method: "POST",
      body: JSON.stringify({
        recordType: "payment",
        recordIds: ["rec-1"],
      }),
    });
    const res = await handler.POST(req);

    expect(res.status).toBe(500);
  });
});
