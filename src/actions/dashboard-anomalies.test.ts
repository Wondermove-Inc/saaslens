// src/actions/dashboard-anomalies.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
    },
  },
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { getSubscriptionAnomalies } from "./dashboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedRequireOrganization = requireOrganization as any;

describe("getSubscriptionAnomalies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireOrganization.mockResolvedValue({
      organizationId: "org-1",
      role: "ADMIN",
      teamId: null,
      userId: "user-1",
    });
  });

  it("인증되지 않은 경우 에러를 throw해야 한다", async () => {
    mockedRequireOrganization.mockRejectedValueOnce(
      new Error("NEXT_REDIRECT:/login")
    );

    await expect(getSubscriptionAnomalies()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("FLAT_RATE 구독 중 배정 사용자 0명인 항목을 반환해야 한다", async () => {
    vi.mocked(prisma.subscription.findMany)
      .mockResolvedValueOnce([
        {
          id: "sub-flat-1",
          billingType: "FLAT_RATE",
          app: { name: "Slack" },
        },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const result = await getSubscriptionAnomalies();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      subscriptionId: "sub-flat-1",
      appName: "Slack",
      billingType: "FLAT_RATE",
    });
  });

  it("PER_SEAT 구독 중 여유 시트가 있는 항목을 반환해야 한다", async () => {
    vi.mocked(prisma.subscription.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          id: "sub-seat-1",
          billingType: "PER_SEAT",
          totalLicenses: 10,
          usedLicenses: 6,
          perSeatPrice: 15000,
          app: { name: "Notion" },
        },
      ] as never);

    const result = await getSubscriptionAnomalies();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      subscriptionId: "sub-seat-1",
      appName: "Notion",
      billingType: "PER_SEAT",
      totalLicenses: 10,
      usedLicenses: 6,
      savableAmount: 60000, // (10 - 6) * 15000
    });
  });

  it("PER_SEAT에서 usedLicenses >= totalLicenses인 구독은 제외해야 한다", async () => {
    vi.mocked(prisma.subscription.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          id: "sub-seat-full",
          billingType: "PER_SEAT",
          totalLicenses: 5,
          usedLicenses: 5,
          perSeatPrice: 10000,
          app: { name: "Jira" },
        },
      ] as never);

    const result = await getSubscriptionAnomalies();

    expect(result).toHaveLength(0);
  });

  it("최대 5개까지만 반환해야 한다", async () => {
    const flatRateSubs = Array.from({ length: 4 }, (_, i) => ({
      id: `sub-flat-${i}`,
      billingType: "FLAT_RATE",
      app: { name: `App-${i}` },
    }));

    const perSeatSubs = Array.from({ length: 3 }, (_, i) => ({
      id: `sub-seat-${i}`,
      billingType: "PER_SEAT",
      totalLicenses: 10,
      usedLicenses: 3,
      perSeatPrice: 10000,
      app: { name: `SeatApp-${i}` },
    }));

    vi.mocked(prisma.subscription.findMany)
      .mockResolvedValueOnce(flatRateSubs as never)
      .mockResolvedValueOnce(perSeatSubs as never);

    const result = await getSubscriptionAnomalies();

    expect(result).toHaveLength(5);
  });

  it("빈 데이터일 때 빈 배열을 반환해야 한다", async () => {
    vi.mocked(prisma.subscription.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const result = await getSubscriptionAnomalies();

    expect(result).toHaveLength(0);
  });

  it("perSeatPrice가 null인 경우 savableAmount가 0이어야 한다", async () => {
    vi.mocked(prisma.subscription.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          id: "sub-seat-no-price",
          billingType: "PER_SEAT",
          totalLicenses: 10,
          usedLicenses: 5,
          perSeatPrice: null,
          app: { name: "Tool" },
        },
      ] as never);

    const result = await getSubscriptionAnomalies();

    expect(result).toHaveLength(1);
    expect(result[0].savableAmount).toBe(0);
  });
});
