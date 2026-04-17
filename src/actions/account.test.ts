// src/actions/account.test.ts
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount } from "./account";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      count: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    invitation: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedSignOut = signOut as unknown as ReturnType<typeof vi.fn>;

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    expect(result.error).toBe("인증이 필요합니다");
  });

  it("세션에 user.id가 없으면 에러를 반환해야 한다", async () => {
    mockedAuth.mockResolvedValueOnce({ user: {} });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    expect(result.error).toBe("인증이 필요합니다");
  });

  it("조직의 마지막 ADMIN은 계정을 삭제할 수 없다", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: "ADMIN",
      },
    });

    vi.mocked(prisma.user.count).mockResolvedValueOnce(0);

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    expect(result.error).toContain("마지막 관리자");
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it("다른 ADMIN이 있으면 ADMIN도 계정을 삭제할 수 있다", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: "ADMIN",
      },
    });

    vi.mocked(prisma.user.count).mockResolvedValueOnce(1); // 다른 ADMIN 존재
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
      department: "IT",
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.invitation.deleteMany).mockResolvedValueOnce({
      count: 1,
    } as never);
    vi.mocked(prisma.user.delete).mockResolvedValueOnce({} as never);
    mockedSignOut.mockResolvedValueOnce(undefined);

    await deleteAccount();

    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    expect(mockedSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(redirect).toHaveBeenCalledWith("/login?deleted=true");
  });

  it("MEMBER는 ADMIN 체크 없이 계정을 삭제할 수 있다", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: {
        id: "user-2",
        organizationId: "org-1",
        role: "MEMBER",
      },
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      name: "Member User",
      email: "member@example.com",
      role: "MEMBER",
      department: null,
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.invitation.deleteMany).mockResolvedValueOnce({
      count: 0,
    } as never);
    vi.mocked(prisma.user.delete).mockResolvedValueOnce({} as never);
    mockedSignOut.mockResolvedValueOnce(undefined);

    await deleteAccount();

    // MEMBER는 user.count 호출 안함
    expect(prisma.user.count).not.toHaveBeenCalled();
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-2" },
    });
    expect(redirect).toHaveBeenCalledWith("/login?deleted=true");
  });

  it("삭제 전에 감사 로그를 기록해야 한다 (사용자 정보 포함)", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: {
        id: "user-3",
        organizationId: "org-1",
        role: "MEMBER",
      },
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      name: "Test User",
      email: "test@example.com",
      role: "MEMBER",
      department: "Engineering",
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.invitation.deleteMany).mockResolvedValueOnce({
      count: 0,
    } as never);
    vi.mocked(prisma.user.delete).mockResolvedValueOnce({} as never);
    mockedSignOut.mockResolvedValueOnce(undefined);

    await deleteAccount();

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        userId: "user-3",
        action: "DELETE",
        entityType: "User",
        entityId: "user-3",
        metadata: {
          reason: "self_deletion",
          deletedUserName: "Test User",
          deletedUserEmail: "test@example.com",
          deletedUserRole: "MEMBER",
          deletedUserDepartment: "Engineering",
        },
      },
    });
  });

  it("organizationId가 없는 사용자도 계정을 삭제할 수 있다", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: {
        id: "user-4",
        organizationId: null,
        role: "MEMBER",
      },
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      name: "No Org User",
      email: "noorg@example.com",
      role: "MEMBER",
      department: null,
    } as never);
    vi.mocked(prisma.user.delete).mockResolvedValueOnce({} as never);
    mockedSignOut.mockResolvedValueOnce(undefined);

    await deleteAccount();

    // organizationId 없으면 감사 로그 기록 안함
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-4" },
    });
    expect(redirect).toHaveBeenCalledWith("/login?deleted=true");
  });
});
