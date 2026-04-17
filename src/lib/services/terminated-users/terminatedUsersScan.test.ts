// src/lib/services/terminated-users/terminatedUsersScan.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    organization: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

// Mock Resend for email sending
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

vi.stubEnv("RESEND_API_KEY", "test-api-key");

import { prisma } from "@/lib/db";
import { processTerminatedUsersScan } from "./terminatedUsersScan";

describe("terminatedUsersScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: "msg-123" }, error: null });
  });

  describe("processTerminatedUsersScan", () => {
    it("should scan all organizations for terminated users with access", async () => {
      // Mock organizations
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        {
          id: "org-1",
          name: "테스트 조직",
          settings: { notifications: { offboardingAlerts: true } },
          users: [{ email: "admin@example.com", role: "ADMIN" }],
        },
      ] as never);

      // Mock terminated users with access
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "user-1",
          email: "terminated@example.com",
          name: "퇴사자 1",
          terminatedAt: new Date("2025-01-01"),
          _count: { appAccesses: 3 },
          appAccesses: [
            { app: { name: "Notion" } },
            { app: { name: "Slack" } },
            { app: { name: "Figma" } },
          ],
        },
      ] as never);

      const result = await processTerminatedUsersScan();

      expect(result.success).toBe(true);
      expect(result.processedOrganizations).toBe(1);
      expect(result.totalTerminatedUsers).toBe(1);
      expect(result.totalUnrevokedAccess).toBe(3);
    });

    it("should send email alert when terminated users found", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        {
          id: "org-1",
          name: "테스트 조직",
          settings: {
            notifications: { offboardingAlerts: true, emailEnabled: true },
          },
          users: [{ email: "admin@example.com", role: "ADMIN" }],
        },
      ] as never);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "user-1",
          email: "terminated@example.com",
          name: "퇴사자 1",
          terminatedAt: new Date("2025-01-01"),
          _count: { appAccesses: 2 },
          appAccesses: [
            { app: { name: "Notion" } },
            { app: { name: "Slack" } },
          ],
        },
      ] as never);

      await processTerminatedUsersScan();

      expect(mockSend).toHaveBeenCalled();
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toContain("admin@example.com");
      expect(callArgs.subject).toContain("퇴사자");
    });

    it("should not send email when offboardingAlerts is disabled", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        {
          id: "org-1",
          name: "테스트 조직",
          settings: { notifications: { offboardingAlerts: false } },
          users: [{ email: "admin@example.com", role: "ADMIN" }],
        },
      ] as never);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "user-1",
          email: "terminated@example.com",
          name: "퇴사자 1",
          terminatedAt: new Date(),
          _count: { appAccesses: 1 },
          appAccesses: [{ app: { name: "Notion" } }],
        },
      ] as never);

      await processTerminatedUsersScan();

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should skip organizations without admins", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        {
          id: "org-1",
          name: "테스트 조직",
          settings: { notifications: { offboardingAlerts: true } },
          users: [],
        },
      ] as never);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "user-1",
          email: "terminated@example.com",
          name: "퇴사자 1",
          terminatedAt: new Date(),
          _count: { appAccesses: 1 },
          appAccesses: [{ app: { name: "Notion" } }],
        },
      ] as never);

      const result = await processTerminatedUsersScan();

      expect(mockSend).not.toHaveBeenCalled();
      expect(result.errors).toContain("org-1: 관리자 없음");
    });

    it("should handle empty terminated users", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        {
          id: "org-1",
          name: "테스트 조직",
          settings: { notifications: { offboardingAlerts: true } },
          users: [{ email: "admin@example.com", role: "ADMIN" }],
        },
      ] as never);

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const result = await processTerminatedUsersScan();

      expect(result.success).toBe(true);
      expect(result.totalTerminatedUsers).toBe(0);
      expect(result.totalUnrevokedAccess).toBe(0);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should aggregate multiple terminated users per organization", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        {
          id: "org-1",
          name: "테스트 조직",
          settings: {
            notifications: { offboardingAlerts: true, emailEnabled: true },
          },
          users: [{ email: "admin@example.com", role: "ADMIN" }],
        },
      ] as never);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "user-1",
          email: "terminated1@example.com",
          name: "퇴사자 1",
          terminatedAt: new Date(),
          _count: { appAccesses: 2 },
          appAccesses: [
            { app: { name: "Notion" } },
            { app: { name: "Slack" } },
          ],
        },
        {
          id: "user-2",
          email: "terminated2@example.com",
          name: "퇴사자 2",
          terminatedAt: new Date(),
          _count: { appAccesses: 3 },
          appAccesses: [
            { app: { name: "Figma" } },
            { app: { name: "GitHub" } },
            { app: { name: "Jira" } },
          ],
        },
      ] as never);

      const result = await processTerminatedUsersScan();

      expect(result.totalTerminatedUsers).toBe(2);
      expect(result.totalUnrevokedAccess).toBe(5);
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.organization.findMany).mockRejectedValue(
        new Error("Database connection error")
      );

      const result = await processTerminatedUsersScan();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Database connection error");
    });
  });
});
