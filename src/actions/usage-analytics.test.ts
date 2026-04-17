// src/actions/usage-analytics.test.ts
import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
    },
    userAppAccess: {
      findMany: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedRequireOrganization = requireOrganization as any;

/** Helper: set up admin auth mock */
function setupAdminAuth() {
  mockedRequireOrganization.mockResolvedValue({
    organizationId: "org-1",
    role: "ADMIN",
    teamId: null,
    userId: "user-1",
  });
}

describe("Usage Analytics Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("getUsageReport", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      const { getUsageReport } = await import("./usage-analytics");
      await expect(
        getUsageReport({
          period: "30d",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("사용 현황 데이터를 반환해야 한다", async () => {
      setupAdminAuth();

      // getSubscribedAppIds: subscription.findMany
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
        { appId: "app-1" },
        { appId: "app-2" },
      ] as never);

      // totalApps: app.count
      vi.mocked(prisma.app.count).mockResolvedValueOnce(11 as never);

      // Promise.all의 4개 병렬 호출:

      // 1) getActiveUsersTrendInternal: userAppAccess.findMany
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce([
        { userId: "user-1", lastUsedAt: new Date("2024-12-01") },
        { userId: "user-2", lastUsedAt: new Date("2024-12-15") },
      ] as never);

      // 2) getAppUsageRankingInternal:
      //   - userAppAccess.findMany (login records)
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce([
        { appId: "app-1", userId: "user-1" },
        { appId: "app-1", userId: "user-2" },
      ] as never);
      //   - subscription.findMany (assigned counts)
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
        { appId: "app-1", _count: { assignedUsers: 5 } },
        { appId: "app-2", _count: { assignedUsers: 3 } },
      ] as never);

      // app.findMany mocks: getUnusedAppsInternal fires first (single await),
      // getAppUsageRankingInternal fires last (after 2 prior awaits)
      // 3) getUnusedAppsInternal: app.findMany
      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        {
          id: "app-3",
          name: "Unused App",
          subscriptions: [
            { totalLicenses: 10, amount: 120000, billingCycle: "YEARLY" },
          ],
          userAccesses: [{ lastUsedAt: new Date("2024-10-01") }],
        },
      ] as never);
      // 2 continued) getAppUsageRankingInternal: app.findMany (names)
      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
        { id: "app-2", name: "Notion" },
      ] as never);

      // 4) active users: userAppAccess.findMany
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce([
        { userId: "user-1" },
        { userId: "user-2" },
      ] as never);

      const { getUsageReport } = await import("./usage-analytics");
      const result = await getUsageReport({
        period: "30d",
        startDate: "2024-12-01",
        endDate: "2024-12-31",
      });

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("appUsageRanking");
      expect(result).toHaveProperty("activeUsersTrend");
      expect(result).toHaveProperty("unusedApps");
      // Bug 1: totalApps should be from app.count, not subscribedAppIds.length
      expect(result.summary.totalApps).toBe(11);
    });

    it("구독 앱이 없어도 totalApps는 실제 ACTIVE 앱 수를 반환해야 한다", async () => {
      setupAdminAuth();

      // No subscriptions
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce(
        [] as never
      );

      // But there are ACTIVE apps
      vi.mocked(prisma.app.count).mockResolvedValueOnce(7 as never);

      const { getUsageReport } = await import("./usage-analytics");
      const result = await getUsageReport({
        period: "30d",
        startDate: "2024-12-01",
        endDate: "2024-12-31",
      });

      expect(result.summary.totalApps).toBe(7);
      expect(result.summary.totalActiveUsers).toBe(0);
      expect(result.summary.unusedAppsCount).toBe(0);
    });

    it("teamId 필터가 사용자 접근 집계에 반영되어야 한다", async () => {
      setupAdminAuth();

      // getSubscribedAppIds with team filter
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
        { appId: "app-1" },
      ] as never);

      vi.mocked(prisma.app.count).mockResolvedValueOnce(5 as never);

      // getActiveUsersTrendInternal
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce(
        [] as never
      );
      // getAppUsageRankingInternal: login records
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce(
        [] as never
      );
      // getAppUsageRankingInternal: assigned counts
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce(
        [] as never
      );
      // getUnusedAppsInternal: app.findMany (fires before ranking names)
      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([] as never);
      // getAppUsageRankingInternal: app names
      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);
      // active users
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce(
        [] as never
      );

      const { getUsageReport } = await import("./usage-analytics");
      await getUsageReport({
        period: "30d",
        startDate: "2024-12-01",
        endDate: "2024-12-31",
        teamId: "team-1",
      });

      // subscription.findMany should have been called with team filter
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedUsers: {
              some: {
                user: expect.objectContaining({ teamId: "team-1" }),
              },
            },
          }),
        })
      );
    });

    it("userId 필터가 사용자 접근 집계에 반영되어야 한다", async () => {
      setupAdminAuth();

      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
        { appId: "app-1" },
      ] as never);

      vi.mocked(prisma.app.count).mockResolvedValueOnce(5 as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce(
        [] as never
      );
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce(
        [] as never
      );
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce(
        [] as never
      );
      // getUnusedAppsInternal: app.findMany (fires before ranking names)
      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([] as never);
      // getAppUsageRankingInternal: app names
      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce(
        [] as never
      );

      const { getUsageReport } = await import("./usage-analytics");
      await getUsageReport({
        period: "30d",
        startDate: "2024-12-01",
        endDate: "2024-12-31",
        userId: "user-1",
      });

      expect(prisma.userAppAccess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: expect.objectContaining({
              id: "user-1",
              organizationId: "org-1",
            }),
          }),
        })
      );
    });
  });

  describe("getActiveUsersTrend", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      const { getActiveUsersTrend } = await import("./usage-analytics");
      await expect(
        getActiveUsersTrend("2024-01-01", "2024-12-31")
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("활성 사용자 추이 데이터를 반환해야 한다", async () => {
      setupAdminAuth();

      // getSubscribedAppIds
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
        { appId: "app-1" },
      ] as never);

      // getActiveUsersTrendInternal
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce([
        { userId: "user-1", lastUsedAt: new Date("2024-12-01") },
        { userId: "user-2", lastUsedAt: new Date("2024-12-01") },
        { userId: "user-3", lastUsedAt: new Date("2024-12-15") },
      ] as never);

      const { getActiveUsersTrend } = await import("./usage-analytics");
      const result = await getActiveUsersTrend("2024-12-01", "2024-12-31");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("count");
    });
  });

  describe("getAppUsageRanking", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      const { getAppUsageRanking } = await import("./usage-analytics");
      await expect(getAppUsageRanking()).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("앱별 사용률 순위를 반환해야 한다", async () => {
      setupAdminAuth();

      // getSubscribedAppIds
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
        { appId: "app-1" },
        { appId: "app-2" },
      ] as never);

      // getAppUsageRankingInternal: login records
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValueOnce([
        { appId: "app-1", userId: "user-1" },
        { appId: "app-1", userId: "user-2" },
        { appId: "app-2", userId: "user-3" },
      ] as never);

      // getAppUsageRankingInternal: assigned counts
      vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
        { appId: "app-1", _count: { assignedUsers: 5 } },
        { appId: "app-2", _count: { assignedUsers: 3 } },
      ] as never);

      // getAppUsageRankingInternal: app names
      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
        { id: "app-2", name: "Notion" },
      ] as never);

      const { getAppUsageRanking } = await import("./usage-analytics");
      const result = await getAppUsageRanking();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty("appId");
      expect(result[0]).toHaveProperty("appName");
      expect(result[0]).toHaveProperty("userCount");
      expect(result[0]).toHaveProperty("usageRate");
    });
  });

  describe("getUnusedApps", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      const { getUnusedApps } = await import("./usage-analytics");
      await expect(getUnusedApps()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("미사용 앱 목록에 monthlyWastedCost가 포함되어야 한다", async () => {
      setupAdminAuth();

      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        {
          id: "app-1",
          name: "Unused App",
          subscriptions: [
            { totalLicenses: 10, amount: 1200000, billingCycle: "YEARLY" },
          ],
          userAccesses: [],
        },
      ] as never);

      const { getUnusedApps } = await import("./usage-analytics");
      const result = await getUnusedApps();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("appId", "app-1");
      expect(result[0]).toHaveProperty("appName", "Unused App");
      expect(result[0]).toHaveProperty("lastUsedAt", null);
      expect(result[0]).toHaveProperty("licenseCount", 10);
      // Bug 4: monthlyWastedCost = 1200000 / 12 = 100000
      expect(result[0]).toHaveProperty("monthlyWastedCost", 100000);
    });

    it("MONTHLY 구독의 월간 비용을 그대로 반환해야 한다", async () => {
      setupAdminAuth();

      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        {
          id: "app-2",
          name: "Monthly App",
          subscriptions: [
            { totalLicenses: 5, amount: 50000, billingCycle: "MONTHLY" },
          ],
          userAccesses: [{ lastUsedAt: new Date("2024-06-01") }],
        },
      ] as never);

      const { getUnusedApps } = await import("./usage-analytics");
      const result = await getUnusedApps();

      expect(result[0].monthlyWastedCost).toBe(50000);
    });

    it("ONE_TIME 구독은 월간 비용 0으로 계산해야 한다", async () => {
      setupAdminAuth();

      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        {
          id: "app-3",
          name: "One-time App",
          subscriptions: [
            { totalLicenses: 1, amount: 500000, billingCycle: "ONE_TIME" },
          ],
          userAccesses: [],
        },
      ] as never);

      const { getUnusedApps } = await import("./usage-analytics");
      const result = await getUnusedApps();

      expect(result[0].monthlyWastedCost).toBe(0);
    });

    it("QUARTERLY 구독의 월간 비용은 amount/3 이어야 한다", async () => {
      setupAdminAuth();

      vi.mocked(prisma.app.findMany).mockResolvedValueOnce([
        {
          id: "app-4",
          name: "Quarterly App",
          subscriptions: [
            { totalLicenses: 3, amount: 300000, billingCycle: "QUARTERLY" },
          ],
          userAccesses: [],
        },
      ] as never);

      const { getUnusedApps } = await import("./usage-analytics");
      const result = await getUnusedApps();

      expect(result[0].monthlyWastedCost).toBe(100000);
    });
  });
});
