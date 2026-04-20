// src/actions/reports/registered-app-usage.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock next-intl/server
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// Mock matchDomainPattern
vi.mock("@/lib/utils/domain-extractor", () => ({
  matchDomainPattern: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionWhitelist: {
      findMany: vi.fn(),
    },
    extensionBrowsingLog: {
      findMany: vi.fn(),
    },
    extensionUsage: {
      findMany: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { matchDomainPattern } from "@/lib/utils/domain-extractor";
import {
  getDateRangePresets,
  getRegisteredAppUsageReport,
  getRegisteredAppUsageSummary,
} from "./registered-app-usage";

const mockAuth = vi.mocked(auth);
const mockMatchDomain = vi.mocked(matchDomainPattern);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe("registered-app-usage", () => {
  const mockOrganizationId = "org-1";
  const mockSession = {
    user: {
      id: "user-1",
      organizationId: mockOrganizationId,
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
    mockMatchDomain.mockReturnValue(false);
  });

  describe("getRegisteredAppUsageReport", () => {
    const baseFilters = {
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    };

    it("should return error for unauthenticated user", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getRegisteredAppUsageReport(baseFilters);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error when user has no organizationId", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: null },
      } as never);

      const result = await getRegisteredAppUsageReport(baseFilters);

      expect(result.success).toBe(false);
    });

    it("should return empty data when no whitelists exist", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([]);

      const result = await getRegisteredAppUsageReport(baseFilters);

      expect(result.success).toBe(true);
      expect(result.data?.items).toEqual([]);
      expect(result.data?.total).toBe(0);
      expect(result.data?.summary).toEqual({
        totalVisits: 0,
        uniqueUsers: 0,
        uniqueApps: 0,
        totalDuration: 0,
      });
    });

    it("should return matched browsing logs for registered apps", async () => {
      const whitelists = [{ pattern: "*.slack.com", name: "Slack" }];
      const browsingLogs = [
        {
          id: "log-1",
          url: "https://app.slack.com/messages",
          domain: "app.slack.com",
          ipAddress: "192.168.1.1",
          visitedAt: new Date("2026-01-15T10:00:00Z"),
          userId: "user-1",
          deviceId: "device-1",
          user: { id: "user-1", name: "Alice", email: "alice@test.com" },
        },
      ];
      const apps = [
        {
          id: "app-1",
          name: "Slack",
          customWebsite: "https://slack.com",
          status: "ACTIVE",
          catalog: null,
        },
      ];

      mockPrisma.extensionWhitelist.findMany.mockResolvedValue(whitelists);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue(browsingLogs);
      mockPrisma.app.findMany.mockResolvedValue(apps);
      mockPrisma.extensionUsage.findMany.mockResolvedValue([]);

      // matchDomainPattern returns true for slack pattern
      mockMatchDomain.mockImplementation(
        (pattern: string, domain: string) =>
          pattern === "*.slack.com" && domain === "app.slack.com"
      );

      const result = await getRegisteredAppUsageReport(baseFilters);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].domain).toBe("app.slack.com");
      expect(result.data?.summary.totalVisits).toBe(1);
    });

    it("should handle pagination of matched logs", async () => {
      // Create 3 logs but request page 2 with limit 2
      const whitelists = [{ pattern: "*.example.com", name: "Example" }];
      const logs = Array.from({ length: 3 }, (_, i) => ({
        id: `log-${i}`,
        url: `https://app.example.com/page-${i}`,
        domain: "app.example.com",
        ipAddress: "10.0.0.1",
        visitedAt: new Date(`2026-01-${10 + i}T10:00:00Z`),
        userId: "user-1",
        deviceId: "device-1",
        user: { id: "user-1", name: "Alice", email: "alice@test.com" },
      }));

      mockPrisma.extensionWhitelist.findMany.mockResolvedValue(whitelists);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue(logs);
      mockPrisma.app.findMany.mockResolvedValue([]);
      mockPrisma.extensionUsage.findMany.mockResolvedValue([]);
      mockMatchDomain.mockReturnValue(true);

      const result = await getRegisteredAppUsageReport({
        ...baseFilters,
        page: 2,
        limit: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1); // 3rd item on page 2
      expect(result.data?.total).toBe(3);
      expect(result.data?.totalPages).toBe(2);
      expect(result.data?.page).toBe(2);
    });

    it("should include duration from extensionUsage data", async () => {
      const whitelists = [{ pattern: "*.slack.com", name: "Slack" }];
      const visitDate = new Date("2026-01-15T10:00:00Z");
      const browsingLogs = [
        {
          id: "log-1",
          url: "https://app.slack.com",
          domain: "app.slack.com",
          ipAddress: "10.0.0.1",
          visitedAt: visitDate,
          userId: "user-1",
          deviceId: "device-1",
          user: { id: "user-1", name: "Alice", email: "alice@test.com" },
        },
      ];
      const usageData = [
        {
          deviceId: "device-1",
          domain: "app.slack.com",
          totalSeconds: 3600,
          date: new Date("2026-01-15T00:00:00Z"),
        },
      ];

      mockPrisma.extensionWhitelist.findMany.mockResolvedValue(whitelists);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue(browsingLogs);
      mockPrisma.app.findMany.mockResolvedValue([]);
      mockPrisma.extensionUsage.findMany.mockResolvedValue(usageData);
      mockMatchDomain.mockReturnValue(true);

      const result = await getRegisteredAppUsageReport(baseFilters);

      expect(result.success).toBe(true);
      expect(result.data?.items[0].durationSeconds).toBe(3600);
    });

    it("should apply search filter", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "*.slack.com", name: "Slack" },
      ]);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.app.findMany.mockResolvedValue([]);
      mockPrisma.extensionUsage.findMany.mockResolvedValue([]);

      await getRegisteredAppUsageReport({
        ...baseFilters,
        search: "slack",
      });

      expect(mockPrisma.extensionBrowsingLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { url: { contains: "slack", mode: "insensitive" } },
              { domain: { contains: "slack", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("should apply userId filter", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "*.slack.com", name: "Slack" },
      ]);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.app.findMany.mockResolvedValue([]);
      mockPrisma.extensionUsage.findMany.mockResolvedValue([]);

      await getRegisteredAppUsageReport({
        ...baseFilters,
        userId: "user-42",
      });

      expect(mockPrisma.extensionBrowsingLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-42",
          }),
        })
      );
    });

    it("should filter whitelists by appId when provided", async () => {
      const whitelists = [
        { pattern: "*.slack.com", name: "Slack" },
        { pattern: "*.notion.so", name: "Notion" },
      ];

      mockPrisma.extensionWhitelist.findMany.mockResolvedValue(whitelists);
      mockPrisma.app.findUnique.mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customWebsite: "https://slack.com",
        catalog: null,
      });
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.app.findMany.mockResolvedValue([]);
      mockPrisma.extensionUsage.findMany.mockResolvedValue([]);

      await getRegisteredAppUsageReport({
        ...baseFilters,
        appId: "app-1",
      });

      expect(mockPrisma.app.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "app-1" } })
      );
    });

    it("should return error on unexpected exception", async () => {
      mockPrisma.extensionWhitelist.findMany.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await getRegisteredAppUsageReport(baseFilters);

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB connection failed");
    });

    it("should filter by organizationId for multi-tenant isolation", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([]);

      await getRegisteredAppUsageReport(baseFilters);

      expect(mockPrisma.extensionWhitelist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
          }),
        })
      );
    });
  });

  describe("getRegisteredAppUsageSummary", () => {
    const baseFilters = {
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    };

    it("should return error for unauthenticated user", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getRegisteredAppUsageSummary(baseFilters);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return usage summary grouped by pattern", async () => {
      const whitelists = [
        { pattern: "*.slack.com", name: "Slack" },
        { pattern: "*.notion.so", name: "Notion" },
      ];
      const apps = [
        {
          id: "app-1",
          name: "Slack",
          customWebsite: "https://slack.com",
          catalog: null,
        },
      ];
      const browsingLogs = [
        {
          domain: "app.slack.com",
          userId: "user-1",
          visitedAt: new Date("2026-01-15T10:00:00Z"),
          deviceId: "device-1",
        },
        {
          domain: "app.slack.com",
          userId: "user-2",
          visitedAt: new Date("2026-01-16T12:00:00Z"),
          deviceId: "device-2",
        },
      ];
      const usageData = [
        { deviceId: "device-1", domain: "app.slack.com", totalSeconds: 1800 },
      ];

      mockPrisma.extensionWhitelist.findMany.mockResolvedValue(whitelists);
      mockPrisma.app.findMany.mockResolvedValue(apps);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue(browsingLogs);
      mockPrisma.extensionUsage.findMany.mockResolvedValue(usageData);

      // Only slack pattern matches
      mockMatchDomain.mockImplementation(
        (pattern: string, domain: string) =>
          pattern === "*.slack.com" && domain === "app.slack.com"
      );

      const result = await getRegisteredAppUsageSummary(baseFilters);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Only slack has visits, notion is filtered out (visitCount === 0)
      expect(result.data!.length).toBe(1);
      expect(result.data![0].pattern).toBe("*.slack.com");
      expect(result.data![0].visitCount).toBe(2);
      expect(result.data![0].uniqueUsers).toBe(2);
    });

    it("should return empty array when no patterns have visits", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "*.unused.com", name: "Unused" },
      ]);
      mockPrisma.app.findMany.mockResolvedValue([]);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.extensionUsage.findMany.mockResolvedValue([]);

      const result = await getRegisteredAppUsageSummary(baseFilters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should return error on unexpected exception", async () => {
      mockPrisma.extensionWhitelist.findMany.mockRejectedValue(
        new Error("DB error")
      );

      const result = await getRegisteredAppUsageSummary(baseFilters);

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });

    it("should sort results by visitCount descending", async () => {
      const whitelists = [
        { pattern: "*.low.com", name: "Low" },
        { pattern: "*.high.com", name: "High" },
      ];
      const browsingLogs = [
        {
          domain: "app.low.com",
          userId: "user-1",
          visitedAt: new Date("2026-01-15T10:00:00Z"),
          deviceId: "d1",
        },
        {
          domain: "app.high.com",
          userId: "user-1",
          visitedAt: new Date("2026-01-15T10:00:00Z"),
          deviceId: "d1",
        },
        {
          domain: "app.high.com",
          userId: "user-2",
          visitedAt: new Date("2026-01-16T10:00:00Z"),
          deviceId: "d2",
        },
      ];

      mockPrisma.extensionWhitelist.findMany.mockResolvedValue(whitelists);
      mockPrisma.app.findMany.mockResolvedValue([]);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue(browsingLogs);
      mockPrisma.extensionUsage.findMany.mockResolvedValue([]);

      mockMatchDomain.mockImplementation((pattern: string, domain: string) => {
        if (pattern === "*.low.com" && domain === "app.low.com") return true;
        if (pattern === "*.high.com" && domain === "app.high.com") return true;
        return false;
      });

      const result = await getRegisteredAppUsageSummary(baseFilters);

      expect(result.success).toBe(true);
      expect(result.data![0].pattern).toBe("*.high.com");
      expect(result.data![0].visitCount).toBe(2);
      expect(result.data![1].pattern).toBe("*.low.com");
      expect(result.data![1].visitCount).toBe(1);
    });
  });

  describe("getDateRangePresets", () => {
    it("should return 4 date range presets", async () => {
      const result = await getDateRangePresets();

      expect(result).toHaveLength(4);
      expect(result.map((p) => p.value)).toEqual(["today", "7d", "30d", "90d"]);
    });

    it("should have valid date ranges with startDate before endDate", async () => {
      const result = await getDateRangePresets();

      for (const preset of result) {
        expect(preset.startDate).toBeInstanceOf(Date);
        expect(preset.endDate).toBeInstanceOf(Date);
        expect(preset.startDate.getTime()).toBeLessThanOrEqual(
          preset.endDate.getTime()
        );
      }
    });

    it("should have label values matching translation keys", async () => {
      const result = await getDateRangePresets();

      expect(result[0].label).toBe("today");
      expect(result[1].label).toBe("7d");
      expect(result[2].label).toBe("30d");
      expect(result[3].label).toBe("90d");
    });
  });
});
