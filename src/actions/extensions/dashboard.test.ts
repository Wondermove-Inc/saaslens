// src/actions/extensions/dashboard.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getExtensionDashboard } from "./dashboard";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionDevice: {
      count: vi.fn(),
    },
    extensionBlacklist: {
      count: vi.fn(),
    },
    extensionWhitelist: {
      count: vi.fn(),
    },
    extensionUsage: {
      aggregate: vi.fn(),
    },
    extensionConfig: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockAuth = vi.mocked(auth);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe("Extension Dashboard Actions", () => {
  const mockOrganizationId = "org-123";
  const mockSession = {
    user: {
      id: "user-123",
      organizationId: mockOrganizationId,
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  describe("getExtensionDashboard", () => {
    it("should return dashboard stats", async () => {
      mockPrisma.extensionDevice.count
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(5); // inactive

      mockPrisma.extensionBlacklist.count.mockResolvedValue(3);
      mockPrisma.extensionWhitelist.count.mockResolvedValue(15);

      mockPrisma.extensionUsage.aggregate.mockResolvedValue({
        _sum: { totalSeconds: 86400 },
      } as never);

      mockPrisma.extensionConfig.findMany.mockResolvedValue([
        {
          configKey: "blacklist_last_sync",
          configValue: new Date().toISOString(),
        },
        {
          configKey: "whitelist_last_sync",
          configValue: new Date().toISOString(),
        },
      ] as never);

      const result = await getExtensionDashboard();

      expect(result.success).toBe(true);
      expect(result.data?.activeDevices).toBe(10);
      expect(result.data?.inactiveDevices).toBe(5);
      expect(result.data?.blockedSitesCount).toBe(3);
      expect(result.data?.trackedSitesCount).toBe(15);
    });

    it("should return error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getExtensionDashboard();

      expect(result.success).toBe(false);
      expect(result.error).toBe("인증이 필요합니다");
    });
  });
});
