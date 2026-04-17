// src/actions/extensions/devices.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getExtensionDevice,
  getExtensionDevices,
  syncExtensionDevice,
  updateExtensionDeviceStatus,
} from "./devices";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionDevice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockAuth = vi.mocked(auth);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe("Extension Device Actions", () => {
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

  describe("getExtensionDevices", () => {
    it("should return device list for organization", async () => {
      const mockDevices = [
        {
          id: "dev-1",
          organizationId: mockOrganizationId,
          deviceKey: "abc123",
          browserInfo: "Chrome 120",
          osInfo: "macOS",
          extensionVersion: "1.0.0",
          status: "APPROVED",
          lastSeenAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Test User", email: "test@test.com" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.extensionDevice.findMany.mockResolvedValue(
        mockDevices as never
      );
      mockPrisma.extensionDevice.count.mockResolvedValue(1);

      const result = await getExtensionDevices();

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].deviceKey).toBe("abc123");
    });

    it("should return error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getExtensionDevices();

      expect(result.success).toBe(false);
      expect(result.error).toBe("인증이 필요합니다");
    });
  });

  describe("getExtensionDevice", () => {
    it("should return a single device", async () => {
      const mockDevice = {
        id: "dev-1",
        organizationId: mockOrganizationId,
        deviceKey: "abc123",
        browserInfo: "Chrome 120",
        osInfo: "macOS",
        extensionVersion: "1.0.0",
        status: "APPROVED",
        lastSeenAt: new Date(),
        userId: "user-1",
        user: { id: "user-1", name: "Test User", email: "test@test.com" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionDevice.findUnique.mockResolvedValue(
        mockDevice as never
      );

      const result = await getExtensionDevice("dev-1");

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("dev-1");
      expect(result.data?.deviceKey).toBe("abc123");
    });

    it("should return error when device not found", async () => {
      mockPrisma.extensionDevice.findUnique.mockResolvedValue(null);

      const result = await getExtensionDevice("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("디바이스를 찾을 수 없습니다");
    });
  });

  describe("updateExtensionDeviceStatus", () => {
    it("should update device status", async () => {
      const mockDevice = {
        id: "dev-1",
        organizationId: mockOrganizationId,
        deviceKey: "abc123",
        browserInfo: "Chrome 120",
        osInfo: "macOS",
        extensionVersion: "1.0.0",
        status: "PENDING",
        lastSeenAt: null,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionDevice.findUnique.mockResolvedValue(mockDevice);
      mockPrisma.extensionDevice.update.mockResolvedValue({
        ...mockDevice,
        status: "APPROVED",
      });

      const result = await updateExtensionDeviceStatus("dev-1", {
        status: "APPROVED",
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("APPROVED");
    });

    it("should return error when device not found", async () => {
      mockPrisma.extensionDevice.findUnique.mockResolvedValue(null);

      const result = await updateExtensionDeviceStatus("non-existent", {
        status: "APPROVED",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("찾을 수 없습니다");
    });
  });

  describe("syncExtensionDevice", () => {
    it("should update lastSeenAt", async () => {
      const mockDevice = {
        id: "dev-1",
        organizationId: mockOrganizationId,
        deviceKey: "abc123",
        browserInfo: "Chrome 120",
        osInfo: "macOS",
        extensionVersion: "1.0.0",
        status: "APPROVED",
        lastSeenAt: null,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionDevice.findUnique.mockResolvedValue(mockDevice);
      mockPrisma.extensionDevice.update.mockResolvedValue({
        ...mockDevice,
        lastSeenAt: new Date(),
      });

      const result = await syncExtensionDevice("dev-1");

      expect(result.success).toBe(true);
      expect(result.data?.lastSeenAt).toBeDefined();
    });
  });
});
