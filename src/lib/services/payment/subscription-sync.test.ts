import { Decimal } from "@prisma/client/runtime/library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  syncAppSubscriptionFromPayments,
  syncSubscriptionsFromPayments,
} from "./subscription-sync";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock recurrence module
vi.mock("./recurrence", async () => {
  const actual = await vi.importActual("./recurrence");
  return {
    ...actual,
    analyzePaymentIntervals: vi.fn(),
  };
});

import { prisma } from "@/lib/db";
import { analyzePaymentIntervals, type RecurrencePattern } from "./recurrence";

// Helper to create mock subscription
const createMockSubscription = (overrides: Record<string, unknown> = {}) => ({
  id: "sub-1",
  organizationId: "org-1",
  appId: "app-1",
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  amount: new Decimal(10000),
  currency: "KRW",
  startDate: new Date("2025-03-15"),
  endDate: null,
  renewalDate: new Date("2025-04-15"),
  autoRenewal: true,
  totalLicenses: null,
  usedLicenses: null,
  renewalAlert30: true,
  renewalAlert60: false,
  renewalAlert90: false,
  contractUrl: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("syncSubscriptionsFromPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result when no matched transactions", async () => {
    const result = await syncSubscriptionsFromPayments("org-1", [
      {
        useDt: "20250115",
        useStore: "Random Store",
        useAmt: "10000",
        matchedAppId: null,
      },
    ]);

    expect(result).toEqual({
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    });
  });

  it("skips non-recurring patterns", async () => {
    const mockPattern: RecurrencePattern = {
      isRecurring: false,
      billingCycle: null,
      avgIntervalDays: 45,
      intervalStdDev: 20,
      nextPaymentDate: null,
      lastPaymentDate: null,
      transactionCount: 2,
      avgAmount: 10000,
    };

    vi.mocked(analyzePaymentIntervals).mockReturnValue(
      new Map([["notion", mockPattern]])
    );

    const result = await syncSubscriptionsFromPayments("org-1", [
      {
        useDt: "20250115",
        useStore: "Notion",
        useAmt: "10000",
        matchedAppId: "app-1",
      },
      {
        useDt: "20250301",
        useStore: "Notion",
        useAmt: "10000",
        matchedAppId: "app-1",
      },
    ]);

    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
  });

  it("creates new subscription for recurring pattern", async () => {
    const mockPattern: RecurrencePattern = {
      isRecurring: true,
      billingCycle: "MONTHLY",
      avgIntervalDays: 30,
      intervalStdDev: 2,
      nextPaymentDate: new Date("2025-04-15"),
      lastPaymentDate: new Date("2025-03-15"),
      transactionCount: 3,
      avgAmount: 10000,
    };

    vi.mocked(analyzePaymentIntervals).mockReturnValue(
      new Map([["notion", mockPattern]])
    );

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.subscription.create).mockResolvedValue(
      createMockSubscription() as never
    );

    const result = await syncSubscriptionsFromPayments("org-1", [
      {
        useDt: "20250115",
        useStore: "Notion",
        useAmt: "10000",
        matchedAppId: "app-1",
      },
      {
        useDt: "20250215",
        useStore: "Notion",
        useAmt: "10000",
        matchedAppId: "app-1",
      },
      {
        useDt: "20250315",
        useStore: "Notion",
        useAmt: "10000",
        matchedAppId: "app-1",
      },
    ]);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        appId: "app-1",
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        amount: 10000,
        currency: "KRW",
        autoRenewal: true,
      }),
    });
  });

  it("updates existing subscription for recurring pattern", async () => {
    const mockPattern: RecurrencePattern = {
      isRecurring: true,
      billingCycle: "MONTHLY",
      avgIntervalDays: 30,
      intervalStdDev: 2,
      nextPaymentDate: new Date("2025-04-15"),
      lastPaymentDate: new Date("2025-03-15"),
      transactionCount: 3,
      avgAmount: 12000, // 금액 변경
    };

    vi.mocked(analyzePaymentIntervals).mockReturnValue(
      new Map([["notion", mockPattern]])
    );

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(
      createMockSubscription({ id: "sub-existing" }) as never
    );

    vi.mocked(prisma.subscription.update).mockResolvedValue(
      createMockSubscription({
        id: "sub-existing",
        amount: new Decimal(12000),
      }) as never
    );

    const result = await syncSubscriptionsFromPayments("org-1", [
      {
        useDt: "20250115",
        useStore: "Notion",
        useAmt: "10000",
        matchedAppId: "app-1",
      },
      {
        useDt: "20250215",
        useStore: "Notion",
        useAmt: "12000",
        matchedAppId: "app-1",
      },
      {
        useDt: "20250315",
        useStore: "Notion",
        useAmt: "14000",
        matchedAppId: "app-1",
      },
    ]);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-existing" },
      data: expect.objectContaining({
        amount: 12000,
        billingCycle: "MONTHLY",
        renewalDate: new Date("2025-04-15"),
      }),
    });
  });

  it("handles errors gracefully and continues processing", async () => {
    const mockPattern: RecurrencePattern = {
      isRecurring: true,
      billingCycle: "MONTHLY",
      avgIntervalDays: 30,
      intervalStdDev: 2,
      nextPaymentDate: new Date("2025-04-15"),
      lastPaymentDate: new Date("2025-03-15"),
      transactionCount: 2,
      avgAmount: 10000,
    };

    vi.mocked(analyzePaymentIntervals).mockReturnValue(
      new Map([["notion", mockPattern]])
    );

    vi.mocked(prisma.subscription.findFirst).mockRejectedValue(
      new Error("DB connection error")
    );

    const result = await syncSubscriptionsFromPayments("org-1", [
      {
        useDt: "20250115",
        useStore: "Notion",
        useAmt: "10000",
        matchedAppId: "app-1",
      },
      {
        useDt: "20250215",
        useStore: "Notion",
        useAmt: "10000",
        matchedAppId: "app-1",
      },
    ]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("DB connection error");
  });

  it("maps ANNUAL billing cycle to YEARLY", async () => {
    const mockPattern: RecurrencePattern = {
      isRecurring: true,
      billingCycle: "ANNUAL",
      avgIntervalDays: 365,
      intervalStdDev: 3,
      nextPaymentDate: new Date("2026-01-15"),
      lastPaymentDate: new Date("2025-01-15"),
      transactionCount: 2,
      avgAmount: 100000,
    };

    vi.mocked(analyzePaymentIntervals).mockReturnValue(
      new Map([["annual service", mockPattern]])
    );

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.subscription.create).mockResolvedValue(
      createMockSubscription({
        billingCycle: "YEARLY",
        amount: new Decimal(100000),
      }) as never
    );

    const result = await syncSubscriptionsFromPayments("org-1", [
      {
        useDt: "20240115",
        useStore: "Annual Service",
        useAmt: "100000",
        matchedAppId: "app-1",
      },
      {
        useDt: "20250115",
        useStore: "Annual Service",
        useAmt: "100000",
        matchedAppId: "app-1",
      },
    ]);

    expect(result.created).toBe(1);
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingCycle: "YEARLY", // ANNUAL -> YEARLY 매핑
      }),
    });
  });
});

describe("syncAppSubscriptionFromPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns no_pattern when fewer than 2 transactions", async () => {
    const result = await syncAppSubscriptionFromPayments("org-1", "app-1", [
      { useDt: "20250115", useAmt: "10000" },
    ]);

    expect(result).toBe("no_pattern");
  });

  it("returns no_pattern when no recurring pattern detected", async () => {
    vi.mocked(analyzePaymentIntervals).mockReturnValue(
      new Map([
        [
          "dummy",
          {
            isRecurring: false,
            billingCycle: null,
            avgIntervalDays: 45,
            intervalStdDev: 20,
            nextPaymentDate: null,
            lastPaymentDate: null,
            transactionCount: 2,
            avgAmount: 10000,
          },
        ],
      ])
    );

    const result = await syncAppSubscriptionFromPayments("org-1", "app-1", [
      { useDt: "20250101", useAmt: "10000" },
      { useDt: "20250301", useAmt: "10000" }, // 59일 간격 - 불규칙
    ]);

    expect(result).toBe("no_pattern");
  });

  it("creates subscription when recurring pattern detected", async () => {
    vi.mocked(analyzePaymentIntervals).mockReturnValue(
      new Map([
        [
          "dummy",
          {
            isRecurring: true,
            billingCycle: "MONTHLY",
            avgIntervalDays: 30,
            intervalStdDev: 2,
            nextPaymentDate: new Date("2025-04-15"),
            lastPaymentDate: new Date("2025-03-15"),
            transactionCount: 3,
            avgAmount: 10000,
          },
        ],
      ])
    );

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.subscription.create).mockResolvedValue(
      createMockSubscription() as never
    );

    const result = await syncAppSubscriptionFromPayments("org-1", "app-1", [
      { useDt: "20250115", useAmt: "10000" },
      { useDt: "20250215", useAmt: "10000" },
      { useDt: "20250315", useAmt: "10000" },
    ]);

    expect(result).toBe("created");
  });

  it("updates existing subscription when found", async () => {
    vi.mocked(analyzePaymentIntervals).mockReturnValue(
      new Map([
        [
          "dummy",
          {
            isRecurring: true,
            billingCycle: "MONTHLY",
            avgIntervalDays: 30,
            intervalStdDev: 2,
            nextPaymentDate: new Date("2025-04-15"),
            lastPaymentDate: new Date("2025-03-15"),
            transactionCount: 3,
            avgAmount: 10000,
          },
        ],
      ])
    );

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(
      createMockSubscription({
        id: "sub-existing",
        amount: new Decimal(9000),
      }) as never
    );

    vi.mocked(prisma.subscription.update).mockResolvedValue(
      createMockSubscription({
        id: "sub-existing",
        amount: new Decimal(10000),
      }) as never
    );

    const result = await syncAppSubscriptionFromPayments("org-1", "app-1", [
      { useDt: "20250115", useAmt: "10000" },
      { useDt: "20250215", useAmt: "10000" },
      { useDt: "20250315", useAmt: "10000" },
    ]);

    expect(result).toBe("updated");
  });
});
