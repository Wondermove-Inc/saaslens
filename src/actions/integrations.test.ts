// src/actions/integrations.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createIntegration,
  deleteIntegration,
  getIntegration,
  getIntegrations,
  syncIntegrationNow,
  updateIntegrationStatus,
} from "./integrations";

// Auth mock
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Prisma mock
vi.mock("@/lib/db", () => ({
  prisma: {
    integration: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    syncLog: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// GoogleWorkspaceService mock
vi.mock("@/lib/services/sso/googleWorkspace", () => ({
  GoogleWorkspaceService: vi.fn().mockImplementation(() => ({
    testConnection: vi.fn().mockResolvedValue(true),
    listUsers: vi.fn().mockResolvedValue([]),
  })),
}));

// userSync mock
vi.mock("@/lib/services/sso/userSync", () => ({
  syncUsersFromGoogle: vi.fn().mockResolvedValue({
    status: "SUCCESS",
    itemsFound: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    errors: [],
  }),
}));

// googleSync mock (fullGoogleWorkspaceSync)
vi.mock("@/lib/services/sso/googleSync", () => ({
  fullGoogleWorkspaceSync: vi.fn().mockResolvedValue({
    status: "SUCCESS",
    itemsFound: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    errors: [],
    details: {
      users: { created: 0, updated: 0 },
      teams: { created: 0, updated: 0 },
    },
  }),
}));

// revalidatePath mock
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// redirect mock - Next.js redirect throws NEXT_REDIRECT error with digest property
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    (error as Error & { digest: string }).digest = `NEXT_REDIRECT:${url}`;
    throw error;
  }),
}));

describe("integrations actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createIntegration", () => {
    it("should return error when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await createIntegration({
        type: "GOOGLE_WORKSPACE",
        credentials: {
          serviceAccountEmail: "sa@project.iam.gserviceaccount.com",
          privateKey:
            "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
          adminEmail: "admin@example.com",
        },
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("인증이 필요합니다");
    });

    it("should return error when no organization", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1" },
      });

      const result = await createIntegration({
        type: "GOOGLE_WORKSPACE",
        credentials: {},
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("조직에 속해 있어야 합니다");
    });

    it("should create integration successfully", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      (prisma.integration.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          id: "int-1",
          type: "GOOGLE_WORKSPACE",
          status: "PENDING",
          organizationId: "org-1",
        }
      );

      const result = await createIntegration({
        type: "GOOGLE_WORKSPACE",
        credentials: {
          serviceAccountEmail: "sa@project.iam.gserviceaccount.com",
          privateKey:
            "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
          adminEmail: "admin@example.com",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.integration).toEqual(
        expect.objectContaining({
          id: "int-1",
          type: "GOOGLE_WORKSPACE",
        })
      );
    });

    it("should return error when integration already exists", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "existing-int",
      });

      const result = await createIntegration({
        type: "GOOGLE_WORKSPACE",
        credentials: {},
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("이미 동일한 유형의 연동이 존재합니다");
    });
  });

  describe("getIntegrations", () => {
    it("should return list of integrations", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        {
          id: "int-1",
          type: "GOOGLE_WORKSPACE",
          status: "ACTIVE",
          organizationId: "org-1",
        },
      ]);

      const result = await getIntegrations();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe("GOOGLE_WORKSPACE");
    });

    it("should redirect to login when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(getIntegrations()).rejects.toThrow("NEXT_REDIRECT:/login");
    });
  });

  describe("getIntegration", () => {
    it("should return single integration with stats", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        type: "GOOGLE_WORKSPACE",
        status: "ACTIVE",
        organizationId: "org-1",
      });
      (prisma.syncLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);
      (prisma.syncLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: "SUCCESS",
        itemsFound: 10,
        itemsCreated: 2,
        itemsUpdated: 8,
      });

      const result = await getIntegration("int-1");

      expect(result.success).toBe(true);
      expect(result.data?.integration.id).toBe("int-1");
      expect(result.data?.integration.syncCount).toBe(5);
    });

    it("should return null when integration not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const result = await getIntegration("non-existent");

      expect(result.success).toBe(false);
      expect(result.message).toBe("연동을 찾을 수 없습니다");
    });
  });

  describe("updateIntegrationStatus", () => {
    it("should update integration status", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
      });
      (prisma.integration.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          id: "int-1",
          status: "DISCONNECTED",
        }
      );

      const result = await updateIntegrationStatus("int-1", "DISCONNECTED");

      expect(result.success).toBe(true);
      expect(prisma.integration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "int-1" },
          data: { status: "DISCONNECTED" },
        })
      );
    });

    it("should return error when integration not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const result = await updateIntegrationStatus("non-existent", "ACTIVE");

      expect(result.success).toBe(false);
      expect(result.message).toBe("연동을 찾을 수 없습니다");
    });
  });

  describe("deleteIntegration", () => {
    it("should delete integration", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
      });
      (prisma.integration.delete as ReturnType<typeof vi.fn>).mockResolvedValue(
        {}
      );

      const result = await deleteIntegration("int-1");

      expect(result.success).toBe(true);
      expect(prisma.integration.delete).toHaveBeenCalledWith({
        where: { id: "int-1" },
      });
    });
  });

  describe("syncIntegrationNow", () => {
    it("should start sync successfully", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        type: "GOOGLE_WORKSPACE",
        organizationId: "org-1",
        credentials: {
          serviceAccountEmail: "sa@project.iam.gserviceaccount.com",
          privateKey:
            "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
          adminEmail: "admin@example.com",
        },
      });

      const result = await syncIntegrationNow("int-1");

      expect(result.success).toBe(true);
    });

    it("should return error for non-Google Workspace integration", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        type: "OKTA",
        organizationId: "org-1",
      });

      const result = await syncIntegrationNow("int-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "현재 Google Workspace만 동기화를 지원합니다"
      );
    });
  });

  describe("getSyncLogs", () => {
    it("should return error when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { getSyncLogs } = await import("./integrations");
      const result = await getSyncLogs("int-1");
      expect(result.success).toBe(false);
      expect(result.message).toBe("인증이 필요합니다");
    });

    it("should return error when integration not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const { getSyncLogs } = await import("./integrations");
      const result = await getSyncLogs("non-existent");
      expect(result.success).toBe(false);
      expect(result.message).toBe("연동을 찾을 수 없습니다");
    });

    it("should return error when accessing other organization integration", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        organizationId: "org-2", // 다른 조직
      });

      const { getSyncLogs } = await import("./integrations");
      const result = await getSyncLogs("int-1");
      expect(result.success).toBe(false);
      expect(result.message).toBe("접근 권한이 없습니다");
    });

    it("should return sync logs with default limit", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const mockLogs = [
        {
          id: "log-1",
          status: "SUCCESS",
          itemsFound: 10,
          itemsCreated: 2,
          itemsUpdated: 8,
          errors: null,
          startedAt: new Date("2024-11-30T10:00:00Z"),
          completedAt: new Date("2024-11-30T10:05:00Z"),
        },
        {
          id: "log-2",
          status: "PARTIAL",
          itemsFound: 5,
          itemsCreated: 1,
          itemsUpdated: 3,
          errors: [{ code: "USER_ERROR", message: "일부 사용자 동기화 실패" }],
          startedAt: new Date("2024-11-29T10:00:00Z"),
          completedAt: new Date("2024-11-29T10:03:00Z"),
        },
      ];

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
      });
      (prisma.syncLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockLogs
      );

      const { getSyncLogs } = await import("./integrations");
      const result = await getSyncLogs("int-1");

      expect(result.success).toBe(true);
      expect(result.data?.logs).toHaveLength(2);
      expect(result.data?.logs?.[0].id).toBe("log-1");
      expect(result.data?.logs?.[0].status).toBe("SUCCESS");
      // Date가 ISO 문자열로 직렬화됨
      expect(typeof result.data?.logs?.[0].startedAt).toBe("string");
      expect(prisma.syncLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { integrationId: "int-1" },
          orderBy: { startedAt: "desc" },
          take: 10, // 기본값
        })
      );
    });

    it("should respect custom limit", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
      });
      (prisma.syncLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      const { getSyncLogs } = await import("./integrations");
      await getSyncLogs("int-1", 5);

      expect(prisma.syncLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  describe("updateIntegrationSettings", () => {
    it("should return error when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { updateIntegrationSettings } = await import("./integrations");
      const result = await updateIntegrationSettings("int-1", {
        autoSync: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("인증이 필요합니다");
    });

    it("should return error when integration not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const { updateIntegrationSettings } = await import("./integrations");
      const result = await updateIntegrationSettings("non-existent", {
        autoSync: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("연동을 찾을 수 없습니다");
    });

    it("should return error when accessing other organization integration", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
      });

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        organizationId: "org-2",
        metadata: {},
      });

      const { updateIntegrationSettings } = await import("./integrations");
      const result = await updateIntegrationSettings("int-1", {
        autoSync: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("접근 권한이 없습니다");
    });

    it("should update integration settings in metadata", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const existingMetadata = {
        domain: "example.com",
        autoSync: false,
      };

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
        metadata: existingMetadata,
      });
      (prisma.integration.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          id: "int-1",
          metadata: {
            ...existingMetadata,
            autoSync: true,
            syncInterval: "daily",
          },
        }
      );

      const { updateIntegrationSettings } = await import("./integrations");
      const result = await updateIntegrationSettings("int-1", {
        autoSync: true,
        syncInterval: "daily",
      });

      expect(result.success).toBe(true);
      expect(prisma.integration.update).toHaveBeenCalledWith({
        where: { id: "int-1" },
        data: {
          metadata: {
            domain: "example.com",
            autoSync: true,
            syncInterval: "daily",
          },
        },
      });
    });

    it("should merge settings without overwriting other metadata", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      });

      const existingMetadata = {
        domain: "example.com",
        adminEmail: "admin@example.com",
        syncUsers: true,
      };

      const { prisma } = await import("@/lib/db");
      (
        prisma.integration.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
        metadata: existingMetadata,
      });
      (prisma.integration.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        {}
      );

      const { updateIntegrationSettings } = await import("./integrations");
      await updateIntegrationSettings("int-1", {
        syncApps: true,
      });

      expect(prisma.integration.update).toHaveBeenCalledWith({
        where: { id: "int-1" },
        data: {
          metadata: {
            domain: "example.com",
            adminEmail: "admin@example.com",
            syncUsers: true,
            syncApps: true,
          },
        },
      });
    });
  });
});
