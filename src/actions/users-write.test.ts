// src/actions/users-write.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    app: { updateMany: vi.fn() },
    corporateCard: { updateMany: vi.fn() },
    cardTransaction: { updateMany: vi.fn() },
    session: { deleteMany: vi.fn() },
    account: { deleteMany: vi.fn() },
    invitation: { deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/logging", () => ({
  withLogging: (_name: string, fn: unknown) => fn,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

// Import after mocks
const { _transferAdminRole, _offboardUser, _permanentlyDeleteUser } =
  await (async () => {
    const mod = await import("./users-write");
    return {
      _transferAdminRole: mod.transferAdminRole,
      _offboardUser: mod.offboardUser,
      _permanentlyDeleteUser: mod.permanentlyDeleteUser,
    };
  })();

const mockRequireOrganization = requireOrganization as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  app: { updateMany: ReturnType<typeof vi.fn> };
  corporateCard: { updateMany: ReturnType<typeof vi.fn> };
  cardTransaction: { updateMany: ReturnType<typeof vi.fn> };
  session: { deleteMany: ReturnType<typeof vi.fn> };
  account: { deleteMany: ReturnType<typeof vi.fn> };
  invitation: { deleteMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("users-write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrganization.mockResolvedValue({
      session: { user: { id: "admin-1" } },
      organizationId: "org-1",
      userId: "admin-1",
      role: "ADMIN",
    });
    // Default: not the last admin (1 other admin exists)
    mockPrisma.user.count.mockResolvedValue(1);
  });

  describe("transferAdminRole", () => {
    it("should transfer admin role successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        role: "MEMBER",
        status: "ACTIVE",
        organizationId: "org-1",
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await _transferAdminRole("member-1", "MEMBER");

      expect(result.success).toBe(true);
      expect(result.message).toBe("관리자 권한이 이관되었습니다");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "member-1" },
        data: { role: "ADMIN" },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "admin-1" },
        data: { role: "MEMBER" },
      });
    });

    it("should block non-admin users", async () => {
      mockRequireOrganization.mockResolvedValue({
        session: { user: { id: "member-1" } },
        organizationId: "org-1",
        userId: "member-1",
        role: "MEMBER",
      });

      const result = await _transferAdminRole("other-1", "MEMBER");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자만 권한을 이관할 수 있습니다");
    });

    it("should block self-transfer", async () => {
      const result = await _transferAdminRole("admin-1", "MEMBER");

      expect(result.success).toBe(false);
      expect(result.message).toBe("본인에게 이관할 수 없습니다");
    });

    it("should block when target user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await _transferAdminRole("nonexistent", "MEMBER");

      expect(result.success).toBe(false);
      expect(result.message).toBe("대상 사용자를 찾을 수 없습니다");
    });

    it("should block when target is not ACTIVE", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        status: "TERMINATED",
        organizationId: "org-1",
      });

      const result = await _transferAdminRole("member-1", "MEMBER");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "활성 상태의 사용자에게만 이관할 수 있습니다"
      );
    });

    it("should block when target is already ADMIN", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        role: "ADMIN",
        status: "ACTIVE",
        organizationId: "org-1",
      });

      const result = await _transferAdminRole("member-1", "MEMBER");

      expect(result.success).toBe(false);
      expect(result.message).toBe("대상 사용자가 이미 관리자입니다");
    });

    it("should handle transaction error", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        role: "MEMBER",
        status: "ACTIVE",
        organizationId: "org-1",
      });
      mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

      const result = await _transferAdminRole("member-1", "MEMBER");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한 이관에 실패했습니다");
    });
  });

  describe("offboardUser", () => {
    it("should offboard user successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        name: "Member",
        role: "MEMBER",
        status: "ACTIVE",
        department: "Engineering",
      });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await _offboardUser("member-1");

      expect(result.success).toBe(true);
      expect(result.message).toBe("사용자가 퇴사 처리되었습니다");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // Verify transaction includes status update and session/account cleanup
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "member-1" },
        data: { status: "TERMINATED", terminatedAt: expect.any(Date) },
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "member-1" },
      });
      expect(mockPrisma.account.deleteMany).toHaveBeenCalledWith({
        where: { userId: "member-1" },
      });
      expect(mockPrisma.invitation.deleteMany).toHaveBeenCalledWith({
        where: { email: "member@test.com", organizationId: "org-1" },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "OFFBOARD_USER",
          entityId: "member-1",
          metadata: expect.objectContaining({
            offboardedUserEmail: "member@test.com",
          }),
        }),
      });
    });

    it("should block non-admin users", async () => {
      mockRequireOrganization.mockResolvedValue({
        session: { user: { id: "member-1" } },
        organizationId: "org-1",
        userId: "member-1",
        role: "MEMBER",
      });

      const result = await _offboardUser("other-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자만 퇴사 처리할 수 있습니다");
    });

    it("should block self-offboard", async () => {
      const result = await _offboardUser("admin-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("본인은 퇴사 처리할 수 없습니다");
    });

    it("should block offboard of ADMIN user", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "admin-2",
        email: "admin2@test.com",
        role: "ADMIN",
        status: "ACTIVE",
      });

      const result = await _offboardUser("admin-2");

      expect(result.success).toBe(false);
      expect(result.message).toContain("관리자는 퇴사 처리할 수 없습니다");
    });

    it("should block when user already TERMINATED", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        role: "MEMBER",
        status: "TERMINATED",
      });

      const result = await _offboardUser("member-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("이미 퇴사 처리된 사용자입니다.");
    });

    it("should block when target user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await _offboardUser("nonexistent");

      expect(result.success).toBe(false);
      expect(result.message).toBe("사용자를 찾을 수 없습니다");
    });

    it("should handle transaction error", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        name: "Member",
        role: "MEMBER",
        status: "ACTIVE",
        department: null,
      });
      mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

      const result = await _offboardUser("member-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("퇴사 처리에 실패했습니다");
    });
  });

  describe("permanentlyDeleteUser", () => {
    it("should permanently delete user successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        name: "Member",
        role: "MEMBER",
        status: "TERMINATED",
        department: "Engineering",
      });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await _permanentlyDeleteUser("member-1");

      expect(result.success).toBe(true);
      expect(result.message).toBe("사용자가 영구 삭제되었습니다");
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "PERMANENTLY_DELETE_USER",
          entityId: "member-1",
          metadata: expect.objectContaining({
            deletedUserEmail: "member@test.com",
          }),
        }),
      });
    });

    it("should block non-admin users", async () => {
      mockRequireOrganization.mockResolvedValue({
        session: { user: { id: "member-1" } },
        organizationId: "org-1",
        userId: "member-1",
        role: "MEMBER",
      });

      const result = await _permanentlyDeleteUser("other-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자만 사용자를 영구 삭제할 수 있습니다");
    });

    it("should block self-deletion", async () => {
      const result = await _permanentlyDeleteUser("admin-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("본인은 삭제할 수 없습니다");
    });

    it("should block when user is not TERMINATED", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        role: "MEMBER",
        status: "ACTIVE",
      });

      const result = await _permanentlyDeleteUser("member-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "퇴사 처리된 사용자만 영구 삭제할 수 있습니다"
      );
    });

    it("should block when target user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await _permanentlyDeleteUser("nonexistent");

      expect(result.success).toBe(false);
      expect(result.message).toBe("사용자를 찾을 수 없습니다");
    });

    it("should handle transaction error", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        name: "Member",
        role: "MEMBER",
        status: "TERMINATED",
        department: null,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

      const result = await _permanentlyDeleteUser("member-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("사용자 영구 삭제에 실패했습니다");
    });

    it("should reassign related data before deletion", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "member-1",
        email: "member@test.com",
        name: "Member",
        role: "MEMBER",
        status: "TERMINATED",
        department: null,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([]);

      await _permanentlyDeleteUser("member-1");

      // Verify transaction was called with 6 operations
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // Verify individual reassignment calls were made
      expect(mockPrisma.app.updateMany).toHaveBeenCalledWith({
        where: { ownerId: "member-1" },
        data: { ownerId: null },
      });
      expect(mockPrisma.corporateCard.updateMany).toHaveBeenCalledWith({
        where: { assignedUserId: "member-1" },
        data: { assignedUserId: null },
      });
      expect(mockPrisma.cardTransaction.updateMany).toHaveBeenCalledWith({
        where: { userId: "member-1" },
        data: { userId: null },
      });
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { managerId: "member-1" },
        data: { managerId: null },
      });
      expect(mockPrisma.invitation.deleteMany).toHaveBeenCalledWith({
        where: { email: "member@test.com", organizationId: "org-1" },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: "member-1" },
      });
    });
  });
});
