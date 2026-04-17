// src/actions/devices.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock services
vi.mock("@/lib/services/fleetdm", () => ({
  getDevices: vi.fn(),
  getDeviceById: vi.fn(),
  getDeviceStats: vi.fn(),
  getDeviceApps: vi.fn(),
  getShadowITApps: vi.fn(),
  updateDeviceAppApprovalStatus: vi.fn(),
  getUsersWithoutAgent: vi.fn(),
}));

import { auth } from "@/lib/auth";
import {
  getDeviceById,
  getDevices,
  getDeviceStats,
  getShadowITApps,
  getUsersWithoutAgent,
  updateDeviceAppApprovalStatus,
} from "@/lib/services/fleetdm";

import {
  fetchDeviceById,
  fetchDevices,
  fetchDeviceStats,
  fetchShadowITApps,
  fetchUsersWithoutAgent,
  setDeviceAppApprovalStatus,
} from "./devices";

describe("devices actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchDevices", () => {
    it("should return devices when authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockResult = {
        devices: [
          {
            id: "device-1",
            hostname: "MacBook-Pro",
            status: "ONLINE",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };
      vi.mocked(getDevices).mockResolvedValue(mockResult as never);

      const result = await fetchDevices();

      expect(result.success).toBe(true);
      expect(result.data?.devices).toHaveLength(1);
      expect(getDevices).toHaveBeenCalledWith("org-1", {});
    });

    it("should return error when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await fetchDevices();

      expect(result.success).toBe(false);
      expect(result.error).toBe("인증이 필요합니다");
    });

    it("should pass filter options", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(getDevices).mockResolvedValue({
        devices: [],
        total: 0,
        page: 2,
        limit: 10,
      } as never);

      await fetchDevices({ status: "ONLINE", page: 2, limit: 10 });

      expect(getDevices).toHaveBeenCalledWith("org-1", {
        status: "ONLINE",
        page: 2,
        limit: 10,
      });
    });
  });

  describe("fetchDeviceById", () => {
    it("should return device details when authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockDevice = {
        id: "device-1",
        hostname: "MacBook-Pro",
        deviceApps: [{ id: "app-1", name: "Slack" }],
      };
      vi.mocked(getDeviceById).mockResolvedValue(mockDevice as never);

      const result = await fetchDeviceById("device-1");

      expect(result.success).toBe(true);
      expect(result.data?.hostname).toBe("MacBook-Pro");
      expect(getDeviceById).toHaveBeenCalledWith("device-1", "org-1");
    });

    it("should return error when device not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(getDeviceById).mockResolvedValue(null);

      const result = await fetchDeviceById("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("디바이스를 찾을 수 없습니다");
    });
  });

  describe("fetchDeviceStats", () => {
    it("should return device statistics", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockStats = {
        totalDevices: 100,
        onlineDevices: 75,
        offlineDevices: 20,
        pendingDevices: 5,
        totalApps: 500,
        shadowITApps: 45,
        installationRate: 0.95,
      };
      vi.mocked(getDeviceStats).mockResolvedValue(mockStats);

      const result = await fetchDeviceStats();

      expect(result.success).toBe(true);
      expect(result.data?.totalDevices).toBe(100);
      expect(result.data?.installationRate).toBe(0.95);
    });
  });

  describe("fetchShadowITApps", () => {
    it("should return Shadow IT apps", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockApps = [
        { name: "Unknown Tool", deviceCount: 15 },
        { name: "Suspicious App", deviceCount: 8 },
      ];
      vi.mocked(getShadowITApps).mockResolvedValue(mockApps);

      const result = await fetchShadowITApps();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].deviceCount).toBe(15);
    });
  });

  describe("setDeviceAppApprovalStatus", () => {
    it("should update app approval status when admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(updateDeviceAppApprovalStatus).mockResolvedValue({
        success: true,
        updatedCount: 5,
      });

      const result = await setDeviceAppApprovalStatus(
        "Unknown App",
        "APPROVED"
      );

      expect(result.success).toBe(true);
      expect(result.data?.updatedCount).toBe(5);
      expect(updateDeviceAppApprovalStatus).toHaveBeenCalledWith(
        "org-1",
        "Unknown App",
        "APPROVED"
      );
    });

    it("should deny access for non-admin users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await setDeviceAppApprovalStatus(
        "Unknown App",
        "APPROVED"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("권한이 없습니다");
    });
  });

  describe("fetchUsersWithoutAgent", () => {
    it("should return users without agent installed", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockUsers = [
        { id: "user-1", name: "John Doe", email: "john@example.com" },
        { id: "user-2", name: "Jane Doe", email: "jane@example.com" },
      ];
      vi.mocked(getUsersWithoutAgent).mockResolvedValue(mockUsers);

      const result = await fetchUsersWithoutAgent();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });
});
