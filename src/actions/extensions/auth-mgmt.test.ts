// src/actions/extensions/auth-mgmt.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Prisma mock
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionApiToken: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

// Auth mock
vi.mock("@/lib/api/extension-auth", () => ({
  generateToken: vi.fn(() => "test-raw-auth-abc123"),
  hashToken: vi.fn((t: string) => `hashed-${t}`),
}));

import { generateToken, hashToken } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import {
  createExtensionAuth,
  deleteExtensionAuth,
  listExtensionAuths,
  revokeExtensionAuth,
} from "./auth-mgmt";

describe("Extension Auth Management Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createExtensionAuth", () => {
    it("should create auth and return the raw value", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as never);
      vi.mocked(prisma.extensionApiToken.create).mockResolvedValue({
        id: "auth-1",
        organizationId: "org-1",
        token: "hashed-test-raw-auth-abc123",
        name: "Test Auth",
        deviceId: null,
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await createExtensionAuth({
        organizationId: "org-1",
        name: "Test Auth",
      });

      expect(result.success).toBe(true);
      expect(result.rawValue).toBe("test-raw-auth-abc123");
      expect(result.authId).toBe("auth-1");
      expect(generateToken).toHaveBeenCalled();
      expect(hashToken).toHaveBeenCalledWith("test-raw-auth-abc123");
      expect(prisma.extensionApiToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          token: "hashed-test-raw-auth-abc123",
          name: "Test Auth",
          isActive: true,
        }),
      });
    });

    it("should return error when organization not found", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const result = await createExtensionAuth({
        organizationId: "invalid-org",
        name: "Test Auth",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Organization not found");
      expect(prisma.extensionApiToken.create).not.toHaveBeenCalled();
    });

    it("should create auth with deviceId when provided", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as never);
      vi.mocked(prisma.extensionApiToken.create).mockResolvedValue({
        id: "auth-1",
        organizationId: "org-1",
        token: "hashed-test-raw-auth-abc123",
        name: "Device Auth",
        deviceId: "device-123",
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await createExtensionAuth({
        organizationId: "org-1",
        name: "Device Auth",
        deviceId: "device-123",
      });

      expect(result.success).toBe(true);
      expect(prisma.extensionApiToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceId: "device-123",
        }),
      });
    });

    it("should create auth with expiresAt when provided", async () => {
      const expiresAt = new Date("2025-12-31");
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as never);
      vi.mocked(prisma.extensionApiToken.create).mockResolvedValue({
        id: "auth-1",
        organizationId: "org-1",
        token: "hashed-test-raw-auth-abc123",
        name: "Expiring Auth",
        deviceId: null,
        isActive: true,
        lastUsedAt: null,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await createExtensionAuth({
        organizationId: "org-1",
        name: "Expiring Auth",
        expiresAt,
      });

      expect(result.success).toBe(true);
      expect(prisma.extensionApiToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt,
        }),
      });
    });
  });

  describe("listExtensionAuths", () => {
    it("should return list of auths for organization", async () => {
      const mockAuths = [
        {
          id: "auth-1",
          organizationId: "org-1",
          name: "Auth 1",
          deviceId: null,
          isActive: true,
          lastUsedAt: new Date(),
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "auth-2",
          organizationId: "org-1",
          name: "Auth 2",
          deviceId: "device-1",
          isActive: false,
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(prisma.extensionApiToken.findMany).mockResolvedValue(
        mockAuths as never
      );

      const result = await listExtensionAuths("org-1");

      expect(result.success).toBe(true);
      expect(result.auths).toHaveLength(2);
      expect(result.auths![0].id).toBe("auth-1");
      expect(result.auths![1].id).toBe("auth-2");
      // Should not expose the actual hash
      expect(result.auths![0]).not.toHaveProperty("token");
      expect(prisma.extensionApiToken.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        select: expect.objectContaining({
          id: true,
          name: true,
          deviceId: true,
          isActive: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        }),
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when no auths exist", async () => {
      vi.mocked(prisma.extensionApiToken.findMany).mockResolvedValue([]);

      const result = await listExtensionAuths("org-1");

      expect(result.success).toBe(true);
      expect(result.auths).toEqual([]);
    });
  });

  describe("revokeExtensionAuth", () => {
    it("should set auth isActive to false", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue({
        id: "auth-1",
        organizationId: "org-1",
        isActive: true,
      } as never);
      vi.mocked(prisma.extensionApiToken.update).mockResolvedValue({
        id: "auth-1",
        isActive: false,
      } as never);

      const result = await revokeExtensionAuth("auth-1", "org-1");

      expect(result.success).toBe(true);
      expect(prisma.extensionApiToken.update).toHaveBeenCalledWith({
        where: { id: "auth-1" },
        data: { isActive: false },
      });
    });

    it("should return error when auth not found", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(null);

      const result = await revokeExtensionAuth("invalid-auth", "org-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Extension auth not found");
    });

    it("should return error when auth belongs to different organization", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue({
        id: "auth-1",
        organizationId: "org-2", // Different org
        isActive: true,
      } as never);

      const result = await revokeExtensionAuth("auth-1", "org-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Extension auth not found");
      expect(prisma.extensionApiToken.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteExtensionAuth", () => {
    it("should delete the auth", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue({
        id: "auth-1",
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.extensionApiToken.delete).mockResolvedValue({
        id: "auth-1",
      } as never);

      const result = await deleteExtensionAuth("auth-1", "org-1");

      expect(result.success).toBe(true);
      expect(prisma.extensionApiToken.delete).toHaveBeenCalledWith({
        where: { id: "auth-1" },
      });
    });

    it("should return error when auth not found", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(null);

      const result = await deleteExtensionAuth("invalid-auth", "org-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Extension auth not found");
    });

    it("should return error when auth belongs to different organization", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue({
        id: "auth-1",
        organizationId: "org-2", // Different org
      } as never);

      const result = await deleteExtensionAuth("auth-1", "org-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Extension auth not found");
      expect(prisma.extensionApiToken.delete).not.toHaveBeenCalled();
    });
  });
});
