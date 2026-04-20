// src/actions/reports/browsing-usage.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock withLogging as passthrough
vi.mock("@/lib/logging", () => ({
  withLogging: (_name: string, fn: unknown) => fn,
}));

// Mock requireOrganization
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

// Mock next-intl/server
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionBrowsingLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { getBrowsingUsageReport, getDateRangePresets } from "./browsing-usage";

const mockRequireOrg = vi.mocked(requireOrganization);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe("browsing-usage", () => {
  const mockOrganizationId = "org-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrg.mockResolvedValue({
      organizationId: mockOrganizationId,
      userId: "user-1",
      role: "ADMIN",
    } as never);
  });

  describe("getBrowsingUsageReport", () => {
    const baseFilters = {
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    };

    it("should return browsing usage data for authenticated user", async () => {
      const mockLogs = [
        {
          id: "log-1",
          url: "https://slack.com/messages",
          domain: "slack.com",
          visitedAt: new Date("2026-01-15T10:00:00Z"),
          userId: "user-1",
        },
        {
          id: "log-2",
          url: "https://notion.so/page",
          domain: "notion.so",
          visitedAt: new Date("2026-01-16T14:00:00Z"),
          userId: "user-2",
        },
      ];

      const mockUsers = [
        { id: "user-1", name: "Alice", email: "alice@test.com" },
        { id: "user-2", name: "Bob", email: "bob@test.com" },
      ];

      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(2);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await getBrowsingUsageReport(baseFilters);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: "log-1",
        url: "https://slack.com/messages",
        domain: "slack.com",
        visitedAt: "2026-01-15T10:00:00.000Z",
        userName: "Alice",
        userEmail: "alice@test.com",
        userId: "user-1",
      });
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should handle pagination correctly", async () => {
      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(120);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await getBrowsingUsageReport({
        ...baseFilters,
        page: 2,
        limit: 50,
      });

      expect(result.pagination).toEqual({
        total: 120,
        page: 2,
        limit: 50,
        totalPages: 3,
      });

      // Verify skip/take passed to prisma
      expect(mockPrisma.extensionBrowsingLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        })
      );
    });

    it("should cap limit at 100", async () => {
      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(0);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await getBrowsingUsageReport({
        ...baseFilters,
        limit: 200,
      });

      expect(result.pagination.limit).toBe(100);
      expect(mockPrisma.extensionBrowsingLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it("should default page to 1 and limit to 50", async () => {
      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(0);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await getBrowsingUsageReport(baseFilters);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(mockPrisma.extensionBrowsingLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 })
      );
    });

    it("should apply search filter for URL and user matching", async () => {
      const matchingUsers = [{ id: "user-1" }];
      // First findMany call is for user search, second is for user info batch
      mockPrisma.user.findMany
        .mockResolvedValueOnce(matchingUsers)
        .mockResolvedValueOnce([
          { id: "user-1", name: "Alice", email: "alice@test.com" },
        ]);
      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(1);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([
        {
          id: "log-1",
          url: "https://slack.com",
          domain: "slack.com",
          visitedAt: new Date("2026-01-15T10:00:00Z"),
          userId: "user-1",
        },
      ]);

      const result = await getBrowsingUsageReport({
        ...baseFilters,
        search: "alice",
      });

      expect(result.data).toHaveLength(1);

      // Verify user search was performed
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: "alice", mode: "insensitive" } },
              { email: { contains: "alice", mode: "insensitive" } },
            ],
          },
          select: { id: true },
        })
      );

      // Verify browsing log query includes OR clause
      expect(mockPrisma.extensionBrowsingLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { url: { contains: "alice", mode: "insensitive" } },
              { userId: { in: ["user-1"] } },
            ]),
          }),
        })
      );
    });

    it("should handle search with no matching users", async () => {
      mockPrisma.user.findMany
        .mockResolvedValueOnce([]) // no user matches
        .mockResolvedValueOnce([]); // no user info
      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(0);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);

      const result = await getBrowsingUsageReport({
        ...baseFilters,
        search: "nonexistent",
      });

      expect(result.data).toHaveLength(0);

      // OR clause should only have URL filter, no userId filter
      expect(mockPrisma.extensionBrowsingLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ url: { contains: "nonexistent", mode: "insensitive" } }],
          }),
        })
      );
    });

    it("should filter by organizationId for multi-tenant isolation", async () => {
      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(0);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await getBrowsingUsageReport(baseFilters);

      expect(mockPrisma.extensionBrowsingLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
          }),
        })
      );
    });

    it("should handle system user IDs (skip user lookup for system-*)", async () => {
      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(1);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([
        {
          id: "log-1",
          url: "https://example.com",
          domain: "example.com",
          visitedAt: new Date("2026-01-15T10:00:00Z"),
          userId: "system-cron",
        },
      ]);

      const result = await getBrowsingUsageReport(baseFilters);

      expect(result.data[0].userName).toBeNull();
      expect(result.data[0].userEmail).toBeNull();
      // user.findMany should NOT be called when all userIds are system-*
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it("should set endDate to end of day", async () => {
      mockPrisma.extensionBrowsingLog.count.mockResolvedValue(0);
      mockPrisma.extensionBrowsingLog.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await getBrowsingUsageReport(baseFilters);

      const callArgs =
        mockPrisma.extensionBrowsingLog.findMany.mock.calls[0][0];
      const endDate = callArgs.where.visitedAt.lte as Date;
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
    });

    it("should throw when user is not authenticated", async () => {
      mockRequireOrg.mockRejectedValue(new Error("Unauthorized"));

      await expect(getBrowsingUsageReport(baseFilters)).rejects.toThrow(
        "Unauthorized"
      );
    });
  });

  describe("getDateRangePresets", () => {
    it("should return 3 date range presets", async () => {
      const result = await getDateRangePresets();

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.value)).toEqual(["30d", "90d", "1y"]);
    });

    it("should have valid date ranges", async () => {
      const result = await getDateRangePresets();

      for (const preset of result) {
        expect(preset.startDate).toBeInstanceOf(Date);
        expect(preset.endDate).toBeInstanceOf(Date);
        expect(preset.startDate.getTime()).toBeLessThan(
          preset.endDate.getTime()
        );
      }
    });

    it("should have label values matching the translation keys", async () => {
      const result = await getDateRangePresets();

      expect(result[0].label).toBe("30d");
      expect(result[1].label).toBe("90d");
      expect(result[2].label).toBe("1y");
    });
  });
});
