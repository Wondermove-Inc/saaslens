// src/actions/payments/payment-queries.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    paymentRecord: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    cardTransaction: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPaymentStatusCounts, hasPaymentData } from "./payment-queries";

const mockAuth = vi.mocked(auth);
const mockPaymentRecordGroupBy = vi.mocked(prisma.paymentRecord.groupBy);
const mockCardTransactionGroupBy = vi.mocked(prisma.cardTransaction.groupBy);
const mockPaymentRecordCount = vi.mocked(prisma.paymentRecord.count);
const mockCardTransactionCount = vi.mocked(prisma.cardTransaction.count);

describe("getPaymentStatusCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await getPaymentStatusCounts();

    expect(result.success).toBe(false);
    expect(result.message).toBe("인증이 필요합니다");
  });

  it("should return error when no organization", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: null },
    } as never);

    const result = await getPaymentStatusCounts();

    expect(result.success).toBe(false);
    expect(result.message).toBe("조직 정보가 필요합니다");
  });

  it("should return zero counts when no records exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockPaymentRecordGroupBy.mockResolvedValue([] as never);
    mockCardTransactionGroupBy.mockResolvedValue([] as never);

    const result = await getPaymentStatusCounts();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      all: 0,
      PENDING: 0,
      AUTO_MATCHED: 0,
      MANUAL: 0,
      UNMATCHED: 0,
    });
  });

  it("should aggregate counts from both PaymentRecord and CardTransaction", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    mockPaymentRecordGroupBy.mockResolvedValue([
      { matchStatus: "PENDING", _count: { id: 3 } },
      { matchStatus: "AUTO_MATCHED", _count: { id: 5 } },
    ] as never);

    mockCardTransactionGroupBy.mockResolvedValue([
      { matchStatus: "PENDING", _count: { id: 1 } },
      { matchStatus: "AUTO_MATCHED", _count: { id: 4 } },
      { matchStatus: "UNMATCHED", _count: { id: 2 } },
    ] as never);

    const result = await getPaymentStatusCounts();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      all: 15,
      PENDING: 4,
      AUTO_MATCHED: 9,
      MANUAL: 0,
      UNMATCHED: 2,
    });
  });

  it("should filter by organizationId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-123" },
    } as never);
    mockPaymentRecordGroupBy.mockResolvedValue([] as never);
    mockCardTransactionGroupBy.mockResolvedValue([] as never);

    await getPaymentStatusCounts();

    expect(mockPaymentRecordGroupBy).toHaveBeenCalledWith({
      by: ["matchStatus"],
      where: { organizationId: "org-123" },
      _count: { id: true },
    });

    expect(mockCardTransactionGroupBy).toHaveBeenCalledWith({
      by: ["matchStatus"],
      where: { organizationId: "org-123" },
      _count: { id: true },
    });
  });
});

describe("hasPaymentData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await hasPaymentData();

    expect(result.success).toBe(false);
  });

  it("should return hasData: false when both counts are 0", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockPaymentRecordCount.mockResolvedValue(0 as never);
    mockCardTransactionCount.mockResolvedValue(0 as never);

    const result = await hasPaymentData();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ hasData: false });
  });

  it("should return hasData: true when PaymentRecord exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockPaymentRecordCount.mockResolvedValue(5 as never);
    mockCardTransactionCount.mockResolvedValue(0 as never);

    const result = await hasPaymentData();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ hasData: true });
  });

  it("should return hasData: true when CardTransaction exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockPaymentRecordCount.mockResolvedValue(0 as never);
    mockCardTransactionCount.mockResolvedValue(3 as never);

    const result = await hasPaymentData();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ hasData: true });
  });

  it("should default to hasData: true on error (prevent false alarm)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);
    mockPaymentRecordCount.mockRejectedValue(new Error("DB error"));

    const result = await hasPaymentData();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ hasData: true });
  });
});
