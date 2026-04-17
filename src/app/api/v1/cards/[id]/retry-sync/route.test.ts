// src/app/api/v1/cards/[id]/retry-sync/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    corporateCard: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/actions/cards/card-sync", () => ({
  syncCardTransactions: vi.fn(),
}));

vi.mock("@/lib/logging", () => ({
  withLogging: vi.fn((name, fn) => fn),
}));

import { syncCardTransactions } from "@/actions/cards/card-sync";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import * as handler from "./route";

const mockAuth = vi.mocked(auth);
const mockFindFirst = vi.mocked(prisma.corporateCard.findFirst);
const mockSyncCardTransactions = vi.mocked(syncCardTransactions);

const mockCard = {
  id: "card-1",
  organizationId: "org-1",
  isActive: true,
  consecutiveFailCount: 3,
};

describe("POST /api/v1/cards/[id]/retry-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);

    const req = new NextRequest(
      "http://localhost/api/v1/cards/card-1/retry-sync",
      { method: "POST" }
    );
    const res = await handler.POST(req, {
      params: Promise.resolve({ id: "card-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when card not found or not in org", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockFindFirst.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/v1/cards/card-999/retry-sync",
      { method: "POST" }
    );
    const res = await handler.POST(req, {
      params: Promise.resolve({ id: "card-999" }),
    });

    expect(res.status).toBe(404);
  });

  it("calls syncCardTransactions with RETRY triggeredBy", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockFindFirst.mockResolvedValue(mockCard as never);
    mockSyncCardTransactions.mockResolvedValue({
      success: true,
      data: { created: 5, updated: 0 },
    });

    const req = new NextRequest(
      "http://localhost/api/v1/cards/card-1/retry-sync",
      { method: "POST" }
    );
    const res = await handler.POST(req, {
      params: Promise.resolve({ id: "card-1" }),
    });

    expect(res.status).toBe(200);
    expect(mockSyncCardTransactions).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({ triggeredBy: "RETRY" })
    );
  });

  it("verifies card belongs to user's organization", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockFindFirst.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/v1/cards/card-1/retry-sync",
      { method: "POST" }
    );
    await handler.POST(req, { params: Promise.resolve({ id: "card-1" }) });

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
      })
    );
  });

  it("returns 200 with sync result on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockFindFirst.mockResolvedValue(mockCard as never);
    mockSyncCardTransactions.mockResolvedValue({
      success: true,
      data: { created: 3, updated: 1, syncHistoryId: "sync-1" },
    });

    const req = new NextRequest(
      "http://localhost/api/v1/cards/card-1/retry-sync",
      { method: "POST" }
    );
    const res = await handler.POST(req, {
      params: Promise.resolve({ id: "card-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true });
  });

  it("returns 500 on sync failure", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockFindFirst.mockResolvedValue(mockCard as never);
    mockSyncCardTransactions.mockRejectedValue(new Error("sync failed"));

    const req = new NextRequest(
      "http://localhost/api/v1/cards/card-1/retry-sync",
      { method: "POST" }
    );
    const res = await handler.POST(req, {
      params: Promise.resolve({ id: "card-1" }),
    });

    expect(res.status).toBe(500);
  });
});
