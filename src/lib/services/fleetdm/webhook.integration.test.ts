// FleetDM Webhook Integration Tests
// Tests webhook handling with simulated FleetDM events
//
// Run with: npm test -- src/lib/services/fleetdm/webhook.integration.test.ts

import crypto from "crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FleetDMHost,
  FleetDMHostWebhookData,
  FleetDMSoftware,
  FleetDMSoftwareWebhookData,
} from "./types";
import {
  handleHostEvent,
  handleSoftwareEvent,
  verifyWebhookSignature,
} from "./webhook";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    device: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    deviceApp: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    integration: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

describe("FleetDM Webhook Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Host Lifecycle Events", () => {
    const organizationId = "org-test-123";

    const createMockHost = (
      overrides: Partial<FleetDMHost> = {}
    ): FleetDMHost => ({
      id: 1,
      uuid: "uuid-test-001",
      hostname: "test-macbook-pro",
      display_name: "Test MacBook Pro",
      platform: "darwin",
      osquery_version: "5.10.0",
      os_version: "macOS 14.2.1",
      build: "23C71",
      platform_like: "darwin",
      code_name: "sonoma",
      uptime: 86400,
      memory: 17179869184, // 16GB
      cpu_type: "arm64e",
      cpu_subtype: "",
      cpu_brand: "Apple M2 Pro",
      cpu_physical_cores: 10,
      cpu_logical_cores: 10,
      hardware_vendor: "Apple Inc.",
      hardware_model: "MacBook Pro (14-inch, 2023)",
      hardware_version: "Mac14,9",
      hardware_serial: "ABC123DEF456",
      computer_name: "Test MacBook Pro",
      public_ip: "203.0.113.1",
      primary_ip: "192.168.1.100",
      primary_mac: "00:00:00:00:00:01",
      distributed_interval: 10,
      config_tls_refresh: 10,
      logger_tls_period: 10,
      team_id: null,
      pack_stats: null,
      status: "online",
      detail_updated_at: new Date().toISOString(),
      label_updated_at: new Date().toISOString(),
      policy_updated_at: new Date().toISOString(),
      last_enrolled_at: new Date().toISOString(),
      seen_time: new Date().toISOString(),
      refetch_requested: false,
      mdm: {
        enrollment_status: null,
        server_url: null,
        name: null,
      },
      software_updated_at: new Date().toISOString(),
      ...overrides,
    });

    it("should handle complete host.enrolled lifecycle", async () => {
      const host = createMockHost();
      const data: FleetDMHostWebhookData = { host };

      vi.mocked(prisma.device.upsert).mockResolvedValue({
        id: "device-001",
        organizationId,
        fleetId: "1",
        hostname: host.hostname,
        platform: "MACOS",
        osVersion: host.os_version,
        hardwareModel: host.hardware_model,
        hardwareSerial: host.hardware_serial,
        status: "ONLINE",
        lastSeenAt: new Date(),
        enrolledAt: new Date(),
        agentVersion: host.osquery_version,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await handleHostEvent("host.enrolled", data, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId_fleetId: {
              organizationId,
              fleetId: "1",
            },
          },
          create: expect.objectContaining({
            organizationId,
            fleetId: "1",
            hostname: "test-macbook-pro",
            platform: "MACOS",
            osVersion: "macOS 14.2.1",
            hardwareModel: "MacBook Pro (14-inch, 2023)",
            hardwareSerial: "ABC123DEF456",
            status: "ONLINE",
          }),
        })
      );
    });

    it("should handle host.updated with status change", async () => {
      const host = createMockHost({ status: "offline" });
      const data: FleetDMHostWebhookData = { host };

      vi.mocked(prisma.device.upsert).mockResolvedValue({} as never);

      await handleHostEvent("host.updated", data, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: "OFFLINE",
          }),
          update: expect.objectContaining({
            status: "OFFLINE",
          }),
        })
      );
    });

    it("should handle host.unenrolled and retire device", async () => {
      const host = createMockHost();
      const data: FleetDMHostWebhookData = { host };

      vi.mocked(prisma.device.updateMany).mockResolvedValue({ count: 1 });

      await handleHostEvent("host.unenrolled", data, organizationId);

      expect(prisma.device.updateMany).toHaveBeenCalledWith({
        where: {
          fleetId: "1",
          organizationId,
        },
        data: {
          status: "RETIRED",
          updatedAt: expect.any(Date),
        },
      });
    });

    it("should handle Windows host correctly", async () => {
      const host = createMockHost({
        platform: "windows",
        os_version: "Microsoft Windows 11 Pro 23H2",
        hardware_vendor: "Dell Inc.",
        hardware_model: "XPS 15 9530",
      });
      const data: FleetDMHostWebhookData = { host };

      vi.mocked(prisma.device.upsert).mockResolvedValue({} as never);

      await handleHostEvent("host.created", data, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            platform: "WINDOWS",
            osVersion: "Microsoft Windows 11 Pro 23H2",
            hardwareModel: "XPS 15 9530",
          }),
        })
      );
    });

    it("should handle Linux host correctly", async () => {
      const host = createMockHost({
        platform: "ubuntu",
        platform_like: "debian",
        os_version: "Ubuntu 22.04.3 LTS",
        hardware_vendor: "Lenovo",
        hardware_model: "ThinkPad X1 Carbon Gen 11",
      });
      const data: FleetDMHostWebhookData = { host };

      vi.mocked(prisma.device.upsert).mockResolvedValue({} as never);

      await handleHostEvent("host.created", data, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            platform: "LINUX",
          }),
        })
      );
    });
  });

  describe("Software Lifecycle Events", () => {
    const organizationId = "org-test-123";

    const createMockSoftware = (
      overrides: Partial<FleetDMSoftware> = {}
    ): FleetDMSoftware => ({
      id: 100,
      name: "Visual Studio Code",
      version: "1.85.2",
      source: "apps",
      bundle_identifier: "com.microsoft.VSCode",
      extension_id: null,
      browser: null,
      generated_cpe:
        "cpe:2.3:a:microsoft:visual_studio_code:1.85.2:*:*:*:*:macos:*:*",
      vulnerabilities: null,
      hosts_count: 1,
      ...overrides,
    });

    it("should handle software.installed event", async () => {
      const software = [
        createMockSoftware(),
        createMockSoftware({
          id: 101,
          name: "Slack",
          version: "4.35.126",
          bundle_identifier: "com.tinyspeck.slackmacgap",
        }),
      ];

      const data: FleetDMSoftwareWebhookData = {
        host_id: 1,
        software,
      };

      vi.mocked(prisma.device.findFirst).mockResolvedValue({
        id: "device-001",
        organizationId,
        fleetId: "1",
        hostname: "test-device",
        platform: "MACOS",
        osVersion: "macOS 14.2.1",
        hardwareModel: "MacBook Pro",
        hardwareSerial: "ABC123",
        status: "ONLINE",
        lastSeenAt: new Date(),
        enrolledAt: new Date(),
        agentVersion: "5.10.0",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.deviceApp.upsert).mockResolvedValue({} as never);

      await handleSoftwareEvent("software.installed", data, organizationId);

      expect(prisma.deviceApp.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.deviceApp.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deviceId_name_version: {
              deviceId: "device-001",
              name: "Visual Studio Code",
              version: "1.85.2",
            },
          },
        })
      );
    });

    it("should handle software.removed event", async () => {
      const software = [createMockSoftware()];
      const data: FleetDMSoftwareWebhookData = {
        host_id: 1,
        software,
      };

      vi.mocked(prisma.device.findFirst).mockResolvedValue({
        id: "device-001",
      } as never);
      vi.mocked(prisma.deviceApp.deleteMany).mockResolvedValue({ count: 1 });

      await handleSoftwareEvent("software.removed", data, organizationId);

      expect(prisma.deviceApp.deleteMany).toHaveBeenCalledWith({
        where: {
          deviceId: "device-001",
          name: "Visual Studio Code",
          version: "1.85.2",
        },
      });
    });

    it("should handle software with vulnerabilities", async () => {
      const software = [
        createMockSoftware({
          vulnerabilities: [
            {
              cve: "CVE-2024-0001",
              details_link: "https://nvd.nist.gov/vuln/detail/CVE-2024-0001",
              cvss_score: 7.5,
              epss_probability: 0.02,
              cisa_known_exploit: false,
              cve_published: "2024-01-15T00:00:00Z",
            },
          ],
        }),
      ];

      const data: FleetDMSoftwareWebhookData = {
        host_id: 1,
        software,
      };

      vi.mocked(prisma.device.findFirst).mockResolvedValue({
        id: "device-001",
      } as never);
      vi.mocked(prisma.deviceApp.upsert).mockResolvedValue({} as never);

      await handleSoftwareEvent("software.installed", data, organizationId);

      // Software is still created, vulnerabilities can be processed separately
      expect(prisma.deviceApp.upsert).toHaveBeenCalled();
    });
  });

  describe("Webhook Signature Verification", () => {
    const webhookSecret = "test-webhook-secret-12345";

    it("should verify valid HMAC-SHA256 signature", () => {
      const payload = JSON.stringify({
        type: "host.created",
        data: { host: { id: 1, hostname: "test" } },
      });

      // Generate valid signature
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      const result = verifyWebhookSignature(payload, signature, webhookSecret);
      expect(result).toBe(true);
    });

    it("should reject tampered payload", () => {
      const originalPayload = JSON.stringify({
        type: "host.created",
        data: { host: { id: 1, hostname: "test" } },
      });

      const tamperedPayload = JSON.stringify({
        type: "host.created",
        data: { host: { id: 1, hostname: "tampered" } },
      });

      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(originalPayload)
        .digest("hex");

      const result = verifyWebhookSignature(
        tamperedPayload,
        signature,
        webhookSecret
      );
      expect(result).toBe(false);
    });

    it("should reject replay attack with different secret", () => {
      const payload = JSON.stringify({ type: "host.created", data: {} });

      const signature = crypto
        .createHmac("sha256", "attacker-secret")
        .update(payload)
        .digest("hex");

      const result = verifyWebhookSignature(payload, signature, webhookSecret);
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    const organizationId = "org-test-123";

    it("should handle host with minimal data", async () => {
      const minimalHost: FleetDMHost = {
        id: 999,
        uuid: "minimal-uuid",
        hostname: "",
        display_name: "Minimal Device",
        platform: "darwin",
        osquery_version: "5.0.0",
        os_version: "",
        build: "",
        platform_like: "",
        code_name: "",
        uptime: 0,
        memory: 0,
        cpu_type: "",
        cpu_subtype: "",
        cpu_brand: "",
        cpu_physical_cores: 0,
        cpu_logical_cores: 0,
        hardware_vendor: "",
        hardware_model: "",
        hardware_version: "",
        hardware_serial: "",
        computer_name: "",
        public_ip: "",
        primary_ip: "",
        primary_mac: "",
        distributed_interval: 0,
        config_tls_refresh: 0,
        logger_tls_period: 0,
        team_id: null,
        pack_stats: null,
        status: "online",
        detail_updated_at: "",
        label_updated_at: "",
        policy_updated_at: "",
        last_enrolled_at: "",
        seen_time: "",
        refetch_requested: false,
        mdm: {
          enrollment_status: null,
          server_url: null,
          name: null,
        },
        software_updated_at: "",
      };

      vi.mocked(prisma.device.upsert).mockResolvedValue({} as never);

      await handleHostEvent(
        "host.created",
        { host: minimalHost },
        organizationId
      );

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            hostname: "Minimal Device", // Falls back to display_name
            fleetId: "999",
          }),
        })
      );
    });

    it("should handle software with empty array", async () => {
      const data: FleetDMSoftwareWebhookData = {
        host_id: 1,
        software: [],
      };

      vi.mocked(prisma.device.findFirst).mockResolvedValue({
        id: "device-001",
      } as never);

      await handleSoftwareEvent("software.installed", data, organizationId);

      expect(prisma.deviceApp.upsert).not.toHaveBeenCalled();
    });

    it("should handle unknown platform gracefully", async () => {
      const host: FleetDMHost = {
        id: 1,
        uuid: "uuid-1",
        hostname: "unknown-device",
        display_name: "Unknown Device",
        platform: "freebsd",
        osquery_version: "5.0.0",
        os_version: "FreeBSD 14.0",
        build: "",
        platform_like: "",
        code_name: "",
        uptime: 0,
        memory: 0,
        cpu_type: "",
        cpu_subtype: "",
        cpu_brand: "",
        cpu_physical_cores: 0,
        cpu_logical_cores: 0,
        hardware_vendor: "",
        hardware_model: "",
        hardware_version: "",
        hardware_serial: "",
        computer_name: "",
        public_ip: "",
        primary_ip: "",
        primary_mac: "",
        distributed_interval: 0,
        config_tls_refresh: 0,
        logger_tls_period: 0,
        team_id: null,
        pack_stats: null,
        status: "online",
        detail_updated_at: "",
        label_updated_at: "",
        policy_updated_at: "",
        last_enrolled_at: "",
        seen_time: "",
        refetch_requested: false,
        mdm: {
          enrollment_status: null,
          server_url: null,
          name: null,
        },
        software_updated_at: "",
      };

      vi.mocked(prisma.device.upsert).mockResolvedValue({} as never);

      await handleHostEvent("host.created", { host }, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            platform: "OTHER", // Unknown platforms should map to OTHER
          }),
        })
      );
    });
  });
});
