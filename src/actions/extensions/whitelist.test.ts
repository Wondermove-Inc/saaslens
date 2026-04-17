// src/actions/extensions/whitelist.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWhitelist,
  deleteWhitelist,
  getWhitelists,
  updateWhitelist,
} from "./whitelist";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionWhitelist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockAuth = vi.mocked(auth);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe("Extension Whitelist Actions", () => {
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

  describe("getWhitelists", () => {
    it("should return whitelist items for organization", async () => {
      const mockItems = [
        {
          id: "wl-1",
          organizationId: mockOrganizationId,
          pattern: "*.slack.com",
          name: "Slack",
          enabled: true,
          source: "MANUAL",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.extensionWhitelist.findMany.mockResolvedValue(mockItems);
      mockPrisma.extensionWhitelist.count.mockResolvedValue(1);

      const result = await getWhitelists();

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].pattern).toBe("*.slack.com");
    });

    it("should return error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getWhitelists();

      expect(result.success).toBe(false);
      expect(result.error).toBe("인증이 필요합니다");
    });

    it("should support pagination", async () => {
      mockPrisma.extensionWhitelist.findMany.mockResolvedValue([]);
      mockPrisma.extensionWhitelist.count.mockResolvedValue(50);

      const result = await getWhitelists({ page: 2, limit: 10 });

      expect(result.success).toBe(true);
      expect(mockPrisma.extensionWhitelist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe("createWhitelist", () => {
    it("should create a whitelist item", async () => {
      const input = {
        pattern: "*.notion.so",
        name: "Notion",
      };

      const mockCreated = {
        id: "wl-new",
        organizationId: mockOrganizationId,
        ...input,
        enabled: true,
        source: "MANUAL",
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionWhitelist.create.mockResolvedValue(mockCreated);

      const result = await createWhitelist(input);

      expect(result.success).toBe(true);
      expect(result.data?.pattern).toBe("*.notion.so");
    });

    it("should validate input", async () => {
      const result = await createWhitelist({
        pattern: "",
        name: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("도메인 패턴");
    });
  });

  describe("updateWhitelist", () => {
    it("should update a whitelist item", async () => {
      const mockExisting = {
        id: "wl-1",
        organizationId: mockOrganizationId,
        pattern: "*.old.com",
        name: "Old",
        enabled: true,
        source: "MANUAL",
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionWhitelist.findUnique.mockResolvedValue(mockExisting);
      mockPrisma.extensionWhitelist.update.mockResolvedValue({
        ...mockExisting,
        pattern: "*.new.com",
      });

      const result = await updateWhitelist("wl-1", { pattern: "*.new.com" });

      expect(result.success).toBe(true);
      expect(result.data?.pattern).toBe("*.new.com");
    });

    it("should return error when item not found", async () => {
      mockPrisma.extensionWhitelist.findUnique.mockResolvedValue(null);

      const result = await updateWhitelist("non-existent", { enabled: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain("찾을 수 없습니다");
    });
  });

  describe("deleteWhitelist", () => {
    it("should delete a whitelist item", async () => {
      const mockExisting = {
        id: "wl-1",
        organizationId: mockOrganizationId,
        pattern: "*.test.com",
        name: "Test",
        enabled: true,
        source: "MANUAL",
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionWhitelist.findUnique.mockResolvedValue(mockExisting);
      mockPrisma.extensionWhitelist.delete.mockResolvedValue(mockExisting);

      const result = await deleteWhitelist("wl-1");

      expect(result.success).toBe(true);
    });

    it("should return error when item not found", async () => {
      mockPrisma.extensionWhitelist.findUnique.mockResolvedValue(null);

      const result = await deleteWhitelist("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("찾을 수 없습니다");
    });
  });
});
