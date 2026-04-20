// src/actions/seat-waste-analysis.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: { findMany: vi.fn() },
    userAppAccess: { findMany: vi.fn() },
  },
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

import {
  getSeatWasteAnalysis,
  getSeatWasteSummary,
} from "./seat-waste-analysis";

const mockRequireOrg = vi.mocked(requireOrganization);

describe("seat-waste-analysis", () => {
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

  describe("getSeatWasteAnalysis", () => {
    it("should return empty analysis when no PER_SEAT subscriptions", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getSeatWasteAnalysis();

      expect(result.success).toBe(true);
      expect(result.data?.summary.appCount).toBe(0);
      expect(result.data?.summary.totalMonthlyWaste).toBe(0);
      expect(result.data?.apps).toHaveLength(0);
    });

    it("should calculate waste for subscriptions with unassigned and inactive seats", async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 5);
      const oldDate = new Date(now);
      oldDate.setDate(oldDate.getDate() - 60);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          perSeatPrice: { toNumber: () => 15000 } as never,
          totalLicenses: 10,
          app: { id: "app-1", name: "Slack", customLogoUrl: null },
          assignedUsers: [
            { userId: "user-1" },
            { userId: "user-2" },
            { userId: "user-3" },
          ],
        },
      ] as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { userId: "user-1", appId: "app-1", lastUsedAt: recentDate },
        { userId: "user-2", appId: "app-1", lastUsedAt: oldDate },
        // user-3 has no access record → untracked (과다 배정 아님)
      ] as never);

      const result = await getSeatWasteAnalysis();

      expect(result.success).toBe(true);
      const app = result.data!.apps[0];

      expect(app.totalSeats).toBe(10);
      expect(app.assignedSeats).toBe(3);
      // user-1 (recent) = active, user-2 (old) = inactive, user-3 (no access) = untracked
      expect(app.activeSeats).toBe(1);
      expect(app.unassignedSeats).toBe(7); // 10 - 3
      expect(app.inactiveSeats).toBe(1); // user-2 only (증거 기반)
      expect(app.wastedSeats).toBe(8); // 7 + 1
      expect(app.perSeatPrice).toBe(15000);
      expect(app.monthlyWaste).toBe(8 * 15000);
      expect(app.utilizationRate).toBe(10); // 1/10 * 100
    });

    it("should not count users without UserAppAccess as inactive", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          perSeatPrice: { toNumber: () => 10000 } as never,
          totalLicenses: 15,
          app: { id: "app-1", name: "Notion", customLogoUrl: null },
          assignedUsers: [{ userId: "user-1" }, { userId: "user-2" }],
        },
      ] as never);

      // No UserAppAccess records at all → untracked (과다 배정 아님)
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([]);

      const result = await getSeatWasteAnalysis();

      expect(result.success).toBe(true);
      const app = result.data!.apps[0];

      expect(app.totalSeats).toBe(15);
      expect(app.assignedSeats).toBe(2);
      expect(app.activeSeats).toBe(0); // no usage data
      expect(app.inactiveSeats).toBe(0); // no evidence → not inactive
      expect(app.unassignedSeats).toBe(13);
      expect(app.wastedSeats).toBe(13); // 13 unassigned + 0 inactive
      expect(app.utilizationRate).toBe(0); // 0/15 * 100
    });

    it("should not count user with null lastUsedAt as inactive", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          perSeatPrice: { toNumber: () => 5000 } as never,
          totalLicenses: 5,
          app: { id: "app-1", name: "Jira", customLogoUrl: null },
          assignedUsers: [{ userId: "user-1" }],
        },
      ] as never);

      // UserAppAccess exists but lastUsedAt is null → untracked (과다 배정 아님)
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { userId: "user-1", appId: "app-1", lastUsedAt: null },
      ] as never);

      const result = await getSeatWasteAnalysis();

      expect(result.success).toBe(true);
      const app = result.data!.apps[0];

      expect(app.activeSeats).toBe(0); // null lastUsedAt → untracked
      expect(app.inactiveSeats).toBe(0); // null = no evidence
    });

    it("should handle multiple subscriptions and sort by waste", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          perSeatPrice: { toNumber: () => 10000 } as never,
          totalLicenses: 5,
          app: { id: "app-1", name: "AppA", customLogoUrl: null },
          assignedUsers: [{ userId: "u1" }],
        },
        {
          id: "sub-2",
          perSeatPrice: { toNumber: () => 20000 } as never,
          totalLicenses: 10,
          app: { id: "app-2", name: "AppB", customLogoUrl: null },
          assignedUsers: [{ userId: "u2" }],
        },
      ] as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { userId: "u1", appId: "app-1", lastUsedAt: recentDate },
        { userId: "u2", appId: "app-2", lastUsedAt: recentDate },
      ] as never);

      const result = await getSeatWasteAnalysis();

      expect(result.data!.apps).toHaveLength(2);
      // AppB has higher waste: (10-1)*20000 = 180000 vs AppA: (5-1)*10000 = 40000
      expect(result.data!.apps[0].appName).toBe("AppB");
      expect(result.data!.apps[1].appName).toBe("AppA");

      expect(result.data!.summary.totalMonthlyWaste).toBe(180000 + 40000);
      expect(result.data!.summary.appCount).toBe(2);
    });
  });

  describe("getSeatWasteSummary", () => {
    it("should return summary only", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getSeatWasteSummary();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("totalMonthlyWaste");
      expect(result.data).toHaveProperty("overallUtilizationRate");
      expect(result.data).not.toHaveProperty("apps");
    });
  });
});
