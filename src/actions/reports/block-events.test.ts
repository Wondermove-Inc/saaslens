// src/actions/reports/block-events.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock withLogging as passthrough
vi.mock("@/lib/logging", () => ({
  withLogging: (_name: string, fn: unknown) => fn,
}));

// Mock requireOrganization
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionBlockLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { getBlockEventsReport, getBlockStatsSummary } from "./block-events";

const mockRequireOrg = vi.mocked(requireOrganization);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe("block-events", () => {
  const mockOrganizationId = "org-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrg.mockResolvedValue({
      organizationId: mockOrganizationId,
      userId: "user-1",
      role: "ADMIN",
    } as never);
  });

  describe("getBlockEventsReport", () => {
    const baseFilters = {
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    };

    it("should return block events data for authenticated user", async () => {
      const mockEvents = [
        {
          id: "evt-1",
          url: "https://malware.com/bad",
          domain: "malware.com",
          blockReason: "BLACKLISTED",
          blockedAt: new Date("2026-01-10T08:00:00Z"),
          user: { name: "Alice", email: "alice@test.com" },
        },
        {
          id: "evt-2",
          url: "https://phishing.net/login",
          domain: "phishing.net",
          blockReason: "SECURITY_RISK",
          blockedAt: new Date("2026-01-12T14:30:00Z"),
          user: { name: "Bob", email: "bob@test.com" },
        },
      ];

      mockPrisma.extensionBlockLog.findMany.mockResolvedValue(mockEvents);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(2);

      const result = await getBlockEventsReport(baseFilters);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: "evt-1",
        url: "https://malware.com/bad",
        domain: "malware.com",
        blockReason: "BLACKLISTED",
        blockedAt: "2026-01-10T08:00:00.000Z",
        userName: "Alice",
        userEmail: "alice@test.com",
      });
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should handle events with no user (null user)", async () => {
      mockPrisma.extensionBlockLog.findMany.mockResolvedValue([
        {
          id: "evt-1",
          url: "https://example.com",
          domain: "example.com",
          blockReason: "BLOCKED",
          blockedAt: new Date("2026-01-10T08:00:00Z"),
          user: null,
        },
      ]);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(1);

      const result = await getBlockEventsReport(baseFilters);

      expect(result.data[0].userName).toBeNull();
      expect(result.data[0].userEmail).toBeNull();
    });

    it("should handle pagination correctly", async () => {
      mockPrisma.extensionBlockLog.findMany.mockResolvedValue([]);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(150);

      const result = await getBlockEventsReport({
        ...baseFilters,
        page: 3,
        limit: 25,
      });

      expect(result.pagination).toEqual({
        total: 150,
        page: 3,
        limit: 25,
        totalPages: 6,
      });

      expect(mockPrisma.extensionBlockLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 25,
        })
      );
    });

    it("should cap limit at 100", async () => {
      mockPrisma.extensionBlockLog.findMany.mockResolvedValue([]);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);

      const result = await getBlockEventsReport({
        ...baseFilters,
        limit: 500,
      });

      expect(result.pagination.limit).toBe(100);
      expect(mockPrisma.extensionBlockLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it("should default page to 1 and limit to 50", async () => {
      mockPrisma.extensionBlockLog.findMany.mockResolvedValue([]);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);

      const result = await getBlockEventsReport(baseFilters);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });

    it("should apply search filter for URL and user matching", async () => {
      const matchingUsers = [{ id: "user-1" }];
      mockPrisma.user.findMany.mockResolvedValue(matchingUsers);
      mockPrisma.extensionBlockLog.findMany.mockResolvedValue([]);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);

      await getBlockEventsReport({ ...baseFilters, search: "alice" });

      // Verify user search
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

      // Verify block log query has OR clause with URL + userId
      expect(mockPrisma.extensionBlockLog.findMany).toHaveBeenCalledWith(
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
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.extensionBlockLog.findMany.mockResolvedValue([]);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);

      await getBlockEventsReport({ ...baseFilters, search: "xyz" });

      // OR clause should only contain URL filter
      expect(mockPrisma.extensionBlockLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ url: { contains: "xyz", mode: "insensitive" } }],
          }),
        })
      );
    });

    it("should filter by organizationId for multi-tenant isolation", async () => {
      mockPrisma.extensionBlockLog.findMany.mockResolvedValue([]);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);

      await getBlockEventsReport(baseFilters);

      expect(mockPrisma.extensionBlockLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
          }),
        })
      );
    });

    it("should set endDate to end of day", async () => {
      mockPrisma.extensionBlockLog.findMany.mockResolvedValue([]);
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);

      await getBlockEventsReport(baseFilters);

      const callArgs = mockPrisma.extensionBlockLog.findMany.mock.calls[0][0];
      const endDate = callArgs.where.blockedAt.lte as Date;
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
    });

    it("should throw when user is not authenticated", async () => {
      mockRequireOrg.mockRejectedValue(new Error("Unauthorized"));

      await expect(getBlockEventsReport(baseFilters)).rejects.toThrow(
        "Unauthorized"
      );
    });
  });

  describe("getBlockStatsSummary", () => {
    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-01-31");

    it("should return block statistics summary", async () => {
      mockPrisma.extensionBlockLog.count.mockResolvedValue(42);
      mockPrisma.extensionBlockLog.groupBy
        .mockResolvedValueOnce([
          { domain: "malware.com" },
          { domain: "phishing.net" },
          { domain: "adware.org" },
        ])
        .mockResolvedValueOnce([
          { domain: "malware.com", _count: { id: 20 } },
          { domain: "phishing.net", _count: { id: 15 } },
          { domain: "adware.org", _count: { id: 7 } },
        ]);

      const result = await getBlockStatsSummary(startDate, endDate);

      expect(result.totalBlocks).toBe(42);
      expect(result.uniqueDomains).toBe(3);
      expect(result.topBlockedDomains).toEqual([
        { domain: "malware.com", count: 20 },
        { domain: "phishing.net", count: 15 },
        { domain: "adware.org", count: 7 },
      ]);
    });

    it("should return zeros when no block events exist", async () => {
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);
      mockPrisma.extensionBlockLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getBlockStatsSummary(startDate, endDate);

      expect(result.totalBlocks).toBe(0);
      expect(result.uniqueDomains).toBe(0);
      expect(result.topBlockedDomains).toEqual([]);
    });

    it("should filter by organizationId", async () => {
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);
      mockPrisma.extensionBlockLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getBlockStatsSummary(startDate, endDate);

      expect(mockPrisma.extensionBlockLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
          }),
        })
      );
    });

    it("should set endDate to end of day", async () => {
      mockPrisma.extensionBlockLog.count.mockResolvedValue(0);
      mockPrisma.extensionBlockLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getBlockStatsSummary(startDate, endDate);

      const callArgs = mockPrisma.extensionBlockLog.count.mock.calls[0][0];
      const adjustedEnd = callArgs.where.blockedAt.lte as Date;
      expect(adjustedEnd.getHours()).toBe(23);
      expect(adjustedEnd.getMinutes()).toBe(59);
    });

    it("should throw when user is not authenticated", async () => {
      mockRequireOrg.mockRejectedValue(new Error("Unauthorized"));

      await expect(getBlockStatsSummary(startDate, endDate)).rejects.toThrow(
        "Unauthorized"
      );
    });
  });
});
