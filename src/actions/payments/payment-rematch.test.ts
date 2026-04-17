// src/actions/payments/payment-rematch.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/require-auth", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/services/payment/rematch-service", () => ({
  rematchRecords: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getCachedSession } from "@/lib/auth/require-auth";
import { rematchRecords } from "@/lib/services/payment/rematch-service";
import { revalidatePath } from "next/cache";
import {
  rematchCardTransactions,
  rematchPaymentRecords,
} from "./payment-rematch";

const mockAuth = vi.mocked(auth);
const mockGetCachedSession = vi.mocked(getCachedSession);
const mockRematchRecords = vi.mocked(rematchRecords);
const mockRevalidatePath = vi.mocked(revalidatePath);

const mockRematchResult = {
  syncHistoryId: "sync-1",
  totalProcessed: 5,
  matchedCount: 4,
  unmatchedCount: 1,
  skippedCount: 0,
  errors: [],
};

describe("rematchPaymentRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
    mockGetCachedSession.mockResolvedValue(null as never);
  });

  it("returns { success: false } when not authenticated", async () => {
    mockGetCachedSession.mockResolvedValue(null as never);

    const result = await rematchPaymentRecords(["rec-1", "rec-2"]);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns { success: false } when organizationId missing", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: null },
    } as never);

    const result = await rematchPaymentRecords(["rec-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("calls rematchRecords with correct params for payment records", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockResolvedValue(mockRematchResult);

    await rematchPaymentRecords(["rec-1", "rec-2"]);

    expect(mockRematchRecords).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      recordType: "payment",
      recordIds: ["rec-1", "rec-2"],
    });
  });

  it("returns success with RematchResult", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockResolvedValue(mockRematchResult);

    const result = await rematchPaymentRecords(["rec-1"]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockRematchResult);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/payments");
  });

  it("returns error on concurrency conflict", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockRejectedValue(
      new Error("재매칭이 이미 진행 중입니다")
    );

    const result = await rematchPaymentRecords(["rec-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("재매칭이 이미 진행 중입니다");
  });

  it("returns error on unexpected errors", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockRejectedValue(new Error("unexpected error"));

    const result = await rematchPaymentRecords(["rec-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("rematchCardTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
    mockGetCachedSession.mockResolvedValue(null as never);
  });

  it("returns { success: false } when not authenticated", async () => {
    mockGetCachedSession.mockResolvedValue(null as never);

    const result = await rematchCardTransactions(["tx-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns { success: false } when organizationId missing", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: null },
    } as never);

    const result = await rematchCardTransactions(["tx-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("calls rematchRecords with correct params for card transactions", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockResolvedValue(mockRematchResult);

    await rematchCardTransactions(["tx-1", "tx-2"]);

    expect(mockRematchRecords).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      recordType: "card-transaction",
      recordIds: ["tx-1", "tx-2"],
    });
  });

  it("returns success with RematchResult", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockResolvedValue(mockRematchResult);

    const result = await rematchCardTransactions(["tx-1"]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockRematchResult);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/payments");
  });

  it("returns error on concurrency conflict", async () => {
    mockGetCachedSession.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockRematchRecords.mockRejectedValue(
      new Error("재매칭이 이미 진행 중입니다")
    );

    const result = await rematchCardTransactions(["tx-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("재매칭이 이미 진행 중입니다");
  });
});
