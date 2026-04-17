// src/actions/dashboard.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    app: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    subscriptionUser: {
      count: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import {
  getAppsByCategory,
  getDashboardStats,
  getRecentActivity,
  getRenewalReportData,
  getTerminatedUsersCount,
  getTerminatedUsersSubAssignmentCount,
  getTerminatedUsersWithSubCount,
  getUpcomingRenewals,
} from "./dashboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedRequireOrganization = requireOrganization as any;

describe("Dashboard Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardStats", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      await expect(getDashboardStats()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("조직이 없는 경우 /onboarding으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/onboarding")
      );

      await expect(getDashboardStats()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("앱, 구독, 사용자, 비용 통계를 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.app.count).mockResolvedValue(10);
      vi.mocked(prisma.subscription.count).mockResolvedValue(5);
      vi.mocked(prisma.user.count).mockResolvedValue(20);
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        { amount: 100000, billingCycle: "MONTHLY" },
        { amount: 1200000, billingCycle: "YEARLY" },
        { amount: 300000, billingCycle: "QUARTERLY" },
      ] as never);

      const result = await getDashboardStats();

      expect(result.totalApps).toBe(10);
      expect(result.activeSubscriptions).toBe(5);
      expect(result.totalUsers).toBe(20);
      // 월간 비용: 100000 + (1200000/12) + (300000/3) = 100000 + 100000 + 100000 = 300000
      expect(result.totalMonthlyCost).toBe(300000);
      expect(result.currency).toBe("KRW");
    });

    it("빈 데이터일 때 0을 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.app.count).mockResolvedValue(0);
      vi.mocked(prisma.subscription.count).mockResolvedValue(0);
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getDashboardStats();

      expect(result.totalApps).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.totalUsers).toBe(0);
      expect(result.totalMonthlyCost).toBe(0);
    });
  });

  describe("getTerminatedUsersCount", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      await expect(getTerminatedUsersCount()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("퇴사자 미회수 계정 수를 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.user.count).mockResolvedValue(3);

      const result = await getTerminatedUsersCount();

      expect(result).toBe(3);
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          status: "TERMINATED",
          appAccesses: { some: {} },
        },
      });
    });
  });

  describe("getTerminatedUsersWithSubCount", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      await expect(getTerminatedUsersWithSubCount()).rejects.toThrow(
        "NEXT_REDIRECT"
      );
    });

    it("퇴사자 중 구독 배정이 남아있는 사용자 수를 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.user.count).mockResolvedValue(2);

      const result = await getTerminatedUsersWithSubCount();

      expect(result).toBe(2);
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          status: "TERMINATED",
          subscriptionAssignments: { some: {} },
        },
      });
    });

    it("해당 사용자가 없으면 0을 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const result = await getTerminatedUsersWithSubCount();

      expect(result).toBe(0);
    });
  });

  describe("getTerminatedUsersSubAssignmentCount", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      await expect(getTerminatedUsersSubAssignmentCount()).rejects.toThrow(
        "NEXT_REDIRECT"
      );
    });

    it("퇴사자의 미회수 구독 배정 건수를 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.subscriptionUser.count).mockResolvedValue(5);

      const result = await getTerminatedUsersSubAssignmentCount();

      expect(result).toBe(5);
      expect(prisma.subscriptionUser.count).toHaveBeenCalledWith({
        where: {
          user: {
            organizationId: "org-1",
            status: "TERMINATED",
          },
        },
      });
    });

    it("해당 건이 없으면 0을 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.subscriptionUser.count).mockResolvedValue(0);

      const result = await getTerminatedUsersSubAssignmentCount();

      expect(result).toBe(0);
    });
  });

  describe("getUpcomingRenewals", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      await expect(getUpcomingRenewals()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("30일 이내 갱신 예정 구독을 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 7);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          renewalDate,
          amount: 100000,
          currency: "KRW",
          app: {
            name: "Slack",
            catalog: { logoUrl: "https://example.com/slack.png" },
            customLogoUrl: null,
          },
        },
      ] as never);

      const result = await getUpcomingRenewals();

      expect(result).toHaveLength(1);
      expect(result[0].appName).toBe("Slack");
      expect(result[0].daysUntilRenewal).toBeLessThanOrEqual(7);
    });

    it("빈 데이터일 때 빈 배열을 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getUpcomingRenewals();

      expect(result).toHaveLength(0);
    });
  });

  describe("getRenewalReportData", () => {
    it("팀 필터가 적용되어야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      await getRenewalReportData({ teamId: "team-1" });

      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { teamId: "team-1" },
              { assignedUsers: { some: { user: { teamId: "team-1" } } } },
            ]),
          }),
        })
      );
    });

    it("사용자 필터가 적용되어야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      await getRenewalReportData({ userId: "user-1" });

      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedUsers: { some: { userId: "user-1" } },
          }),
        })
      );
    });
  });

  describe("getAppsByCategory", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      await expect(getAppsByCategory()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("카테고리별 앱 분포를 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.app.groupBy).mockResolvedValue([
        { category: "Collaboration", _count: { _all: 5 } },
        { category: "Development", _count: { _all: 3 } },
        { category: null, _count: { _all: 2 } },
      ] as never);

      const result = await getAppsByCategory();

      expect(result).toHaveLength(3);
      expect(result[0].category).toBe("Collaboration");
      expect(result[0].count).toBe(5);
      expect(result[0].percentage).toBe(50); // 5/10 * 100
      expect(result[2].category).toBe("__UNCATEGORIZED__"); // null -> sentinel for i18n
    });

    it("빈 데이터일 때 빈 배열을 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.app.groupBy).mockResolvedValue([]);

      const result = await getAppsByCategory();

      expect(result).toHaveLength(0);
    });
  });

  describe("getRecentActivity", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedRequireOrganization.mockRejectedValueOnce(
        new Error("NEXT_REDIRECT:/login")
      );

      await expect(getRecentActivity()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("최근 활동 목록을 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      const now = new Date();
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        {
          id: "log-1",
          action: "CREATE_APP",
          entityType: "App",
          entityId: "app-1",
          createdAt: now,
          user: { name: "홍길동", email: "hong@test.com" },
        },
        {
          id: "log-2",
          action: "USER_TERMINATED",
          entityType: "User",
          entityId: "user-2",
          createdAt: now,
          user: null,
        },
      ] as never);

      const result = await getRecentActivity();

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe("CREATE_APP");
      expect(result[0].userName).toBe("홍길동");
      expect(result[0].description).toBe("앱을 추가했습니다");
      expect(result[1].userName).toBeUndefined();
    });

    it("빈 데이터일 때 빈 배열을 반환해야 한다", async () => {
      mockedRequireOrganization.mockResolvedValue({
        organizationId: "org-1",
        role: "ADMIN",
        teamId: null,
        userId: "user-1",
      });

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      const result = await getRecentActivity();

      expect(result).toHaveLength(0);
    });
  });
});
