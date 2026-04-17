// src/actions/extensions/builds.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteBuild,
  getBuild,
  getBuilds,
  retryBuild,
  triggerBuild,
} from "./builds";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionBuild: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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

describe("Extension Build Actions", () => {
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

  describe("getBuilds", () => {
    it("should return build list for organization", async () => {
      const mockBuilds = [
        {
          id: "build-1",
          organizationId: mockOrganizationId,
          version: "1.0.0",
          platform: "CHROME",
          status: "COMPLETED",
          serverUrl: null,
          downloadUrl: "https://cdn.example.com/build.zip",
          checksum: "abc123",
          fileSize: 1024000,
          buildLog: "Build successful",
          errorMessage: null,
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ];

      mockPrisma.extensionBuild.findMany.mockResolvedValue(mockBuilds as never);
      mockPrisma.extensionBuild.count.mockResolvedValue(1);

      const result = await getBuilds();

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].version).toBe("1.0.0");
    });

    it("should return error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      const result = await getBuilds();

      expect(result.success).toBe(false);
      expect(result.error).toBe("인증이 필요합니다");
    });
  });

  describe("getBuild", () => {
    it("should return a single build", async () => {
      const mockBuild = {
        id: "build-1",
        organizationId: mockOrganizationId,
        version: "1.0.0",
        platform: "CHROME",
        status: "COMPLETED",
        serverUrl: null,
        downloadUrl: "https://cdn.example.com/build.zip",
        checksum: "abc123",
        fileSize: 1024000,
        buildLog: "Build successful",
        errorMessage: null,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      mockPrisma.extensionBuild.findUnique.mockResolvedValue(
        mockBuild as never
      );

      const result = await getBuild("build-1");

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("build-1");
      expect(result.data?.version).toBe("1.0.0");
    });

    it("should return error when build not found", async () => {
      mockPrisma.extensionBuild.findUnique.mockResolvedValue(null);

      const result = await getBuild("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("빌드를 찾을 수 없습니다");
    });
  });

  describe("triggerBuild", () => {
    it("should create a new build", async () => {
      mockPrisma.extensionBuild.findFirst.mockResolvedValue(null);
      mockPrisma.extensionBuild.create.mockResolvedValue({
        id: "build-new",
        organizationId: mockOrganizationId,
        version: "1.0.0",
        platform: "CHROME",
        status: "PENDING",
        serverUrl: null,
        downloadUrl: null,
        checksum: null,
        fileSize: null,
        buildLog: null,
        errorMessage: null,
        createdAt: new Date(),
        completedAt: null,
      } as never);

      const result = await triggerBuild({ platform: "CHROME" });

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe("1.0.0");
      expect(result.data?.status).toBe("PENDING");
    });

    it("should auto-increment version", async () => {
      mockPrisma.extensionBuild.findFirst.mockResolvedValue({
        version: "1.2.3",
      } as never);
      mockPrisma.extensionBuild.create.mockResolvedValue({
        id: "build-new",
        organizationId: mockOrganizationId,
        version: "1.2.4",
        platform: "CHROME",
        status: "PENDING",
        serverUrl: null,
        downloadUrl: null,
        checksum: null,
        fileSize: null,
        buildLog: null,
        errorMessage: null,
        createdAt: new Date(),
        completedAt: null,
      } as never);

      const result = await triggerBuild({ platform: "CHROME" });

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe("1.2.4");
    });

    it("should validate platform", async () => {
      const result = await triggerBuild({
        platform: "INVALID" as "CHROME",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("deleteBuild", () => {
    it("should delete a build", async () => {
      const mockBuild = {
        id: "build-1",
        organizationId: mockOrganizationId,
        status: "COMPLETED",
      };

      mockPrisma.extensionBuild.findUnique.mockResolvedValue(
        mockBuild as never
      );
      mockPrisma.extensionBuild.delete.mockResolvedValue(mockBuild as never);

      const result = await deleteBuild("build-1");

      expect(result.success).toBe(true);
    });

    it("should not delete building build", async () => {
      mockPrisma.extensionBuild.findUnique.mockResolvedValue({
        id: "build-1",
        organizationId: mockOrganizationId,
        status: "BUILDING",
      } as never);

      const result = await deleteBuild("build-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("진행 중인 빌드");
    });
  });

  describe("retryBuild", () => {
    it("should retry a failed build", async () => {
      const mockBuild = {
        id: "build-1",
        organizationId: mockOrganizationId,
        version: "1.0.0",
        platform: "CHROME",
        status: "FAILED",
        errorMessage: "Build failed",
      };

      mockPrisma.extensionBuild.findUnique.mockResolvedValue(
        mockBuild as never
      );
      mockPrisma.extensionBuild.update.mockResolvedValue({
        ...mockBuild,
        status: "PENDING",
        errorMessage: null,
      } as never);

      const result = await retryBuild("build-1");

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("PENDING");
    });

    it("should not retry non-failed build", async () => {
      mockPrisma.extensionBuild.findUnique.mockResolvedValue({
        id: "build-1",
        organizationId: mockOrganizationId,
        status: "COMPLETED",
      } as never);

      const result = await retryBuild("build-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("실패한 빌드만");
    });
  });
});
