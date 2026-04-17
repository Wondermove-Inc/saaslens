// src/actions/extensions/blacklist.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBlacklist,
  deleteBlacklist,
  getBlacklists,
  updateBlacklist,
} from "./blacklist";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionBlacklist: {
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

describe("Extension Blacklist Actions", () => {
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

  describe("getBlacklists", () => {
    it("should return blacklist items for organization", async () => {
      const mockItems = [
        {
          id: "bl-1",
          organizationId: mockOrganizationId,
          pattern: "*.malware.com",
          name: "Malware Site",
          reason: "Known malware",
          enabled: true,
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.extensionBlacklist.findMany.mockResolvedValue(mockItems);
      mockPrisma.extensionBlacklist.count.mockResolvedValue(1);

      const result = await getBlacklists();

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].pattern).toBe("*.malware.com");
    });

    it("should return error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getBlacklists();

      expect(result.success).toBe(false);
      expect(result.error).toBe("인증이 필요합니다");
    });
  });

  describe("createBlacklist", () => {
    it("should create a blacklist item", async () => {
      const input = {
        pattern: "*.phishing.com",
        name: "Phishing Site",
        reason: "Phishing attempts detected",
      };

      const mockCreated = {
        id: "bl-new",
        organizationId: mockOrganizationId,
        ...input,
        enabled: true,
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionBlacklist.create.mockResolvedValue(mockCreated);

      const result = await createBlacklist(input);

      expect(result.success).toBe(true);
      expect(result.data?.pattern).toBe("*.phishing.com");
      expect(result.data?.reason).toBe("Phishing attempts detected");
    });

    it("should validate input", async () => {
      const result = await createBlacklist({
        pattern: "",
        name: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("도메인 패턴");
    });
  });

  describe("updateBlacklist", () => {
    it("should update a blacklist item", async () => {
      const mockExisting = {
        id: "bl-1",
        organizationId: mockOrganizationId,
        pattern: "*.old.com",
        name: "Old",
        reason: null,
        enabled: true,
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionBlacklist.findUnique.mockResolvedValue(mockExisting);
      mockPrisma.extensionBlacklist.update.mockResolvedValue({
        ...mockExisting,
        reason: "Updated reason",
      });

      const result = await updateBlacklist("bl-1", {
        reason: "Updated reason",
      });

      expect(result.success).toBe(true);
      expect(result.data?.reason).toBe("Updated reason");
    });

    it("should return error when item not found", async () => {
      mockPrisma.extensionBlacklist.findUnique.mockResolvedValue(null);

      const result = await updateBlacklist("non-existent", { enabled: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain("찾을 수 없습니다");
    });
  });

  describe("deleteBlacklist", () => {
    it("should delete a blacklist item", async () => {
      const mockExisting = {
        id: "bl-1",
        organizationId: mockOrganizationId,
        pattern: "*.test.com",
        name: "Test",
        reason: null,
        enabled: true,
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.extensionBlacklist.findUnique.mockResolvedValue(mockExisting);
      mockPrisma.extensionBlacklist.delete.mockResolvedValue(mockExisting);

      const result = await deleteBlacklist("bl-1");

      expect(result.success).toBe(true);
    });
  });
});
