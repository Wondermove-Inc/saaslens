// FleetDM Webhook Tests
import crypto from "crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FleetDMHost,
  FleetDMHostWebhookData,
  FleetDMSoftware,
  FleetDMSoftwareWebhookData,
} from "./types";
import {
  getOrganizationIdFromWebhook,
  handleHostEvent,
  handleSoftwareEvent,
  logWebhookEvent,
  parseWebhookEventType,
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

// Mock console.log for logWebhookEvent
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

describe("FleetDM Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifyWebhookSignature", () => {
    const secret = "test-webhook-secret";

    it("should return true for valid signature", () => {
      const payload = '{"type":"host.created","data":{}}';
      // Pre-computed HMAC-SHA256 signature for this payload and secret
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = verifyWebhookSignature(payload, expectedSignature, secret);

      expect(result).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const payload = '{"type":"host.created","data":{}}';
      const invalidSignature = "invalid-signature-that-does-not-match";

      const result = verifyWebhookSignature(payload, invalidSignature, secret);

      expect(result).toBe(false);
    });

    it("should return false when signature is null", () => {
      const payload = '{"type":"host.created","data":{}}';

      const result = verifyWebhookSignature(payload, null, secret);

      expect(result).toBe(false);
    });

    it("should return false when secret is empty", () => {
      const payload = '{"type":"host.created","data":{}}';
      const signature = "some-signature";

      const result = verifyWebhookSignature(payload, signature, "");

      expect(result).toBe(false);
    });

    it("should handle buffer length mismatch gracefully", () => {
      const payload = '{"type":"host.created","data":{}}';
      const shortSignature = "abc"; // Very short, will cause length mismatch

      const result = verifyWebhookSignature(payload, shortSignature, secret);

      expect(result).toBe(false);
    });
  });

  describe("parseWebhookEventType", () => {
    it("should parse valid host.created event", () => {
      const result = parseWebhookEventType("host.created");
      expect(result).toBe("host.created");
    });

    it("should parse valid host.updated event", () => {
      const result = parseWebhookEventType("host.updated");
      expect(result).toBe("host.updated");
    });

    it("should parse valid host.deleted event", () => {
      const result = parseWebhookEventType("host.deleted");
      expect(result).toBe("host.deleted");
    });

    it("should parse valid host.enrolled event", () => {
      const result = parseWebhookEventType("host.enrolled");
      expect(result).toBe("host.enrolled");
    });

    it("should parse valid host.unenrolled event", () => {
      const result = parseWebhookEventType("host.unenrolled");
      expect(result).toBe("host.unenrolled");
    });

    it("should parse valid software.installed event", () => {
      const result = parseWebhookEventType("software.installed");
      expect(result).toBe("software.installed");
    });

    it("should parse valid software.removed event", () => {
      const result = parseWebhookEventType("software.removed");
      expect(result).toBe("software.removed");
    });

    it("should parse valid vulnerability.detected event", () => {
      const result = parseWebhookEventType("vulnerability.detected");
      expect(result).toBe("vulnerability.detected");
    });

    it("should parse valid policy.failed event", () => {
      const result = parseWebhookEventType("policy.failed");
      expect(result).toBe("policy.failed");
    });

    it("should return null for invalid event type", () => {
      const result = parseWebhookEventType("invalid.event");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = parseWebhookEventType("");
      expect(result).toBeNull();
    });
  });

  describe("handleHostEvent", () => {
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

    const mockData: FleetDMHostWebhookData = { host: mockHost };

    it("should upsert device for host.created event", async () => {
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

      await handleHostEvent("host.created", mockData, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId_fleetId: {
              organizationId,
              fleetId: "1",
            },
          },
          create: expect.objectContaining({
            hostname: mockHost.hostname,
          }),
        })
      );
    });

    it("should upsert device for host.enrolled event", async () => {
      vi.mocked(prisma.device.upsert).mockResolvedValue({} as never);

      await handleHostEvent("host.enrolled", mockData, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalled();
    });

    it("should upsert device for host.updated event", async () => {
      vi.mocked(prisma.device.upsert).mockResolvedValue({} as never);

      await handleHostEvent("host.updated", mockData, organizationId);

      expect(prisma.device.upsert).toHaveBeenCalled();
    });

    it("should mark device as retired for host.deleted event", async () => {
      vi.mocked(prisma.device.updateMany).mockResolvedValue({ count: 1 });

      await handleHostEvent("host.deleted", mockData, organizationId);

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

    it("should mark device as retired for host.unenrolled event", async () => {
      vi.mocked(prisma.device.updateMany).mockResolvedValue({ count: 1 });

      await handleHostEvent("host.unenrolled", mockData, organizationId);

      expect(prisma.device.updateMany).toHaveBeenCalled();
    });
  });

  describe("handleSoftwareEvent", () => {
    const organizationId = "org-123";
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
    ];

    const mockData: FleetDMSoftwareWebhookData = {
      host_id: 1,
      software: mockSoftware,
    };

    it("should upsert software for software.installed event", async () => {
      vi.mocked(prisma.device.findFirst).mockResolvedValue({
        id: "device-1",
        organizationId,
        fleetId: "1",
        hostname: "test-device",
        platform: "MACOS",
        osVersion: "macOS 14.0",
        hardwareModel: "MacBook Pro",
        hardwareSerial: "ABC123",
        status: "ONLINE",
        lastSeenAt: new Date(),
        enrolledAt: new Date(),
        agentVersion: "5.0.0",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.deviceApp.upsert).mockResolvedValue({} as never);

      await handleSoftwareEvent("software.installed", mockData, organizationId);

      expect(prisma.device.findFirst).toHaveBeenCalledWith({
        where: {
          fleetId: "1",
          organizationId,
        },
      });

      expect(prisma.deviceApp.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deviceId_name_version: {
              deviceId: "device-1",
              name: "Visual Studio Code",
              version: "1.85.0",
            },
          },
        })
      );
    });

    it("should delete software for software.removed event", async () => {
      vi.mocked(prisma.device.findFirst).mockResolvedValue({
        id: "device-1",
      } as never);
      vi.mocked(prisma.deviceApp.deleteMany).mockResolvedValue({ count: 1 });

      await handleSoftwareEvent("software.removed", mockData, organizationId);

      expect(prisma.deviceApp.deleteMany).toHaveBeenCalledWith({
        where: {
          deviceId: "device-1",
          name: "Visual Studio Code",
          version: "1.85.0",
        },
      });
    });

    it("should log warning and return early when device not found", async () => {
      vi.mocked(prisma.device.findFirst).mockResolvedValue(null);

      await handleSoftwareEvent("software.installed", mockData, organizationId);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Device not found for host_id: 1")
      );
      expect(prisma.deviceApp.upsert).not.toHaveBeenCalled();
    });
  });

  describe("getOrganizationIdFromWebhook", () => {
    it("should return organizationId from default integration when no teamId", async () => {
      vi.mocked(prisma.integration.findFirst).mockResolvedValue({
        id: "int-1",
        organizationId: "org-default",
        type: "FLEETDM",
        status: "ACTIVE",
        credentials: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null,
        lastError: null,
      });

      const result = await getOrganizationIdFromWebhook();

      expect(prisma.integration.findFirst).toHaveBeenCalledWith({
        where: {
          type: "FLEETDM",
          status: "ACTIVE",
        },
        select: { organizationId: true },
      });
      expect(result).toBe("org-default");
    });

    it("should return organizationId from team-specific integration", async () => {
      vi.mocked(prisma.integration.findFirst).mockResolvedValue({
        id: "int-2",
        organizationId: "org-team-1",
        type: "FLEETDM",
        status: "ACTIVE",
        credentials: { teamId: 1 },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null,
        lastError: null,
      });

      const result = await getOrganizationIdFromWebhook(1);

      expect(prisma.integration.findFirst).toHaveBeenCalledWith({
        where: {
          type: "FLEETDM",
          status: "ACTIVE",
          credentials: {
            path: ["teamId"],
            equals: 1,
          },
        },
        select: { organizationId: true },
      });
      expect(result).toBe("org-team-1");
    });

    it("should return null when no integration found", async () => {
      vi.mocked(prisma.integration.findFirst).mockResolvedValue(null);

      const result = await getOrganizationIdFromWebhook();

      expect(result).toBeNull();
    });
  });

  describe("logWebhookEvent", () => {
    it("should log successful event", async () => {
      await logWebhookEvent("host.created", true);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[FleetDM Webhook] host.created: success"
      );
    });

    it("should log failed event with error message", async () => {
      await logWebhookEvent("host.created", false, "Connection timeout");

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[FleetDM Webhook] host.created: failed - Connection timeout"
      );
    });

    it("should log failed event without error message", async () => {
      await logWebhookEvent("software.installed", false);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[FleetDM Webhook] software.installed: failed"
      );
    });
  });
});
