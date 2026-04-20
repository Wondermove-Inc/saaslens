// src/actions/subscriptions/subscription-seat-management.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    subscriptionUser: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    userAppAccess: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

import {
  assignUserToSubscription,
  getSubscriptionSeatDetails,
  removeUserFromSubscription,
} from "./subscription-seat-management";

const mockRequireOrg = vi.mocked(requireOrganization);

describe("subscription-seat-management", () => {
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

  describe("getSubscriptionSeatDetails", () => {
    it("should return seat details with user activity", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        totalLicenses: 10,
        usedLicenses: 3,
      } as never);

      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 5);
      const oldDate = new Date(now);
      oldDate.setDate(oldDate.getDate() - 60);

      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([
        {
          userId: "user-1",
          assignedAt: new Date("2025-01-01"),
          assignedBy: "admin-1",
          user: { id: "user-1", name: "Active User", email: "active@test.com" },
        },
        {
          userId: "user-2",
          assignedAt: new Date("2025-01-01"),
          assignedBy: "admin-1",
          user: {
            id: "user-2",
            name: "Inactive User",
            email: "inactive@test.com",
          },
        },
        {
          userId: "user-3",
          assignedAt: new Date("2025-01-01"),
          assignedBy: null,
          user: { id: "user-3", name: null, email: "never@test.com" },
        },
      ] as never);

      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { userId: "user-1", lastUsedAt: recentDate },
        { userId: "user-2", lastUsedAt: oldDate },
        // user-3 has no access record → lastUsedAt = null
      ] as never);

      const result = await getSubscriptionSeatDetails("sub-1");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.totalSeats).toBe(10);
      expect(result.data!.usedSeats).toBe(3);
      expect(result.data!.unassignedSeats).toBe(7);

      // Active user (recent activity)
      const activeUser = result.data!.assignedUsers.find(
        (u) => u.id === "user-1"
      );
      expect(activeUser?.isInactive).toBe(false);

      // Inactive user (old activity)
      const inactiveUser = result.data!.assignedUsers.find(
        (u) => u.id === "user-2"
      );
      expect(inactiveUser?.isInactive).toBe(true);

      // Never-used user (no access) → fallback: assigned = active
      const neverUsed = result.data!.assignedUsers.find(
        (u) => u.id === "user-3"
      );
      expect(neverUsed?.isInactive).toBe(false);

      // Only user-2 (old lastUsedAt) is inactive
      expect(result.data!.inactiveSeats).toBe(1);
    });

    it("should return error when subscription not found", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await getSubscriptionSeatDetails("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("구독을 찾을 수 없습니다");
    });

    it("should treat all assigned users without UserAppAccess as active (fallback)", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        totalLicenses: 10,
        usedLicenses: 2,
      } as never);

      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([
        {
          userId: "user-1",
          assignedAt: new Date("2025-06-01"),
          assignedBy: "admin-1",
          user: { id: "user-1", name: "User One", email: "u1@test.com" },
        },
        {
          userId: "user-2",
          assignedAt: new Date("2025-06-15"),
          assignedBy: "admin-1",
          user: { id: "user-2", name: "User Two", email: "u2@test.com" },
        },
      ] as never);

      // No UserAppAccess records at all
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([]);

      const result = await getSubscriptionSeatDetails("sub-1");

      expect(result.success).toBe(true);
      // Both users should be active via fallback
      expect(result.data!.assignedUsers[0].isInactive).toBe(false);
      expect(result.data!.assignedUsers[1].isInactive).toBe(false);
      expect(result.data!.inactiveSeats).toBe(0);
    });

    it("should treat user with null lastUsedAt in UserAppAccess as active (fallback)", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        totalLicenses: 5,
        usedLicenses: 1,
      } as never);

      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([
        {
          userId: "user-1",
          assignedAt: new Date("2025-06-01"),
          assignedBy: "admin-1",
          user: { id: "user-1", name: "User One", email: "u1@test.com" },
        },
      ] as never);

      // UserAppAccess exists but lastUsedAt is null
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([
        { userId: "user-1", lastUsedAt: null },
      ] as never);

      const result = await getSubscriptionSeatDetails("sub-1");

      expect(result.success).toBe(true);
      expect(result.data!.assignedUsers[0].isInactive).toBe(false);
      expect(result.data!.inactiveSeats).toBe(0);
    });

    it("should handle subscription with no totalLicenses", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        totalLicenses: null,
        usedLicenses: null,
      } as never);

      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userAppAccess.findMany).mockResolvedValue([]);

      const result = await getSubscriptionSeatDetails("sub-1");

      expect(result.success).toBe(true);
      expect(result.data!.totalSeats).toBe(0);
      expect(result.data!.usedSeats).toBe(0);
    });
  });

  describe("assignUserToSubscription", () => {
    it("should assign user and update usedLicenses", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        totalLicenses: 10,
        _count: { assignedUsers: 3 },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-4",
      } as never);

      vi.mocked(prisma.subscriptionUser.findUnique).mockResolvedValue(null);

      const mockAssignedAt = new Date();
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          subscriptionUser: {
            create: vi.fn().mockResolvedValue({
              assignedAt: mockAssignedAt,
            }),
            count: vi.fn().mockResolvedValue(4),
          },
          subscription: {
            update: vi.fn(),
          },
        };
        return fn(tx as never);
      });

      const result = await assignUserToSubscription("sub-1", "user-4");

      expect(result.success).toBe(true);
      expect(result.data?.assignedAt).toEqual(mockAssignedAt);
    });

    it("should reject when seat limit reached", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        totalLicenses: 5,
        _count: { assignedUsers: 5 },
      } as never);

      const result = await assignUserToSubscription("sub-1", "user-new");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Seat 한도에 도달했습니다");
    });

    it("should reject duplicate assignment", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        totalLicenses: 10,
        _count: { assignedUsers: 3 },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
      } as never);

      vi.mocked(prisma.subscriptionUser.findUnique).mockResolvedValue({
        id: "su-1",
      } as never);

      const result = await assignUserToSubscription("sub-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("이미 배정된 유저입니다");
    });

    it("should reject user from different org", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        totalLicenses: 10,
        _count: { assignedUsers: 0 },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const result = await assignUserToSubscription("sub-1", "user-other-org");

      expect(result.success).toBe(false);
      expect(result.error).toBe("유저를 찾을 수 없습니다");
    });

    it("should allow assignment when totalLicenses is null", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        totalLicenses: null,
        _count: { assignedUsers: 5 },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
      } as never);

      vi.mocked(prisma.subscriptionUser.findUnique).mockResolvedValue(null);

      const mockAssignedAt = new Date();
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          subscriptionUser: {
            create: vi.fn().mockResolvedValue({ assignedAt: mockAssignedAt }),
            count: vi.fn().mockResolvedValue(6),
          },
          subscription: { update: vi.fn() },
        };
        return fn(tx as never);
      });

      const result = await assignUserToSubscription("sub-1", "user-1");
      expect(result.success).toBe(true);
    });
  });

  describe("removeUserFromSubscription", () => {
    it("should remove user and update usedLicenses", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
      } as never);

      vi.mocked(prisma.subscriptionUser.findUnique).mockResolvedValue({
        id: "su-1",
      } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          subscriptionUser: {
            delete: vi.fn(),
            count: vi.fn().mockResolvedValue(2),
          },
          subscription: { update: vi.fn() },
        };
        return fn(tx as never);
      });

      const result = await removeUserFromSubscription("sub-1", "user-1");

      expect(result.success).toBe(true);
    });

    it("should reject when user not assigned", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
      } as never);

      vi.mocked(prisma.subscriptionUser.findUnique).mockResolvedValue(null);

      const result = await removeUserFromSubscription("sub-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("배정되지 않은 유저입니다");
    });

    it("should return error when subscription not found", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await removeUserFromSubscription("nonexistent", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("구독을 찾을 수 없습니다");
    });
  });
});
