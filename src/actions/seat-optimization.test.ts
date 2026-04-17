// src/actions/seat-optimization.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: { findMany: vi.fn(), findFirst: vi.fn() },
    userAppAccess: { findMany: vi.fn() },
  },
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

import {
  getSavingsOpportunitySummary,
  getSeatOptimizationSuggestions,
  simulateSeatReduction,
} from "./seat-optimization";

const mockRequireOrg = vi.mocked(requireOrganization);

describe("seat-optimization", () => {
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

  describe("getSeatOptimizationSuggestions", () => {
    it("should return empty when no PER_SEAT subscriptions", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getSeatOptimizationSuggestions();

      expect(result.success).toBe(true);
      expect(result.data!.items).toHaveLength(0);
      expect(result.data!.totalMonthlySavings).toBe(0);
    });

    it("should calculate optimization suggestions correctly", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          totalLicenses: 20,
          perSeatPrice: { toNumber: () => 10000 },
          app: { id: "app-1", name: "Slack", customLogoUrl: null },
          assignedUsers: [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }],
        },
      ] as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { appId: "app-1", userId: "u1", lastUsedAt: recentDate },
        { appId: "app-1", userId: "u2", lastUsedAt: recentDate },
        // u3 has no access record → inactive (conservative)
      ] as never);

      const result = await getSeatOptimizationSuggestions();

      expect(result.success).toBe(true);
      const item = result.data!.items[0];

      expect(item.currentSeats).toBe(20);
      // u1 (recent), u2 (recent) → active; u3 (no access) → inactive
      expect(item.activeUsers).toBe(2);
      // recommendedSeats = Math.ceil(2 * 1.15) = 3
      expect(item.recommendedSeats).toBe(3);
      expect(item.excessSeats).toBe(17); // 20 - 3
      expect(item.monthlySavings).toBe(170000); // 17 * 10000
    });

    it("should treat assigned users without access records as inactive (conservative)", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          totalLicenses: 15,
          perSeatPrice: { toNumber: () => 10000 },
          app: { id: "app-1", name: "Notion", customLogoUrl: null },
          assignedUsers: [{ userId: "u1" }, { userId: "u2" }],
        },
      ] as never);

      // No UserAppAccess records → both users inactive (conservative)
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([]);

      const result = await getSeatOptimizationSuggestions();

      expect(result.success).toBe(true);
      const item = result.data!.items[0];

      // No recent usage → 0 active users
      expect(item.activeUsers).toBe(0);
      // recommendedSeats = Math.ceil(0 * 1.15) = 0
      expect(item.recommendedSeats).toBe(0);
      expect(item.excessSeats).toBe(15); // 15 - 0
    });

    it("should only count users with recent lastUsedAt as active", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          totalLicenses: 20,
          perSeatPrice: { toNumber: () => 10000 },
          app: { id: "app-1", name: "Slack", customLogoUrl: null },
          assignedUsers: [{ userId: "u1" }, { userId: "u2" }],
        },
      ] as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { appId: "app-1", userId: "u1", lastUsedAt: oldDate }, // inactive (>30 days)
        // u2 has no record → inactive (conservative)
      ] as never);

      const result = await getSeatOptimizationSuggestions();

      expect(result.success).toBe(true);
      const item = result.data!.items[0];

      // u1 inactive (old), u2 inactive (no record) → 0 active
      expect(item.activeUsers).toBe(0);
      // recommendedSeats = Math.ceil(0 * 1.15) = 0
      expect(item.recommendedSeats).toBe(0);
      expect(item.excessSeats).toBe(20); // 20 - 0
    });

    it("should skip subscriptions that don't need optimization", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          totalLicenses: 3,
          perSeatPrice: { toNumber: () => 10000 },
          app: { id: "app-1", name: "Slack", customLogoUrl: null },
          assignedUsers: [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }],
        },
      ] as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { appId: "app-1", userId: "u1", lastUsedAt: recentDate },
        { appId: "app-1", userId: "u2", lastUsedAt: recentDate },
        { appId: "app-1", userId: "u3", lastUsedAt: recentDate },
      ] as never);

      const result = await getSeatOptimizationSuggestions();

      // 3 active users → recommended = ceil(3*1.15) = 4 > 3 current → no excess
      expect(result.data!.items).toHaveLength(0);
    });
  });

  describe("simulateSeatReduction", () => {
    it("should return simulation results with affected users", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        totalLicenses: 10,
        perSeatPrice: { toNumber: () => 15000 },
        app: { id: "app-1", name: "Slack" },
        assignedUsers: [
          {
            userId: "u1",
            user: { id: "u1", name: "Active User", email: "active@t.com" },
          },
          {
            userId: "u2",
            user: { id: "u2", name: "Inactive User", email: "inactive@t.com" },
          },
        ],
      } as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { userId: "u1", lastUsedAt: new Date() },
        { userId: "u2", lastUsedAt: oldDate },
      ] as never);

      const result = await simulateSeatReduction("sub-1", 5);

      expect(result.success).toBe(true);
      expect(result.data!.currentSeats).toBe(10);
      expect(result.data!.targetSeats).toBe(5);
      expect(result.data!.monthlySavings).toBe(75000); // 5 * 15000
      expect(result.data!.affectedUsers).toHaveLength(1);
      expect(result.data!.affectedUsers[0].name).toBe("Inactive User");
    });
  });

  describe("getSavingsOpportunitySummary", () => {
    it("should return top 3 apps summary", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getSavingsOpportunitySummary();

      expect(result.success).toBe(true);
      expect(result.data!.topApps).toHaveLength(0);
    });
  });
});
