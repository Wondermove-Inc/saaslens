// FleetDM Sync Service Tests
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FleetDMClient } from "./client";
import {
  getFleetDMClientForOrganization,
  getFleetDMClientFromIntegration,
  syncAllFromFleetDM,
  syncHostFromFleetDM,
  syncHostSoftwareFromFleetDM,
} from "./sync";
import type { FleetDMHost, FleetDMSoftware } from "./types";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    device: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    deviceApp: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    userAppAccess: {
      upsert: vi.fn(),
    },
    integration: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock FleetDMClient
vi.mock("./client", () => ({
  FleetDMClient: vi.fn().mockImplementation(() => ({
    getHosts: vi.fn(),
    getHostSoftware: vi.fn(),
  })),
}));

import { prisma } from "@/lib/db";

describe("FleetDM Sync Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncHostFromFleetDM", () => {
    const organizationId = "org-123";
    const mockHost: FleetDMHost = {
      id: 1,
      uuid: "uuid-1",
      hostname: "test-device",
      display_name: "Test Device",
      platform: "darwin",
      osquery_version: "5.0.0",
      os_version: "macOS 14.0",
      build: "",
      platform_like: "darwin",
      code_name: "",
      uptime: 86400,
      memory: 16000000000,
      cpu_type: "x86_64",
      cpu_subtype: "",
      cpu_brand: "Apple M1",
      cpu_physical_cores: 8,
      cpu_logical_cores: 8,
      hardware_vendor: "Apple Inc.",
      hardware_model: "MacBook Pro",
      hardware_version: "",
      hardware_serial: "ABC123",
      computer_name: "Test Device",
      public_ip: "1.2.3.4",
      primary_ip: "192.168.1.1",
      primary_mac: "00:00:00:00:00:01",
      distributed_interval: 10,
      config_tls_refresh: 10,
      logger_tls_period: 10,
      team_id: 1,
      pack_stats: null,
      status: "online",
      detail_updated_at: "2024-01-01T00:00:00Z",
      label_updated_at: "2024-01-01T00:00:00Z",
      policy_updated_at: "2024-01-01T00:00:00Z",
      last_enrolled_at: "2024-01-01T00:00:00Z",
      seen_time: "2024-01-01T00:00:00Z",
      refetch_requested: false,
      mdm: {
        enrollment_status: null,
        server_url: null,
        name: null,
      },
      software_updated_at: "2024-01-01T00:00:00Z",
    };

    it("should sync host and return device ID", async () => {
      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-1",
        organizationId,
        fleetId: "1",
        hostname: mockHost.hostname,
        platform: "MACOS",
        osVersion: mockHost.os_version,
        hardwareModel: mockHost.hardware_model,
        hardwareSerial: mockHost.hardware_serial,
        status: "ONLINE",
        lastSeenAt: new Date(),
        enrolledAt: new Date(),
        agentVersion: mockHost.osquery_version,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deviceId = await syncHostFromFleetDM(mockHost, organizationId);

      expect(deviceId).toBe("device-1");
      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId_fleetId: {
              organizationId,
              fleetId: "1",
            },
          },
          create: expect.objectContaining({
            organization: { connect: { id: organizationId } },
            fleetId: "1",
            hostname: mockHost.hostname,
            platform: "MACOS",
          }),
          update: expect.objectContaining({
            hostname: mockHost.hostname,
            platform: "MACOS",
          }),
        })
      );
    });

    it("should map Windows platform correctly", async () => {
      const windowsHost = { ...mockHost, platform: "windows" as const };
      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-2",
      } as never);

      await syncHostFromFleetDM(windowsHost, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            platform: "WINDOWS",
          }),
        })
      );
    });

    it("should map Linux platform correctly", async () => {
      const linuxHost = { ...mockHost, platform: "linux" as const };
      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-3",
      } as never);

      await syncHostFromFleetDM(linuxHost, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            platform: "LINUX",
          }),
        })
      );
    });

    it("should map offline status correctly", async () => {
      const offlineHost = { ...mockHost, status: "offline" as const };
      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-4",
      } as never);

      await syncHostFromFleetDM(offlineHost, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: "OFFLINE",
          }),
        })
      );
    });

    it("should use display_name when hostname is empty", async () => {
      const hostWithoutHostname = { ...mockHost, hostname: "" };
      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-5",
      } as never);

      await syncHostFromFleetDM(hostWithoutHostname, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            hostname: "Test Device", // display_name
          }),
        })
      );
    });
  });

  describe("syncHostSoftwareFromFleetDM", () => {
    const deviceId = "device-1";
    const mockSoftware: FleetDMSoftware[] = [
      {
        id: 1,
        name: "Visual Studio Code",
        version: "1.85.0",
        source: "apps",
        bundle_identifier: "com.microsoft.VSCode",
        extension_id: null,
        browser: null,
        generated_cpe: "",
        vulnerabilities: null,
        hosts_count: 10,
      },
      {
        id: 2,
        name: "Slack",
        version: "4.35.0",
        source: "apps",
        bundle_identifier: "com.tinyspeck.slackmacgap",
        extension_id: null,
        browser: null,
        generated_cpe: "",
        vulnerabilities: null,
        hosts_count: 50,
      },
    ];

    it("should create new software apps", async () => {
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([]);
      vi.mocked(prisma.deviceApp.create).mockResolvedValue({} as never);

      const count = await syncHostSoftwareFromFleetDM(deviceId, mockSoftware);

      expect(count).toBe(2);
      expect(prisma.deviceApp.create).toHaveBeenCalledTimes(2);
      expect(prisma.deviceApp.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          device: { connect: { id: deviceId } },
          name: "Visual Studio Code",
          version: "1.85.0",
        }),
      });
    });

    it("should update existing software apps", async () => {
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([
        {
          id: "app-1",
          name: "Visual Studio Code",
          version: "1.85.0",
        },
      ] as never);
      vi.mocked(prisma.deviceApp.update).mockResolvedValue({} as never);
      vi.mocked(prisma.deviceApp.create).mockResolvedValue({} as never);

      const count = await syncHostSoftwareFromFleetDM(deviceId, mockSoftware);

      expect(count).toBe(2);
      expect(prisma.deviceApp.update).toHaveBeenCalledWith({
        where: { id: "app-1" },
        data: {
          bundleIdentifier: "com.microsoft.VSCode",
          updatedAt: expect.any(Date),
        },
      });
      // Slack은 새로 생성됨
      expect(prisma.deviceApp.create).toHaveBeenCalledTimes(1);
    });

    it("should return 0 when no software provided", async () => {
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([]);

      const count = await syncHostSoftwareFromFleetDM(deviceId, []);

      expect(count).toBe(0);
      expect(prisma.deviceApp.create).not.toHaveBeenCalled();
    });
  });

  describe("syncAllFromFleetDM", () => {
    const organizationId = "org-123";
    const mockHost: FleetDMHost = {
      id: 1,
      uuid: "uuid-1",
      hostname: "test-device",
      display_name: "Test Device",
      platform: "darwin",
      osquery_version: "5.0.0",
      os_version: "macOS 14.0",
      build: "",
      platform_like: "darwin",
      code_name: "",
      uptime: 86400,
      memory: 16000000000,
      cpu_type: "x86_64",
      cpu_subtype: "",
      cpu_brand: "Apple M1",
      cpu_physical_cores: 8,
      cpu_logical_cores: 8,
      hardware_vendor: "Apple Inc.",
      hardware_model: "MacBook Pro",
      hardware_version: "",
      hardware_serial: "ABC123",
      computer_name: "Test Device",
      public_ip: "1.2.3.4",
      primary_ip: "192.168.1.1",
      primary_mac: "00:00:00:00:00:01",
      distributed_interval: 10,
      config_tls_refresh: 10,
      logger_tls_period: 10,
      team_id: 1,
      pack_stats: null,
      status: "online",
      detail_updated_at: "2024-01-01T00:00:00Z",
      label_updated_at: "2024-01-01T00:00:00Z",
      policy_updated_at: "2024-01-01T00:00:00Z",
      last_enrolled_at: "2024-01-01T00:00:00Z",
      seen_time: "2024-01-01T00:00:00Z",
      refetch_requested: false,
      mdm: {
        enrollment_status: null,
        server_url: null,
        name: null,
      },
      software_updated_at: "2024-01-01T00:00:00Z",
    };

    it("should sync all hosts and software", async () => {
      const mockClient = {
        getHosts: vi.fn().mockResolvedValue([mockHost]),
        getHostSoftware: vi.fn().mockResolvedValue([
          {
            id: 1,
            name: "App",
            version: "1.0",
            source: "apps",
            bundle_identifier: null,
            extension_id: null,
            browser: null,
            generated_cpe: "",
            vulnerabilities: null,
            hosts_count: 1,
          },
        ]),
      } as unknown as FleetDMClient;

      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-1",
      } as never);
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([]);
      vi.mocked(prisma.deviceApp.create).mockResolvedValue({} as never);
      // UserAppAccess 동기화 모킹 - 디바이스에 userId 없음
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        userId: null,
      } as never);

      const result = await syncAllFromFleetDM(mockClient, organizationId);

      expect(result.hostsSync).toBe(1);
      expect(result.softwareSync).toBe(1);
      expect(result.userAppAccessSync).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.getHosts).toHaveBeenCalledWith({ perPage: 1000 });
    });

    it("should skip software sync when disabled", async () => {
      const mockClient = {
        getHosts: vi.fn().mockResolvedValue([mockHost]),
        getHostSoftware: vi.fn(),
      } as unknown as FleetDMClient;

      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-1",
      } as never);
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        userId: null,
      } as never);

      const result = await syncAllFromFleetDM(mockClient, organizationId, {
        syncSoftware: false,
      });

      expect(result.hostsSync).toBe(1);
      expect(result.softwareSync).toBe(0);
      expect(mockClient.getHostSoftware).not.toHaveBeenCalled();
    });

    it("should call onProgress callback", async () => {
      const mockClient = {
        getHosts: vi.fn().mockResolvedValue([mockHost, mockHost]),
        getHostSoftware: vi.fn().mockResolvedValue([]),
      } as unknown as FleetDMClient;

      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-1",
      } as never);
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([]);
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        userId: null,
      } as never);

      const onProgress = vi.fn();

      await syncAllFromFleetDM(mockClient, organizationId, { onProgress });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    });

    it("should collect errors from host sync failures", async () => {
      const mockClient = {
        getHosts: vi.fn().mockResolvedValue([mockHost]),
        getHostSoftware: vi.fn(),
      } as unknown as FleetDMClient;

      vi.mocked(prisma.device.upsert).mockRejectedValue(
        new Error("Database error")
      );

      const result = await syncAllFromFleetDM(mockClient, organizationId, {
        syncSoftware: false,
      });

      expect(result.hostsSync).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Host sync failed for 1");
      expect(result.errors[0]).toContain("Database error");
    });

    it("should collect errors from software sync failures", async () => {
      const mockClient = {
        getHosts: vi.fn().mockResolvedValue([mockHost]),
        getHostSoftware: vi.fn().mockRejectedValue(new Error("API timeout")),
      } as unknown as FleetDMClient;

      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-1",
      } as never);
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        userId: null,
      } as never);

      const result = await syncAllFromFleetDM(mockClient, organizationId);

      expect(result.hostsSync).toBe(1);
      expect(result.softwareSync).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Software sync failed for host 1");
      expect(result.errors[0]).toContain("API timeout");
    });
  });

  describe("syncUserAppAccessFromDevice", () => {
    it("should return 0 when device has no userId", async () => {
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        userId: null,
      } as never);

      const { syncUserAppAccessFromDevice } = await import("./sync");
      const result = await syncUserAppAccessFromDevice("device-1");

      expect(result).toBe(0);
      expect(prisma.deviceApp.findMany).not.toHaveBeenCalled();
    });

    it("should sync UserAppAccess for matched device apps", async () => {
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        userId: "user-1",
      } as never);
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([
        { matchedAppId: "app-1", lastUsedAt: new Date() },
        { matchedAppId: "app-2", lastUsedAt: null },
      ] as never);
      vi.mocked(prisma.userAppAccess.upsert).mockResolvedValue({} as never);

      const { syncUserAppAccessFromDevice } = await import("./sync");
      const result = await syncUserAppAccessFromDevice("device-1");

      expect(result).toBe(2);
      expect(prisma.userAppAccess.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.userAppAccess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_appId: { userId: "user-1", appId: "app-1" },
          },
          create: expect.objectContaining({
            userId: "user-1",
            appId: "app-1",
            source: "FLEET_DM",
          }),
        })
      );
    });

    it("should return 0 when no matched device apps", async () => {
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        userId: "user-1",
      } as never);
      vi.mocked(prisma.deviceApp.findMany).mockResolvedValue([]);

      const { syncUserAppAccessFromDevice } = await import("./sync");
      const result = await syncUserAppAccessFromDevice("device-1");

      expect(result).toBe(0);
      expect(prisma.userAppAccess.upsert).not.toHaveBeenCalled();
    });
  });

  describe("getFleetDMClientFromIntegration", () => {
    it("should create client from valid integration", async () => {
      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
        type: "FLEETDM",
        status: "ACTIVE",
        credentials: {
          baseUrl: "https://fleet.example.com",
          apiToken: "test-token",
          teamId: 1,
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null,
        lastError: null,
      });

      const client = await getFleetDMClientFromIntegration("int-1");

      expect(client).not.toBeNull();
      expect(client).toBeDefined();
      expect(FleetDMClient).toHaveBeenCalledWith({
        baseUrl: "https://fleet.example.com",
        apiToken: "test-token",
        teamId: 1,
      });
    });

    it("should return null for non-existent integration", async () => {
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(null);

      const client = await getFleetDMClientFromIntegration("non-existent");

      expect(client).toBeNull();
    });

    it("should return null for non-FLEETDM integration", async () => {
      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        id: "int-1",
        type: "GOOGLE_WORKSPACE",
        credentials: {},
      } as never);

      const client = await getFleetDMClientFromIntegration("int-1");

      expect(client).toBeNull();
    });

    it("should return null for integration without baseUrl", async () => {
      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        id: "int-1",
        type: "FLEETDM",
        credentials: {
          apiToken: "test-token",
        },
      } as never);

      const client = await getFleetDMClientFromIntegration("int-1");

      expect(client).toBeNull();
    });

    it("should return null for integration without apiToken", async () => {
      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        id: "int-1",
        type: "FLEETDM",
        credentials: {
          baseUrl: "https://fleet.example.com",
        },
      } as never);

      const client = await getFleetDMClientFromIntegration("int-1");

      expect(client).toBeNull();
    });
  });

  describe("getFleetDMClientForOrganization", () => {
    it("should return client for active FLEETDM integration", async () => {
      vi.mocked(prisma.integration.findFirst).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
        type: "FLEETDM",
        status: "ACTIVE",
        credentials: {
          baseUrl: "https://fleet.example.com",
          apiToken: "test-token",
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null,
        lastError: null,
      });

      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
        type: "FLEETDM",
        status: "ACTIVE",
        credentials: {
          baseUrl: "https://fleet.example.com",
          apiToken: "test-token",
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null,
        lastError: null,
      });

      const client = await getFleetDMClientForOrganization("org-1");

      expect(prisma.integration.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          type: "FLEETDM",
          status: "ACTIVE",
        },
      });
      expect(client).not.toBeNull();
      expect(client).toBeDefined();
    });

    it("should return null when no active integration exists", async () => {
      vi.mocked(prisma.integration.findFirst).mockResolvedValue(null);

      const client = await getFleetDMClientForOrganization("org-1");

      expect(client).toBeNull();
    });
  });
});
