// src/actions/user-cost-analysis.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subscriptionUser: { findMany: vi.fn() },
    userAppAccess: { findMany: vi.fn() },
    team: { findMany: vi.fn() },
  },
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

import {
  getTeamCostComparison,
  getUserCostBreakdown,
} from "./user-cost-analysis";

const mockRequireOrg = vi.mocked(requireOrganization);

describe("user-cost-analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrg.mockResolvedValue({
      session: {} as never,
      organizationId: "org-1",
      userId: "admin-1",
      role: "ADMIN",
      teamId: null,
    });
  });

  describe("getUserCostBreakdown", () => {
    it("should aggregate costs per user from PER_SEAT subscriptions", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([
        {
          userId: "user-1",
          user: {
            id: "user-1",
            name: "John",
            email: "john@test.com",
            teamId: "team-1",
            team: { id: "team-1", name: "Engineering" },
          },
          subscription: {
            id: "sub-1",
            appId: "app-1",
            perSeatPrice: { toNumber: () => 15000 },
            app: { id: "app-1", name: "Slack", customLogoUrl: null },
          },
        },
        {
          userId: "user-1",
          user: {
            id: "user-1",
            name: "John",
            email: "john@test.com",
            teamId: "team-1",
            team: { id: "team-1", name: "Engineering" },
          },
          subscription: {
            id: "sub-2",
            appId: "app-2",
            perSeatPrice: { toNumber: () => 20000 },
            app: { id: "app-2", name: "Notion", customLogoUrl: null },
          },
        },
      ] as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { userId: "user-1", appId: "app-1", lastUsedAt: recentDate },
        { userId: "user-1", appId: "app-2", lastUsedAt: null },
      ] as never);

      const result = await getUserCostBreakdown();

      expect(result.success).toBe(true);
      expect(result.data!.users).toHaveLength(1);

      const user = result.data!.users[0];
      expect(user.userId).toBe("user-1");
      expect(user.totalMonthlyCost).toBe(35000);
      expect(user.assignedAppCount).toBe(2);
      expect(user.activeAppCount).toBe(1); // only Slack
      expect(user.subscriptions).toHaveLength(2);
    });

    it("should return empty when no PER_SEAT subscriptions", async () => {
      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([]);

      const result = await getUserCostBreakdown();

      expect(result.success).toBe(true);
      expect(result.data!.users).toHaveLength(0);
      expect(result.data!.totalMonthlyCost).toBe(0);
    });

    it("should filter by teamId when provided", async () => {
      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([]);

      await getUserCostBreakdown({ teamId: "team-1" });

      expect(prisma.subscriptionUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { teamId: "team-1" },
          }),
        })
      );
    });
  });

  describe("getTeamCostComparison", () => {
    it("should return team comparison sorted by cost", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      vi.mocked(prisma.team.findMany).mockResolvedValue([
        { id: "team-1", name: "Engineering", _count: { members: 5 } },
        { id: "team-2", name: "Marketing", _count: { members: 3 } },
      ] as never);

      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([
        {
          userId: "u1",
          user: { id: "u1", teamId: "team-1" },
          subscription: {
            appId: "app-1",
            perSeatPrice: { toNumber: () => 15000 },
          },
        },
        {
          userId: "u2",
          user: { id: "u2", teamId: "team-1" },
          subscription: {
            appId: "app-1",
            perSeatPrice: { toNumber: () => 15000 },
          },
        },
        {
          userId: "u3",
          user: { id: "u3", teamId: "team-2" },
          subscription: {
            appId: "app-1",
            perSeatPrice: { toNumber: () => 15000 },
          },
        },
      ] as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { userId: "u1", appId: "app-1", lastUsedAt: recentDate },
        { userId: "u2", appId: "app-1", lastUsedAt: recentDate },
        { userId: "u3", appId: "app-1", lastUsedAt: null },
      ] as never);

      const result = await getTeamCostComparison();

      expect(result.success).toBe(true);
      const teams = result.data!.teams;
      expect(teams).toHaveLength(2);

      // Engineering first (30000 > 15000)
      expect(teams[0].teamName).toBe("Engineering");
      expect(teams[0].totalMonthlyCost).toBe(30000);
      expect(teams[0].costPerMember).toBe(6000); // 30000/5

      expect(teams[1].teamName).toBe("Marketing");
      expect(teams[1].totalMonthlyCost).toBe(15000);
    });
  });
});
