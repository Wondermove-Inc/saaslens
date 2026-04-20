// src/lib/services/fleetdm/deviceService.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    device: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    deviceApp: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import {
  getDeviceApps,
  getDeviceById,
  getDevices,
  getDeviceStats,
  getShadowITApps,
  updateDeviceAppApprovalStatus,
  type DeviceWithApps,
} from "./deviceService";

describe("deviceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDevices", () => {
    it("should return devices for an organization", async () => {
      const mockDevices = [
        {
          id: "device-1",
          fleetId: "fleet-1",
          hostname: "MacBook-Pro-1",
          platform: "MACOS",
          status: "ONLINE",
          osVersion: "14.0",
          lastSeenAt: new Date("2025-01-01"),
          user: { id: "user-1", name: "John", email: "john@example.com" },
          _count: { deviceApps: 15 },
        },
        {
          id: "device-2",
          fleetId: "fleet-2",
          hostname: "Windows-PC-1",
          platform: "WINDOWS",
          status: "OFFLINE",
          osVersion: "11",
          lastSeenAt: new Date("2025-01-02"),
          user: null,
          _count: { deviceApps: 8 },
        },
      ];

      vi.mocked(prisma.device.findMany).mockResolvedValue(mockDevices as never);
      vi.mocked(prisma.device.count).mockResolvedValue(2);

      const result = await getDevices("org-1");

      expect(result.devices).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-1" },
        })
      );
    });

    it("should filter by status", async () => {
      vi.mocked(prisma.device.findMany).mockResolvedValue([]);
      vi.mocked(prisma.device.count).mockResolvedValue(0);

      await getDevices("org-1", { status: "ONLINE" });

      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-1", status: "ONLINE" },
        })
      );
    });

    it("should filter by platform", async () => {
      vi.mocked(prisma.device.findMany).mockResolvedValue([]);
      vi.mocked(prisma.device.count).mockResolvedValue(0);

      await getDevices("org-1", { platform: "MACOS" });

      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-1", platform: "MACOS" },
        })
      );
    });

    it("should support pagination", async () => {
      vi.mocked(prisma.device.findMany).mockResolvedValue([]);
      vi.mocked(prisma.device.count).mockResolvedValue(50);

      const result = await getDevices("org-1", { page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe("getDeviceById", () => {
    it("should return device with apps", async () => {
      const mockDevice: DeviceWithApps = {
        id: "device-1",
        organizationId: "org-1",
        fleetId: "fleet-1",
        hostname: "MacBook-Pro-1",
        platform: "MACOS",
        osVersion: "14.0",
        hardwareModel: "MacBookPro18,1",
        hardwareSerial: "ABC123",
        status: "ONLINE",
        lastSeenAt: new Date("2025-01-01"),
        enrolledAt: new Date("2024-12-01"),
        agentVersion: "1.0.0",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "user-1", name: "John", email: "john@example.com" },
        deviceApps: [
          {
            id: "app-1",
            deviceId: "device-1",
            name: "Slack",
            version: "4.0",
            bundleIdentifier: "com.tinyspeck.slackmacgap",
            installPath: "/Applications/Slack.app",
            installedAt: new Date(),
            matchedAppId: "saas-app-1",
            matchedApp: { id: "saas-app-1", name: "Slack" },
            matchConfidence: 0.95,
            matchSource: "CATALOG",
            approvalStatus: "APPROVED",
            lastUsedAt: new Date(),
            usageMinutes: 1200,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.device.findUnique).mockResolvedValue(
        mockDevice as never
      );

      const result = await getDeviceById("device-1", "org-1");

      expect(result).toBeDefined();
      expect(result?.hostname).toBe("MacBook-Pro-1");
      expect(result?.deviceApps).toHaveLength(1);
      expect(prisma.device.findUnique).toHaveBeenCalledWith({
        where: { id: "device-1", organizationId: "org-1" },
        include: expect.any(Object),
      });
    });

    it("should return null if device not found", async () => {
      vi.mocked(prisma.device.findUnique).mockResolvedValue(null);

      const result = await getDeviceById("non-existent", "org-1");

      expect(result).toBeNull();
    });
  });

  describe("getDeviceStats", () => {
    it("should return device statistics", async () => {
      vi.mocked(prisma.device.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75) // online
        .mockResolvedValueOnce(20) // offline
        .mockResolvedValueOnce(5); // pending

      vi.mocked(prisma.deviceApp.count)
        .mockResolvedValueOnce(500) // totalApps
        .mockResolvedValueOnce(45); // shadowITApps

      const result = await getDeviceStats("org-1");

      expect(result.totalDevices).toBe(100);
      expect(result.onlineDevices).toBe(75);
      expect(result.offlineDevices).toBe(20);
      expect(result.pendingDevices).toBe(5);
      expect(result.totalApps).toBe(500);
      expect(result.shadowITApps).toBe(45);
      expect(result.installationRate).toBe(0.95); // (75+20) / 100
    });

    it("should handle zero devices", async () => {
      vi.mocked(prisma.device.count).mockResolvedValue(0);
      vi.mocked(prisma.deviceApp.count).mockResolvedValue(0);

      const result = await getDeviceStats("org-1");

      expect(result.totalDevices).toBe(0);
      expect(result.installationRate).toBe(0);
    });
  });

  describe("getDeviceApps", () => {
    it("should return apps for a device", async () => {
      const mockApps = [
        {
          id: "app-1",
          name: "Slack",
          version: "4.0",
          approvalStatus: "APPROVED",
          matchedApp: { id: "saas-1", name: "Slack" },
        },
        {
          id: "app-2",
          name: "Unknown App",
          version: "1.0",
          approvalStatus: "SHADOW_IT",
          matchedApp: null,
        },
      ];

      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue(mockApps as never);

      const result = await getDeviceApps("device-1");

      expect(result).toHaveLength(2);
      expect(result[0].approvalStatus).toBe("APPROVED");
      expect(result[1].approvalStatus).toBe("SHADOW_IT");
    });
  });

  describe("getShadowITApps", () => {
    it("should return Shadow IT apps across organization", async () => {
      const mockShadowApps = [
        {
          name: "Suspicious App",
          _count: { _all: 15 },
        },
        {
          name: "Unknown Tool",
          _count: { _all: 8 },
        },
      ];

      vi.mocked(prisma.deviceApp.groupBy).mockResolvedValue(
        mockShadowApps as never
      );

      const result = await getShadowITApps("org-1");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Suspicious App");
      expect(result[0].deviceCount).toBe(15);
    });

    it("should return empty array when no Shadow IT apps", async () => {
      vi.mocked(prisma.deviceApp.groupBy).mockResolvedValue([]);

      const result = await getShadowITApps("org-1");

      expect(result).toHaveLength(0);
    });
  });

  describe("updateDeviceAppApprovalStatus", () => {
    it("should update app approval status", async () => {
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([
        { id: "app-1", deviceId: "device-1" },
        { id: "app-2", deviceId: "device-2" },
      ] as never);

      // Mock transaction - receives array of promises
      vi.mocked(prisma.$transaction).mockResolvedValue([
        { id: "app-1", approvalStatus: "APPROVED" },
        { id: "app-2", approvalStatus: "APPROVED" },
      ] as never);

      const result = await updateDeviceAppApprovalStatus(
        "org-1",
        "Unknown App",
        "APPROVED"
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should handle app not found", async () => {
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([]);

      const result = await updateDeviceAppApprovalStatus(
        "org-1",
        "Non-existent App",
        "APPROVED"
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });
  });
});
