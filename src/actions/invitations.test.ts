// src/actions/invitations.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    invitation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock("@/lib/services/notification/email", () => ({
  sendInvitationEmail: vi.fn(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/services/notification/email";
import { revalidatePath } from "next/cache";
import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  getInvitations,
  resendInvitation,
} from "./invitations";

describe("invitations actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createInvitation", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await createInvitation({
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("조직 ID가 없는 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: null, role: "ADMIN" },
      } as never);

      const result = await createInvitation({
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(result).toEqual({
        success: false,
        message: "조직 정보가 필요합니다",
      });
    });

    it("ADMIN이 아닌 사용자는 초대할 수 없어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await createInvitation({
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(result).toEqual({
        success: false,
        message: "관리자만 팀원을 초대할 수 있습니다",
      });
    });

    it("이미 조직에 속한 사용자는 초대할 수 없어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "existing-user",
        email: "newuser@example.com",
      } as never);

      const result = await createInvitation({
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(result).toEqual({
        success: false,
        message: "이미 조직에 속한 사용자입니다",
      });
    });

    it("대기 중인 초대가 있으면 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: "inv-1",
        email: "newuser@example.com",
        status: "PENDING",
      } as never);

      const result = await createInvitation({
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(result).toEqual({
        success: false,
        message: "이미 대기 중인 초대가 있습니다",
      });
    });

    it("새로운 초대를 생성해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: "inv-1",
        email: "newuser@example.com",
        role: "MEMBER",
        token: "test-token",
        organization: { name: "테스트 조직" },
        invitedBy: { name: "Admin User" },
      } as never);
      vi.mocked(sendInvitationEmail).mockResolvedValue({ success: true });

      const result = await createInvitation({
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(result.success).toBe(true);
      expect(prisma.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "newuser@example.com",
          role: "MEMBER",
          organizationId: "org-1",
          invitedById: "user-1",
          status: "PENDING",
        }),
        include: expect.objectContaining({
          organization: true,
          invitedBy: true,
        }),
      });
    });

    it("초대 생성 후 이메일을 발송해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: "inv-1",
        email: "newuser@example.com",
        role: "MEMBER",
        token: "test-token",
        organization: { name: "테스트 조직" },
        invitedBy: { name: "Admin User" },
      } as never);
      vi.mocked(sendInvitationEmail).mockResolvedValue({ success: true });

      await createInvitation({
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "newuser@example.com",
          token: "test-token",
        })
      );
    });

    it("초대 생성 후 revalidatePath를 호출해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: "inv-1",
        email: "newuser@example.com",
        token: "test-token",
        organization: { name: "테스트 조직" },
        invitedBy: { name: "Admin User" },
      } as never);
      vi.mocked(sendInvitationEmail).mockResolvedValue({ success: true });

      await createInvitation({
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(revalidatePath).toHaveBeenCalledWith("/settings/team");
    });
  });

  describe("getInvitations", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await getInvitations();

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("조직의 모든 초대를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockInvitations = [
        {
          id: "inv-1",
          email: "user1@example.com",
          role: "MEMBER",
          status: "PENDING",
          createdAt: new Date(),
          expiresAt: new Date(),
          invitedBy: { name: "Admin User" },
        },
      ];

      vi.mocked(prisma.invitation.findMany).mockResolvedValue(
        mockInvitations as never
      );

      const result = await getInvitations();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvitations);
    });
  });

  describe("cancelInvitation", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await cancelInvitation("inv-1");

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("존재하지 않는 초대는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);

      const result = await cancelInvitation("inv-1");

      expect(result).toEqual({
        success: false,
        message: "초대를 찾을 수 없습니다",
      });
    });

    it("초대를 취소해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: "inv-1",
        organizationId: "org-1",
        status: "PENDING",
      } as never);

      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: "inv-1",
        status: "CANCELLED",
      } as never);

      const result = await cancelInvitation("inv-1");

      expect(result.success).toBe(true);
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: "CANCELLED" },
      });
    });
  });

  describe("resendInvitation", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await resendInvitation("inv-1");

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("대기 중인 초대가 아니면 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: "inv-1",
        status: "ACCEPTED",
      } as never);

      const result = await resendInvitation("inv-1");

      expect(result).toEqual({
        success: false,
        message: "대기 중인 초대만 재발송할 수 있습니다",
      });
    });

    it("초대 이메일을 재발송해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: "inv-1",
        email: "user@example.com",
        token: "test-token",
        status: "PENDING",
        organizationId: "org-1",
        organization: { name: "테스트 조직" },
        invitedBy: { name: "Admin User" },
      } as never);

      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: "inv-1",
        email: "user@example.com",
        token: "new-token",
        role: "MEMBER",
        organization: { name: "테스트 조직" },
        invitedBy: { name: "Admin User" },
      } as never);

      vi.mocked(sendInvitationEmail).mockResolvedValue({ success: true });

      const result = await resendInvitation("inv-1");

      expect(result.success).toBe(true);
      expect(sendInvitationEmail).toHaveBeenCalled();
    });

    it("FormData로 호출해도 재발송되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: "inv-1",
        email: "user@example.com",
        token: "test-token",
        status: "PENDING",
        organizationId: "org-1",
        organization: { name: "테스트 조직" },
        invitedBy: { name: "Admin User" },
      } as never);

      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: "inv-1",
        email: "user@example.com",
        token: "new-token",
        role: "MEMBER",
        organization: { name: "테스트 조직" },
        invitedBy: { name: "Admin User" },
      } as never);

      const formData = new FormData();
      formData.set("invitationId", "inv-1");

      const result = await resendInvitation(formData);

      expect(result.success).toBe(true);
      expect(prisma.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "inv-1" } })
      );
    });
  });

  describe("acceptInvitation", () => {
    it("유효하지 않은 토큰은 에러를 반환해야 한다", async () => {
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);

      const result = await acceptInvitation("invalid-token");

      expect(result).toEqual({
        success: false,
        message: "유효하지 않은 초대입니다",
      });
    });

    it("만료된 초대는 에러를 반환해야 한다", async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: "inv-1",
        token: "test-token",
        status: "PENDING",
        expiresAt: expiredDate,
      } as never);

      const result = await acceptInvitation("test-token");

      expect(result).toEqual({
        success: false,
        message: "초대가 만료되었습니다",
      });
    });

    it("초대를 수락하고 사용자를 조직에 추가해야 한다", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
      } as never);

      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: "inv-1",
        token: "test-token",
        status: "PENDING",
        email: "user@example.com",
        role: "MEMBER",
        organizationId: "org-1",
        expiresAt: futureDate,
      } as never);

      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: "inv-1",
        status: "ACCEPTED",
      } as never);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "user-1",
        organizationId: "org-1",
      } as never);

      const result = await acceptInvitation("test-token");

      expect(result.success).toBe(true);
      expect(prisma.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv-1" },
          data: expect.objectContaining({ status: "ACCEPTED" }),
        })
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          organizationId: "org-1",
          role: "MEMBER",
        },
      });
    });
  });
});
