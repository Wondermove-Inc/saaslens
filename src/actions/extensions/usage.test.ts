// src/actions/extensions/usage.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDomainLoginEvents, getUsageAnalytics } from "./usage";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionWhitelist: {
      findMany: vi.fn(),
    },
    extensionLoginEvent: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockAuth = vi.mocked(auth);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe("Extension Usage Actions", () => {
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

  describe("getUsageAnalytics", () => {
    it("should return login-based usage analytics for today", async () => {
      // Whitelist 패턴 mock
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "slack.com" },
        { pattern: "notion.so" },
      ] as never);

      // 로그인 이벤트 mock
      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([
        {
          id: "1",
          domain: "slack.com",
          username: "user1@test.com",
          deviceId: "device-1",
        },
        {
          id: "2",
          domain: "slack.com",
          username: "user2@test.com",
          deviceId: "device-1",
        },
        {
          id: "3",
          domain: "notion.so",
          username: "user1@test.com",
          deviceId: "device-2",
        },
      ] as never);

      const result = await getUsageAnalytics("today");

      expect(result.success).toBe(true);
      expect(result.data?.period).toBe("today");
      expect(result.data?.totalLogins).toBe(3);
      expect(result.data?.uniqueUsers).toBe(2); // user1, user2
      expect(result.data?.uniqueDevices).toBe(2); // device-1, device-2
      expect(result.data?.topDomains).toHaveLength(2);
    });

    it("should filter by whitelist domains", async () => {
      // Whitelist에 slack.com만 포함
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "slack.com" },
      ] as never);

      // 로그인 이벤트에 whitelist 외 도메인 포함
      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([
        {
          id: "1",
          domain: "slack.com",
          username: "user1@test.com",
          deviceId: "device-1",
        },
        {
          id: "2",
          domain: "github.com",
          username: "user2@test.com",
          deviceId: "device-2",
        },
      ] as never);

      const result = await getUsageAnalytics("today");

      expect(result.success).toBe(true);
      expect(result.data?.totalLogins).toBe(1); // github.com은 필터링됨
      expect(result.data?.topDomains).toHaveLength(1);
      expect(result.data?.topDomains[0].domain).toBe("slack.com");
    });

    it("should support wildcard patterns", async () => {
      // 와일드카드 패턴 테스트
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "*.google.com" },
      ] as never);

      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([
        {
          id: "1",
          domain: "mail.google.com",
          username: "user1@test.com",
          deviceId: "device-1",
        },
        {
          id: "2",
          domain: "drive.google.com",
          username: "user2@test.com",
          deviceId: "device-2",
        },
        {
          id: "3",
          domain: "slack.com",
          username: "user3@test.com",
          deviceId: "device-3",
        },
      ] as never);

      const result = await getUsageAnalytics("today");

      expect(result.success).toBe(true);
      expect(result.data?.totalLogins).toBe(2); // google.com 서브도메인만
      expect(result.data?.topDomains).toHaveLength(2);
    });

    it("should extract domain from full URL format", async () => {
      // URL 형식 도메인 테스트 (https://...)
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "*.google.com" },
      ] as never);

      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([
        {
          id: "1",
          domain: "https://mail.google.com/login",
          username: "user1@test.com",
          deviceId: "device-1",
        },
        {
          id: "2",
          domain: "https://www.google.com",
          username: "user2@test.com",
          deviceId: "device-2",
        },
        {
          id: "3",
          domain: "https://slack.com/workspace",
          username: "user3@test.com",
          deviceId: "device-3",
        },
      ] as never);

      const result = await getUsageAnalytics("today");

      expect(result.success).toBe(true);
      expect(result.data?.totalLogins).toBe(2); // google.com 서브도메인만
      expect(result.data?.topDomains).toHaveLength(2);
    });

    it("should extract domain from domain with path format", async () => {
      // 경로 포함 도메인 테스트 (domain.com/path)
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "slack.com" },
      ] as never);

      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([
        {
          id: "1",
          domain: "slack.com/workspace/login",
          username: "user1@test.com",
          deviceId: "device-1",
        },
      ] as never);

      const result = await getUsageAnalytics("today");

      expect(result.success).toBe(true);
      expect(result.data?.totalLogins).toBe(1);
    });

    it("should return empty data when whitelist is empty", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([] as never);
      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([
        {
          id: "1",
          domain: "slack.com",
          username: "user1@test.com",
          deviceId: "device-1",
        },
      ] as never);

      const result = await getUsageAnalytics("today");

      expect(result.success).toBe(true);
      expect(result.data?.totalLogins).toBe(0);
      expect(result.data?.topDomains).toHaveLength(0);
    });

    it("should return error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getUsageAnalytics("today");

      expect(result.success).toBe(false);
      expect(result.error).toBe("인증이 필요합니다");
    });

    it("should support week period", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([] as never);
      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([] as never);

      const result = await getUsageAnalytics("week");

      expect(result.success).toBe(true);
      expect(result.data?.period).toBe("week");
    });

    it("should support month period", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([] as never);
      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([] as never);

      const result = await getUsageAnalytics("month");

      expect(result.success).toBe(true);
      expect(result.data?.period).toBe("month");
    });

    it("should sort domains by login count descending", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "slack.com" },
        { pattern: "notion.so" },
      ] as never);

      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([
        {
          id: "1",
          domain: "notion.so",
          username: "user1@test.com",
          deviceId: "device-1",
        },
        {
          id: "2",
          domain: "slack.com",
          username: "user1@test.com",
          deviceId: "device-1",
        },
        {
          id: "3",
          domain: "slack.com",
          username: "user2@test.com",
          deviceId: "device-2",
        },
        {
          id: "4",
          domain: "slack.com",
          username: "user3@test.com",
          deviceId: "device-3",
        },
      ] as never);

      const result = await getUsageAnalytics("today");

      expect(result.success).toBe(true);
      expect(result.data?.topDomains[0].domain).toBe("slack.com"); // 3회
      expect(result.data?.topDomains[1].domain).toBe("notion.so"); // 1회
    });
  });

  describe("getDomainLoginEvents", () => {
    it("should return login events for a specific domain and date", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "slack.com" },
      ] as never);

      const mockDate = new Date("2024-01-15T10:30:00Z");
      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([
        {
          id: "1",
          domain: "slack.com",
          username: "user1@test.com",
          authType: "PASSWORD",
          capturedAt: mockDate,
          deviceId: "device-1",
        },
        {
          id: "2",
          domain: "slack.com",
          username: "user2@test.com",
          authType: "OAUTH",
          capturedAt: mockDate,
          deviceId: "device-2",
        },
      ] as never);

      const result = await getDomainLoginEvents("slack.com", "2024-01-15");

      expect(result.success).toBe(true);
      expect(result.data?.domain).toBe("slack.com");
      expect(result.data?.loginCount).toBe(2);
      expect(result.data?.uniqueUsers).toBe(2);
      expect(result.data?.events).toHaveLength(2);
    });

    it("should return error for non-whitelisted domain", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "notion.so" },
      ] as never);

      const result = await getDomainLoginEvents("slack.com", "2024-01-15");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "해당 도메인은 whitelist에 등록되지 않았습니다"
      );
    });

    it("should return empty events when no logins on date", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([
        { pattern: "slack.com" },
      ] as never);

      mockPrisma.extensionLoginEvent.findMany.mockResolvedValue([] as never);

      const result = await getDomainLoginEvents("slack.com", "2024-01-15");

      expect(result.success).toBe(true);
      expect(result.data?.loginCount).toBe(0);
      expect(result.data?.events).toHaveLength(0);
    });

    it("should return error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getDomainLoginEvents("slack.com", "2024-01-15");

      expect(result.success).toBe(false);
      expect(result.error).toBe("인증이 필요합니다");
    });
  });
});
