// src/types/extension.test.ts
// RED Phase: TypeScript 타입과 Zod schema 검증 테스트
import { describe, expect, it } from "vitest";
import type {
  CreateBlacklistInput,
  CreateWhitelistInput,
  DomainDetailData,
  DomainLoginItem,
  ExtensionBlacklistItem,
  ExtensionBuildItem,
  ExtensionConfigItem,
  ExtensionDashboardStats,
  ExtensionDeviceItem,
  ExtensionUsageItem,
  ExtensionWhitelistItem,
  LoginEventDetail,
  UpdateBlacklistInput,
  UpdateConfigInput,
  UpdateDeviceStatusInput,
  UpdateWhitelistInput,
  UsageAnalyticsData,
  UsageAnalyticsPeriod,
} from "./extension";
import {
  createBlacklistSchema,
  createWhitelistSchema,
  triggerBuildSchema,
  updateBlacklistSchema,
  updateConfigSchema,
  updateDeviceStatusSchema,
  updateWhitelistSchema,
} from "./extension";

describe("Extension Types", () => {
  describe("ExtensionWhitelistItem", () => {
    it("should have required properties", () => {
      const item: ExtensionWhitelistItem = {
        id: "test-id",
        organizationId: "org-id",
        pattern: "*.example.com",
        name: "Example Domain",
        enabled: true,
        source: "MANUAL",
        addedAt: new Date(),
        updatedAt: new Date(),
      };
      expect(item).toBeDefined();
      expect(item.id).toBe("test-id");
      expect(item.pattern).toBe("*.example.com");
    });
  });

  describe("ExtensionBlacklistItem", () => {
    it("should have required properties", () => {
      const item: ExtensionBlacklistItem = {
        id: "test-id",
        organizationId: "org-id",
        pattern: "*.badsite.com",
        name: "Bad Site",
        reason: "Malicious",
        enabled: true,
        addedAt: new Date(),
        updatedAt: new Date(),
      };
      expect(item).toBeDefined();
      expect(item.reason).toBe("Malicious");
    });
  });

  describe("ExtensionConfigItem", () => {
    it("should have required properties", () => {
      const item: ExtensionConfigItem = {
        id: "test-id",
        organizationId: "org-id",
        configKey: "sync_interval_minutes",
        configValue: "5",
        category: "SYNC_INTERVALS",
        valueType: "NUMBER",
        description: "Sync interval in minutes",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(item).toBeDefined();
      expect(item.configKey).toBe("sync_interval_minutes");
    });
  });

  describe("ExtensionBuildItem", () => {
    it("should have required properties", () => {
      const item: ExtensionBuildItem = {
        id: "test-id",
        organizationId: "org-id",
        version: "1.0.0",
        platform: "CHROME",
        status: "COMPLETED",
        serverUrl: "https://api.example.com",
        downloadUrl: "https://cdn.example.com/extension.zip",
        checksum: "abc123",
        fileSize: 1024000,
        buildLog: "Build successful",
        errorMessage: null,
        createdAt: new Date(),
        completedAt: new Date(),
      };
      expect(item).toBeDefined();
      expect(item.version).toBe("1.0.0");
    });
  });
});

describe("Extension Input Types", () => {
  describe("CreateWhitelistInput", () => {
    it("should accept valid input", () => {
      const input: CreateWhitelistInput = {
        pattern: "*.example.com",
        name: "Example",
        source: "MANUAL",
      };
      expect(input).toBeDefined();
    });

    it("should allow optional source field", () => {
      const input: CreateWhitelistInput = {
        pattern: "*.example.com",
        name: "Example",
      };
      expect(input).toBeDefined();
    });
  });

  describe("UpdateWhitelistInput", () => {
    it("should accept partial fields", () => {
      const input: UpdateWhitelistInput = {
        enabled: false,
      };
      expect(input).toBeDefined();
    });
  });

  describe("CreateBlacklistInput", () => {
    it("should accept valid input", () => {
      const input: CreateBlacklistInput = {
        pattern: "*.badsite.com",
        name: "Bad Site",
        reason: "Malicious",
      };
      expect(input).toBeDefined();
    });
  });

  describe("UpdateBlacklistInput", () => {
    it("should accept partial fields", () => {
      const input: UpdateBlacklistInput = {
        reason: "Updated reason",
      };
      expect(input).toBeDefined();
    });
  });

  describe("UpdateConfigInput", () => {
    it("should accept required fields", () => {
      const input: UpdateConfigInput = {
        configKey: "sync_interval_minutes",
        configValue: "10",
      };
      expect(input).toBeDefined();
    });
  });
});

describe("Extension Zod Schemas", () => {
  describe("createWhitelistSchema", () => {
    it("should validate valid whitelist input", () => {
      const result = createWhitelistSchema.safeParse({
        pattern: "*.example.com",
        name: "Example",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty pattern", () => {
      const result = createWhitelistSchema.safeParse({
        pattern: "",
        name: "Example",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const result = createWhitelistSchema.safeParse({
        pattern: "*.example.com",
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid source enum", () => {
      const result = createWhitelistSchema.safeParse({
        pattern: "*.example.com",
        name: "Example",
        source: "GOOGLE_SYNC",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid source enum", () => {
      const result = createWhitelistSchema.safeParse({
        pattern: "*.example.com",
        name: "Example",
        source: "INVALID_SOURCE",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateWhitelistSchema", () => {
    it("should validate partial updates", () => {
      const result = updateWhitelistSchema.safeParse({
        enabled: false,
      });
      expect(result.success).toBe(true);
    });

    it("should validate pattern update", () => {
      const result = updateWhitelistSchema.safeParse({
        pattern: "*.newdomain.com",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createBlacklistSchema", () => {
    it("should validate valid blacklist input", () => {
      const result = createBlacklistSchema.safeParse({
        pattern: "*.badsite.com",
        name: "Bad Site",
      });
      expect(result.success).toBe(true);
    });

    it("should accept optional reason", () => {
      const result = createBlacklistSchema.safeParse({
        pattern: "*.badsite.com",
        name: "Bad Site",
        reason: "Malicious content",
      });
      expect(result.success).toBe(true);
    });

    it("should reject if reason exceeds max length", () => {
      const result = createBlacklistSchema.safeParse({
        pattern: "*.badsite.com",
        name: "Bad Site",
        reason: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateBlacklistSchema", () => {
    it("should validate partial updates", () => {
      const result = updateBlacklistSchema.safeParse({
        reason: "Updated reason",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateConfigSchema", () => {
    it("should validate config update", () => {
      const result = updateConfigSchema.safeParse({
        configKey: "sync_interval_minutes",
        configValue: "10",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty configKey", () => {
      const result = updateConfigSchema.safeParse({
        configKey: "",
        configValue: "10",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty configValue", () => {
      const result = updateConfigSchema.safeParse({
        configKey: "sync_interval_minutes",
        configValue: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("triggerBuildSchema", () => {
    it("should validate valid platform", () => {
      const result = triggerBuildSchema.safeParse({
        platform: "CHROME",
      });
      expect(result.success).toBe(true);
    });

    it("should validate all platform types", () => {
      const platforms = [
        "CHROME",
        "WINDOWS_EXE",
        "WINDOWS_MSI",
        "MAC_PKG",
        "MAC_DMG",
      ];

      platforms.forEach((platform) => {
        const result = triggerBuildSchema.safeParse({ platform });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid platform", () => {
      const result = triggerBuildSchema.safeParse({
        platform: "INVALID_PLATFORM",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateDeviceStatusSchema", () => {
    it("should validate valid status", () => {
      const result = updateDeviceStatusSchema.safeParse({
        status: "APPROVED",
      });
      expect(result.success).toBe(true);
    });

    it("should validate REVOKED status", () => {
      const result = updateDeviceStatusSchema.safeParse({
        status: "REVOKED",
      });
      expect(result.success).toBe(true);
    });

    it("should reject PENDING status (not allowed for update)", () => {
      const result = updateDeviceStatusSchema.safeParse({
        status: "PENDING",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid status", () => {
      const result = updateDeviceStatusSchema.safeParse({
        status: "INVALID_STATUS",
      });
      expect(result.success).toBe(false);
    });
  });
});

// ==================== Extension Usage & Device Types ====================

describe("Extension Usage Types", () => {
  describe("ExtensionUsageItem", () => {
    it("should have required properties", () => {
      const item: ExtensionUsageItem = {
        id: "usage-1",
        organizationId: "org-1",
        deviceId: "device-1",
        domain: "slack.com",
        visitCount: 10,
        totalSeconds: 3600,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(item).toBeDefined();
      expect(item.domain).toBe("slack.com");
      expect(item.totalSeconds).toBe(3600);
    });
  });

  describe("UsageAnalyticsPeriod", () => {
    it("should accept valid periods", () => {
      const periods: UsageAnalyticsPeriod[] = ["today", "week", "month"];
      periods.forEach((period) => {
        expect(["today", "week", "month"]).toContain(period);
      });
    });
  });

  describe("UsageAnalyticsData", () => {
    it("should have required properties (login-based)", () => {
      const data: UsageAnalyticsData = {
        period: "today",
        totalLogins: 50,
        uniqueUsers: 10,
        uniqueDevices: 15,
        topDomains: [
          {
            domain: "slack.com",
            loginCount: 20,
            uniqueUsers: 5,
            uniqueDevices: 8,
          },
          {
            domain: "notion.so",
            loginCount: 15,
            uniqueUsers: 4,
            uniqueDevices: 6,
          },
        ],
      };
      expect(data).toBeDefined();
      expect(data.topDomains.length).toBe(2);
      expect(data.totalLogins).toBe(50);
    });
  });

  describe("DomainLoginItem", () => {
    it("should have required login-based properties", () => {
      const item: DomainLoginItem = {
        domain: "slack.com",
        loginCount: 25,
        uniqueUsers: 10,
        uniqueDevices: 12,
      };
      expect(item.domain).toBe("slack.com");
      expect(item.loginCount).toBe(25);
      expect(item.uniqueUsers).toBe(10);
      expect(item.uniqueDevices).toBe(12);
    });
  });

  describe("LoginEventDetail", () => {
    it("should have required properties", () => {
      const event: LoginEventDetail = {
        id: "event-1",
        domain: "slack.com",
        username: "user@test.com",
        userName: "Test User",
        userEmail: "user@test.com",
        authType: "PASSWORD",
        capturedAt: new Date(),
        deviceId: "device-1",
      };
      expect(event.id).toBe("event-1");
      expect(event.authType).toBe("PASSWORD");
    });

    it("should accept all valid auth types", () => {
      const authTypes: LoginEventDetail["authType"][] = [
        "PASSWORD",
        "MAGIC_LINK",
        "OAUTH",
        "SSO",
      ];
      authTypes.forEach((authType) => {
        const event: LoginEventDetail = {
          id: "event-1",
          domain: "slack.com",
          username: "user@test.com",
          userName: null,
          userEmail: null,
          authType,
          capturedAt: new Date(),
          deviceId: "device-1",
        };
        expect(event.authType).toBe(authType);
      });
    });
  });

  describe("DomainDetailData", () => {
    it("should have required properties with events", () => {
      const data: DomainDetailData = {
        domain: "slack.com",
        loginCount: 5,
        uniqueUsers: 3,
        uniqueDevices: 4,
        events: [
          {
            id: "event-1",
            domain: "slack.com",
            username: "user1@test.com",
            userName: "User One",
            userEmail: "user1@test.com",
            authType: "PASSWORD",
            capturedAt: new Date(),
            deviceId: "device-1",
          },
          {
            id: "event-2",
            domain: "slack.com",
            username: "user2@test.com",
            userName: null,
            userEmail: null,
            authType: "OAUTH",
            capturedAt: new Date(),
            deviceId: "device-2",
          },
        ],
      };
      expect(data.domain).toBe("slack.com");
      expect(data.events.length).toBe(2);
      expect(data.loginCount).toBe(5);
    });
  });
});

describe("Extension Device Types", () => {
  describe("ExtensionDeviceItem", () => {
    it("should have required properties", () => {
      const item: ExtensionDeviceItem = {
        id: "device-1",
        organizationId: "org-1",
        deviceKey: "abc123-def456",
        browserInfo: "Chrome 120.0",
        osInfo: "macOS 14.0",
        extensionVersion: "1.0.0",
        status: "APPROVED",
        lastSeenAt: new Date(),
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(item).toBeDefined();
      expect(item.deviceKey).toBe("abc123-def456");
      expect(item.status).toBe("APPROVED");
    });

    it("should accept null user", () => {
      const item: ExtensionDeviceItem = {
        id: "device-2",
        organizationId: "org-1",
        deviceKey: "xyz789",
        browserInfo: null,
        osInfo: null,
        extensionVersion: null,
        status: "PENDING",
        lastSeenAt: null,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(item).toBeDefined();
      expect(item.userId).toBeNull();
    });
  });

  describe("UpdateDeviceStatusInput", () => {
    it("should accept APPROVED status", () => {
      const input: UpdateDeviceStatusInput = {
        status: "APPROVED",
      };
      expect(input).toBeDefined();
      expect(input.status).toBe("APPROVED");
    });

    it("should accept REVOKED status", () => {
      const input: UpdateDeviceStatusInput = {
        status: "REVOKED",
      };
      expect(input).toBeDefined();
      expect(input.status).toBe("REVOKED");
    });
  });
});

describe("Extension Dashboard Stats", () => {
  describe("ExtensionDashboardStats", () => {
    it("should have required properties", () => {
      const stats: ExtensionDashboardStats = {
        activeDevices: 25,
        inactiveDevices: 5,
        blockedSitesCount: 10,
        trackedSitesCount: 150,
        totalUsageTimeToday: 86400,
        syncStatus: {
          blacklist: {
            lastSync: new Date(),
            status: "success",
          },
          whitelist: {
            lastSync: new Date(),
            status: "success",
          },
          usageData: {
            lastSync: null,
            status: "pending",
          },
        },
      };
      expect(stats).toBeDefined();
      expect(stats.activeDevices).toBe(25);
      expect(stats.syncStatus.blacklist.status).toBe("success");
    });
  });
});
