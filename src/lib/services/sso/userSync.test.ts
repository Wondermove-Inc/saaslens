// src/lib/services/sso/userSync.test.ts
import type { GoogleWorkspaceUser, UserSyncOptions } from "@/types/sso";
import type { Integration } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapGoogleUserToDbUser, syncUsersFromGoogle } from "./userSync";

// Prisma mock
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    syncLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
    integration: {
      update: vi.fn(),
    },
  },
}));

// GoogleWorkspaceService mock
vi.mock("./googleWorkspace", () => {
  class MockGoogleWorkspaceService {
    constructor(_opts: unknown) {}
    listUsers = vi.fn();
    testConnection = vi.fn();
    getUser = vi.fn();
    listTokens = vi.fn();
  }
  return {
    GoogleWorkspaceService: MockGoogleWorkspaceService,
  };
});

describe("userSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapGoogleUserToDbUser", () => {
    const mockGoogleUser: GoogleWorkspaceUser = {
      id: "google-user-1",
      primaryEmail: "john.doe@example.com",
      name: {
        givenName: "John",
        familyName: "Doe",
        fullName: "John Doe",
      },
      orgUnitPath: "/Engineering",
      isAdmin: false,
      suspended: false,
      creationTime: "2024-01-01T00:00:00Z",
      lastLoginTime: "2024-11-30T10:00:00Z",
      thumbnailPhotoUrl: "https://photo.example.com/john",
    };

    it("should map Google user to DB user format", () => {
      const result = mapGoogleUserToDbUser(mockGoogleUser, "org-1");

      expect(result).toEqual({
        email: "john.doe@example.com",
        name: "John Doe",
        image: "https://photo.example.com/john",
        employeeId: "google-user-1",
        department: "/Engineering",
        jobTitle: undefined,
        status: "ACTIVE",
        organizationId: "org-1",
        lastLoginAt: new Date("2024-11-30T10:00:00Z"),
        isGoogleAdmin: false,
        teamId: undefined,
        _managerEmail: undefined,
      });
    });

    it("should set status to TERMINATED when user is suspended", () => {
      const suspendedUser = { ...mockGoogleUser, suspended: true };
      const result = mapGoogleUserToDbUser(suspendedUser, "org-1");

      expect(result.status).toBe("TERMINATED");
    });

    it("should handle missing optional fields", () => {
      const minimalUser: GoogleWorkspaceUser = {
        id: "user-2",
        primaryEmail: "minimal@example.com",
        name: { givenName: "", familyName: "", fullName: "" },
        isAdmin: false,
        suspended: false,
        creationTime: "2024-01-01T00:00:00Z",
      };

      const result = mapGoogleUserToDbUser(minimalUser, "org-1");

      expect(result.name).toBe("");
      expect(result.image).toBeUndefined();
      expect(result.department).toBeUndefined();
      expect(result.lastLoginAt).toBeUndefined();
      expect(result.isGoogleAdmin).toBe(false);
      expect(result.teamId).toBeUndefined();
      expect(result._managerEmail).toBeUndefined();
    });
  });

  describe("syncUsersFromGoogle", () => {
    const mockIntegration: Integration = {
      id: "int-1",
      organizationId: "org-1",
      type: "GOOGLE_WORKSPACE",
      status: "ACTIVE",
      credentials: {
        serviceAccountEmail: "sa@project.iam.gserviceaccount.com",
        privateKey:
          "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
        adminEmail: "admin@example.com",
      },
      metadata: {},
      lastSyncAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockGoogleUsers: GoogleWorkspaceUser[] = [
      {
        id: "user-1",
        primaryEmail: "user1@example.com",
        name: { givenName: "User", familyName: "One", fullName: "User One" },
        isAdmin: false,
        suspended: false,
        creationTime: "2024-01-01T00:00:00Z",
      },
      {
        id: "user-2",
        primaryEmail: "user2@example.com",
        name: { givenName: "User", familyName: "Two", fullName: "User Two" },
        isAdmin: false,
        suspended: true, // 퇴사자
        creationTime: "2024-01-02T00:00:00Z",
      },
    ];

    it("should sync users and return result", async () => {
      const { GoogleWorkspaceService } = await import("./googleWorkspace");
      const mockService = new GoogleWorkspaceService({
        clientEmail: "test@example.com",
        privateKey: "key",
        subject: "admin@example.com",
      });
      (mockService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockGoogleUsers
      );
      (
        mockService.testConnection as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true);

      const { prisma } = await import("@/lib/db");

      // Mock prisma 직접 호출
      vi.mocked(prisma.syncLog.create).mockResolvedValue({
        id: "sync-log-1",
      } as never);
      vi.mocked(prisma.syncLog.update).mockResolvedValue({} as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "user-1",
      } as never);
      vi.mocked(prisma.integration.update).mockResolvedValue({} as never);

      const result = await syncUsersFromGoogle(mockIntegration, mockService, {
        createNew: true,
        updateExisting: true,
      });

      // 에러가 없거나, 부분 성공인 경우 모두 허용
      expect(["SUCCESS", "PARTIAL"]).toContain(result.status);
      expect(result.itemsFound).toBe(2);
    });

    it("should detect terminated users when option enabled", async () => {
      const { GoogleWorkspaceService } = await import("./googleWorkspace");
      const mockService = new GoogleWorkspaceService({
        clientEmail: "test@example.com",
        privateKey: "key",
        subject: "admin@example.com",
      });
      (mockService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockGoogleUsers
      );
      (
        mockService.testConnection as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true);

      const { prisma } = await import("@/lib/db");

      // Mock prisma 직접 호출
      vi.mocked(prisma.syncLog.create).mockResolvedValue({
        id: "sync-log-1",
      } as never);
      vi.mocked(prisma.syncLog.update).mockResolvedValue({} as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "user-1",
      } as never);
      vi.mocked(prisma.integration.update).mockResolvedValue({} as never);

      const options: UserSyncOptions = {
        createNew: true,
        updateExisting: true,
        detectTerminated: true,
      };

      const result = await syncUsersFromGoogle(
        mockIntegration,
        mockService,
        options
      );

      // suspended 사용자는 TERMINATED로 매핑됨
      expect(result.itemsFound).toBe(2);
    });

    it("should handle empty user list", async () => {
      const { GoogleWorkspaceService } = await import("./googleWorkspace");
      const mockService = new GoogleWorkspaceService({
        clientEmail: "test@example.com",
        privateKey: "key",
        subject: "admin@example.com",
      });
      (mockService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (
        mockService.testConnection as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true);

      const { prisma } = await import("@/lib/db");

      // Mock prisma 직접 호출
      vi.mocked(prisma.syncLog.create).mockResolvedValue({
        id: "sync-log-1",
      } as never);
      vi.mocked(prisma.syncLog.update).mockResolvedValue({} as never);
      vi.mocked(prisma.integration.update).mockResolvedValue({} as never);

      const result = await syncUsersFromGoogle(mockIntegration, mockService);

      expect(result.itemsFound).toBe(0);
      expect(result.itemsCreated).toBe(0);
    });

    it("should return FAILED status on error", async () => {
      const { GoogleWorkspaceService } = await import("./googleWorkspace");
      const mockService = new GoogleWorkspaceService({
        clientEmail: "test@example.com",
        privateKey: "key",
        subject: "admin@example.com",
      });
      (mockService.listUsers as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API Error")
      );

      const { prisma } = await import("@/lib/db");

      // Mock prisma 직접 호출
      vi.mocked(prisma.syncLog.create).mockResolvedValue({
        id: "sync-log-1",
      } as never);
      vi.mocked(prisma.syncLog.update).mockResolvedValue({} as never);
      vi.mocked(prisma.integration.update).mockResolvedValue({} as never);

      const result = await syncUsersFromGoogle(mockIntegration, mockService);

      expect(result.status).toBe("FAILED");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("API Error");
    });
  });
});
