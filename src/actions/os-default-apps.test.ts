// src/actions/os-default-apps.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    osDefaultApp: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createOsDefaultApp,
  deleteOsDefaultApp,
  getOsDefaultApps,
  isOsDefaultApp,
  updateOsDefaultApp,
} from "./os-default-apps";

describe("os-default-apps actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOsDefaultApps", () => {
    it("should return all active OS default apps", async () => {
      const mockApps = [
        { id: "1", name: "Safari", platform: "MACOS", isActive: true },
        { id: "2", name: "Calculator", platform: "MACOS", isActive: true },
      ];
      vi.mocked(prisma.osDefaultApp.findMany).mockResolvedValue(
        mockApps as never
      );

      const result = await getOsDefaultApps();

      expect(result).toHaveLength(2);
      expect(prisma.osDefaultApp.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    });

    it("should filter by platform when specified", async () => {
      vi.mocked(prisma.osDefaultApp.findMany).mockResolvedValue([]);

      await getOsDefaultApps("WINDOWS");

      expect(prisma.osDefaultApp.findMany).toHaveBeenCalledWith({
        where: { isActive: true, platform: "WINDOWS" },
        orderBy: { name: "asc" },
      });
    });

    it("should return empty array when no apps found", async () => {
      vi.mocked(prisma.osDefaultApp.findMany).mockResolvedValue([]);

      const result = await getOsDefaultApps();

      expect(result).toEqual([]);
    });
  });

  describe("isOsDefaultApp", () => {
    const mockOsDefaultApps = [
      {
        id: "1",
        name: "Safari",
        bundleId: "com.apple.Safari",
        platform: "MACOS",
        namePattern: null,
        isActive: true,
      },
      {
        id: "2",
        name: "Microsoft Edge",
        bundleId: null,
        platform: "WINDOWS",
        namePattern: "^Microsoft Edge.*",
        isActive: true,
      },
      {
        id: "3",
        name: "Calculator",
        bundleId: "com.apple.calculator",
        platform: "MACOS",
        namePattern: null,
        isActive: true,
      },
      {
        id: "4",
        name: "Terminal",
        bundleId: null,
        platform: "LINUX",
        namePattern: "^(gnome-terminal|Terminal|konsole)$",
        isActive: true,
      },
    ];

    it("should match by bundleId (highest priority)", () => {
      const result = isOsDefaultApp(
        { name: "Safari", bundleIdentifier: "com.apple.Safari" },
        mockOsDefaultApps as never,
        "MACOS"
      );
      expect(result).toBe(true);
    });

    it("should match by bundleId case-insensitively", () => {
      const result = isOsDefaultApp(
        { name: "safari", bundleIdentifier: "COM.APPLE.SAFARI" },
        mockOsDefaultApps as never,
        "MACOS"
      );
      expect(result).toBe(true);
    });

    it("should match by namePattern (regex)", () => {
      const result = isOsDefaultApp(
        { name: "Microsoft Edge 120.0.2210.91" },
        mockOsDefaultApps as never,
        "WINDOWS"
      );
      expect(result).toBe(true);
    });

    it("should match by exact name (fallback)", () => {
      const result = isOsDefaultApp(
        { name: "Calculator" },
        mockOsDefaultApps as never,
        "MACOS"
      );
      expect(result).toBe(true);
    });

    it("should match by name case-insensitively", () => {
      const result = isOsDefaultApp(
        { name: "calculator" },
        mockOsDefaultApps as never,
        "MACOS"
      );
      expect(result).toBe(true);
    });

    it("should not match different platform", () => {
      const result = isOsDefaultApp(
        { name: "Safari" },
        mockOsDefaultApps as never,
        "WINDOWS"
      );
      expect(result).toBe(false);
    });

    it("should return false for non-default app", () => {
      const result = isOsDefaultApp(
        { name: "Slack" },
        mockOsDefaultApps as never,
        "MACOS"
      );
      expect(result).toBe(false);
    });

    it("should match Linux terminal variants", () => {
      expect(
        isOsDefaultApp(
          { name: "gnome-terminal" },
          mockOsDefaultApps as never,
          "LINUX"
        )
      ).toBe(true);

      expect(
        isOsDefaultApp(
          { name: "Terminal" },
          mockOsDefaultApps as never,
          "LINUX"
        )
      ).toBe(true);

      expect(
        isOsDefaultApp({ name: "konsole" }, mockOsDefaultApps as never, "LINUX")
      ).toBe(true);
    });

    it("should handle invalid regex gracefully", () => {
      const appsWithBadRegex = [
        {
          id: "1",
          name: "BadApp",
          bundleId: null,
          platform: "MACOS",
          namePattern: "[invalid(regex",
          isActive: true,
        },
      ];

      // Should not throw, should return false
      const result = isOsDefaultApp(
        { name: "SomeApp" },
        appsWithBadRegex as never,
        "MACOS"
      );
      expect(result).toBe(false);
    });
  });

  describe("createOsDefaultApp", () => {
    it("should create app when authenticated as admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockCreated = {
        id: "new-id",
        name: "New App",
        platform: "MACOS",
        bundleId: "com.new.app",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.osDefaultApp.create).mockResolvedValue(
        mockCreated as never
      );

      const result = await createOsDefaultApp({
        name: "New App",
        platform: "MACOS",
        bundleId: "com.new.app",
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("New App");
    });

    it("should return error when not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await createOsDefaultApp({
        name: "New App",
        platform: "MACOS",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("권한");
    });

    it("should return error when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await createOsDefaultApp({
        name: "New App",
        platform: "MACOS",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("인증");
    });

    it("should handle duplicate error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const prismaError = new Error("Unique constraint failed");
      (prismaError as { code?: string }).code = "P2002";
      vi.mocked(prisma.osDefaultApp.create).mockRejectedValue(prismaError);

      const result = await createOsDefaultApp({
        name: "Safari",
        platform: "MACOS",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("이미 등록된");
    });
  });

  describe("updateOsDefaultApp", () => {
    it("should update app when authenticated as admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockUpdated = {
        id: "app-1",
        name: "Updated App",
        platform: "MACOS",
        bundleId: "com.updated.app",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.osDefaultApp.update).mockResolvedValue(
        mockUpdated as never
      );

      const result = await updateOsDefaultApp("app-1", {
        name: "Updated App",
        bundleId: "com.updated.app",
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Updated App");
    });

    it("should return error when not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "VIEWER" },
      } as never);

      const result = await updateOsDefaultApp("app-1", {
        name: "Updated App",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("권한");
    });
  });

  describe("deleteOsDefaultApp", () => {
    it("should delete app when authenticated as admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.osDefaultApp.delete).mockResolvedValue({
        id: "app-1",
      } as never);

      const result = await deleteOsDefaultApp("app-1");

      expect(result.success).toBe(true);
      expect(prisma.osDefaultApp.delete).toHaveBeenCalledWith({
        where: { id: "app-1" },
      });
    });

    it("should return error when not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await deleteOsDefaultApp("app-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("권한");
    });

    it("should handle not found error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const prismaError = new Error("Record not found");
      (prismaError as { code?: string }).code = "P2025";
      vi.mocked(prisma.osDefaultApp.delete).mockRejectedValue(prismaError);

      const result = await deleteOsDefaultApp("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("찾을 수 없");
    });
  });
});
