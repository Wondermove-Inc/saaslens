// src/actions/subscriptions/subscription-calendar.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRenewalCalendar, getRenewalsByDate } from "./subscription-calendar";

import { prisma } from "@/lib/db";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn().mockResolvedValue({
    organizationId: "test-org-id",
  }),
}));

describe("subscription-calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRenewalCalendar", () => {
    it("should show recurring renewals for current/future months", async () => {
      // Arrange: 현재/미래 달 - 반복 갱신 로직 적용
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2099-02-15T00:00:00Z"),
          startDate: new Date("2099-02-15T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Pro Plan",
          status: "ACTIVE",
          app: {
            name: "Slack",
            customLogoUrl: "https://example.com/slack.png",
          },
        },
        {
          id: "sub-2",
          appId: "app-2",
          renewalDate: new Date("2099-03-20T00:00:00Z"),
          startDate: new Date("2099-03-20T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 20000 },
          currency: "KRW",
          notes: "Enterprise Plan",
          status: "ACTIVE",
          app: {
            name: "Notion",
            customLogoUrl: "https://example.com/notion.png",
          },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act: 미래 달 조회
      const result = await getRenewalCalendar(2099, 3);

      // Assert
      expect(result.year).toBe(2099);
      expect(result.month).toBe(3);

      // 2월 15일 구독 → 3월 15일에도 표시 (반복 갱신)
      expect(result.renewals["2099-03-15"]).toBeDefined();
      expect(result.renewals["2099-03-15"]).toHaveLength(1);
      expect(result.renewals["2099-03-15"][0].appName).toBe("Slack");

      // 3월 20일 구독 → 3월 20일에 표시
      expect(result.renewals["2099-03-20"]).toBeDefined();
      expect(result.renewals["2099-03-20"]).toHaveLength(1);
      expect(result.renewals["2099-03-20"][0].appName).toBe("Notion");
    });

    it("should show only actual DB records for past months", async () => {
      // Arrange: 과거 달 - DB 실제 데이터만 표시
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2020-01-15T00:00:00Z"),
          startDate: new Date("2020-01-15T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Pro Plan",
          status: "ACTIVE",
          app: {
            name: "Slack",
            customLogoUrl: "https://example.com/slack.png",
          },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act: 과거 달 조회
      const result = await getRenewalCalendar(2020, 1);

      // Assert
      expect(result.year).toBe(2020);
      expect(result.month).toBe(1);

      // DB에 실제로 있는 날짜만 표시
      expect(result.renewals["2020-01-15"]).toBeDefined();
      expect(result.renewals["2020-01-15"]).toHaveLength(1);
      expect(result.renewals["2020-01-15"][0].appName).toBe("Slack");
    });

    it("should group multiple subscriptions on the same calculated date", async () => {
      // Arrange: 미래 달, 두 구독 모두 매월 15일에 갱신
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2099-02-15T00:00:00Z"),
          startDate: new Date("2099-02-15T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Plan A",
          status: "ACTIVE",
          app: { name: "Slack", customLogoUrl: null },
        },
        {
          id: "sub-2",
          appId: "app-2",
          renewalDate: new Date("2099-01-15T00:00:00Z"),
          startDate: new Date("2099-01-15T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 20000 },
          currency: "KRW",
          notes: "Plan B",
          status: "ACTIVE",
          app: { name: "Notion", customLogoUrl: null },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act
      const result = await getRenewalCalendar(2099, 3);

      // Assert
      expect(result.renewals["2099-03-15"]).toHaveLength(2);
      expect(result.renewals["2099-03-15"][0].appName).toBe("Slack");
      expect(result.renewals["2099-03-15"][1].appName).toBe("Notion");
    });

    it("should handle yearly renewals correctly", async () => {
      // Arrange: 매년 3월 15일에 갱신되는 구독
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2098-03-15T00:00:00Z"),
          startDate: new Date("2098-03-15T00:00:00Z"),
          endDate: null,
          billingCycle: "YEARLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Yearly Plan",
          status: "ACTIVE",
          app: { name: "Slack", customLogoUrl: null },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act
      const result = await getRenewalCalendar(2099, 3); // 2099년 3월

      // Assert: 2099년 3월 15일에 표시되어야 함
      expect(result.renewals["2099-03-15"]).toBeDefined();
      expect(result.renewals["2099-03-15"]).toHaveLength(1);
      expect(result.renewals["2099-03-15"][0].appName).toBe("Slack");
    });

    it("should not show yearly renewals in wrong months", async () => {
      // Arrange: 매년 3월 15일에 갱신되는 구독
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2098-03-15T00:00:00Z"),
          startDate: new Date("2098-03-15T00:00:00Z"),
          endDate: null,
          billingCycle: "YEARLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Yearly Plan",
          status: "ACTIVE",
          app: { name: "Slack", customLogoUrl: null },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act
      const result = await getRenewalCalendar(2099, 4); // 2099년 4월 (갱신 월 아님)

      // Assert: 4월에는 표시되지 않아야 함
      expect(result.renewals).toEqual({});
    });

    it("should return empty renewals when no subscriptions exist", async () => {
      // Arrange
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      // Act
      const result = await getRenewalCalendar(2099, 3);

      // Assert
      expect(result.year).toBe(2099);
      expect(result.month).toBe(3);
      expect(result.renewals).toEqual({});
    });

    it("should not include subscriptions that start after the query month", async () => {
      // Arrange: 4월에 시작하는 구독은 3월에 표시되지 않아야 함
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2099-04-15T00:00:00Z"),
          startDate: new Date("2099-04-15T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Future subscription",
          status: "ACTIVE",
          app: { name: "Slack", customLogoUrl: null },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act
      const result = await getRenewalCalendar(2099, 3);

      // Assert
      expect(result.renewals).toEqual({});
    });

    it("should not include subscriptions that ended before the query month", async () => {
      // Arrange: 2월에 종료된 구독은 3월에 표시되지 않아야 함
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2099-01-15T00:00:00Z"),
          startDate: new Date("2099-01-15T00:00:00Z"),
          endDate: new Date("2099-02-28T23:59:59Z"),
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Ended subscription",
          status: "ACTIVE",
          app: { name: "Slack", customLogoUrl: null },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act
      const result = await getRenewalCalendar(2099, 3);

      // Assert
      expect(result.renewals).toEqual({});
    });

    it("should handle monthly renewals on day 31 in months with 30 days", async () => {
      // Arrange: 1월 31일 구독 → 2월에는 28일에 표시되어야 함
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2099-01-31T00:00:00Z"),
          startDate: new Date("2099-01-31T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Day 31 subscription",
          status: "ACTIVE",
          app: { name: "Slack", customLogoUrl: null },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act
      const result = await getRenewalCalendar(2099, 2); // 2월 (28일까지)

      // Assert
      expect(result.renewals["2099-02-28"]).toBeDefined();
      expect(result.renewals["2099-02-28"]).toHaveLength(1);
      expect(result.renewals["2099-02-28"][0].appName).toBe("Slack");
    });
  });

  describe("getRenewalsByDate", () => {
    it("should return renewals for a past date from DB", async () => {
      // Arrange: 과거 날짜 - DB에서 직접 조회
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2020-03-15T10:00:00Z"),
          startDate: new Date("2020-03-15T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Pro Plan",
          status: "ACTIVE",
          app: {
            name: "Slack",
            customLogoUrl: "https://example.com/slack.png",
          },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act
      const result = await getRenewalsByDate("2020-03-15");

      // Assert
      expect(result.date).toBe("2020-03-15");
      expect(result.renewals).toHaveLength(1);
      expect(result.renewals[0].appName).toBe("Slack");
      expect(result.renewals[0].amount).toBe(10000);
    });

    it("should return calculated renewals for a future date (monthly billing)", async () => {
      // Arrange: 미래 날짜 - 계산 로직 적용
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2099-02-15T00:00:00Z"),
          startDate: new Date("2099-02-15T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Pro Plan",
          status: "ACTIVE",
          app: {
            name: "Slack",
            customLogoUrl: "https://example.com/slack.png",
          },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act: 미래 날짜 조회 (2월 15일 구독 → 3월 15일에도 표시되어야 함)
      const result = await getRenewalsByDate("2099-03-15");

      // Assert
      expect(result.date).toBe("2099-03-15");
      expect(result.renewals).toHaveLength(1);
      expect(result.renewals[0].appName).toBe("Slack");
      expect(result.renewals[0].amount).toBe(10000);
      expect(result.renewals[0].renewalDate).toBe("2099-03-15T00:00:00.000Z");
    });

    it("should return calculated renewals for a future date (yearly billing)", async () => {
      // Arrange: 미래 날짜, 연간 갱신
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2098-03-15T00:00:00Z"),
          startDate: new Date("2098-03-15T00:00:00Z"),
          endDate: null,
          billingCycle: "YEARLY",
          amount: { toNumber: () => 100000 },
          currency: "KRW",
          notes: "Annual Plan",
          status: "ACTIVE",
          app: {
            name: "Notion",
            customLogoUrl: "https://example.com/notion.png",
          },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act: 2099년 3월 15일 조회 (연간 갱신일)
      const result = await getRenewalsByDate("2099-03-15");

      // Assert
      expect(result.date).toBe("2099-03-15");
      expect(result.renewals).toHaveLength(1);
      expect(result.renewals[0].appName).toBe("Notion");
      expect(result.renewals[0].amount).toBe(100000);
    });

    it("should return empty array when no renewals match the future date", async () => {
      // Arrange: 미래 날짜지만 해당 날짜에 갱신되는 구독 없음
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2099-02-20T00:00:00Z"),
          startDate: new Date("2099-02-20T00:00:00Z"),
          endDate: null,
          billingCycle: "MONTHLY",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Pro Plan",
          status: "ACTIVE",
          app: { name: "Slack", customLogoUrl: null },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act: 3월 15일 조회 (구독은 매월 20일에 갱신)
      const result = await getRenewalsByDate("2099-03-15");

      // Assert
      expect(result.date).toBe("2099-03-15");
      expect(result.renewals).toEqual([]);
    });

    it("should return empty array when no renewals exist for the date", async () => {
      // Arrange
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      // Act
      const result = await getRenewalsByDate("2025-03-15");

      // Assert
      expect(result.date).toBe("2025-03-15");
      expect(result.renewals).toEqual([]);
    });

    it("should handle null renewalDate gracefully", async () => {
      // Arrange
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: null,
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          notes: "Cancelled",
          status: "CANCELLED",
          app: { name: "Slack", customLogoUrl: null },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      // Act
      const result = await getRenewalsByDate("2025-03-15");

      // Assert
      expect(result.renewals).toHaveLength(1);
      expect(result.renewals[0].renewalDate).toBe("2025-03-15");
    });
  });
});
