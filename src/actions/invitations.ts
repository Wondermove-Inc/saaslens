// src/actions/invitations.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { sendInvitationEmail } from "@/lib/services/notification/email";
import type { ActionState } from "@/types";
import type { Invitation, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  teamId?: string;
}

export interface InvitationWithInviter extends Invitation {
  invitedBy: {
    name: string | null;
  } | null;
}

const inviteSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  teamId: z.string().optional(),
});

// 초대 생성
async function _createInvitation(
  input: CreateInvitationInput | FormData
): Promise<ActionState> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    // 관리자 권한 확인
    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 팀원을 초대할 수 있습니다",
      };
    }

    const parsed =
      input instanceof FormData
        ? inviteSchema.safeParse({
            email: input.get("email"),
            role: input.get("role"),
            teamId: input.get("teamId") || undefined,
          })
        : inviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: "입력값을 확인해주세요",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { email, role, teamId } = parsed.data;

    // 이미 조직에 속한 사용자인지 확인
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        organizationId: session.user.organizationId,
      },
    });

    if (existingUser) {
      return {
        success: false,
        message: "이미 조직에 속한 사용자입니다",
      };
    }

    // 대기 중인 초대가 있는지 확인
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId: session.user.organizationId,
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      return {
        success: false,
        message: "이미 대기 중인 초대가 있습니다",
      };
    }

    // 기존 초대 삭제 (ACCEPTED/EXPIRED/CANCELLED 상태 - 재초대 허용)
    await prisma.invitation.deleteMany({
      where: {
        email,
        organizationId: session.user.organizationId,
        status: { not: "PENDING" },
      },
    });

    // 팀 유효성 검사 (teamId가 있는 경우)
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          organizationId: session.user.organizationId,
        },
      });

      if (!team) {
        return {
          success: false,
          message: "유효하지 않은 팀입니다",
        };
      }
    }

    // 만료일 설정 (7일 후)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 초대 생성
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        organizationId: session.user.organizationId,
        invitedById: session.user.id,
        teamId: teamId || null,
        status: "PENDING",
        expiresAt,
      },
      include: {
        organization: true,
        invitedBy: true,
      },
    });

    // 초대 이메일 발송
    await sendInvitationEmail({
      email: invitation.email,
      token: invitation.token,
      organizationName: invitation.organization.name,
      inviterName: invitation.invitedBy?.name || "관리자",
      role: invitation.role,
    });

    revalidatePath("/settings/team");

    return {
      success: true,
      message: "초대가 발송되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "초대 생성 오류");
    return {
      success: false,
      message: "초대 생성 중 오류가 발생했습니다",
    };
  }
}
export const createInvitation = withLogging(
  "createInvitation",
  _createInvitation
);

// 초대 목록 조회
export async function getInvitations(): Promise<
  ActionState<InvitationWithInviter[]>
> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      include: {
        invitedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: invitations,
    };
  } catch (error) {
    logger.error({ err: error }, "초대 목록 조회 오류");
    return {
      success: false,
      message: "초대 목록 조회 중 오류가 발생했습니다",
    };
  }
}

// 초대 취소
async function _cancelInvitation(
  input: string | FormData
): Promise<ActionState> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    // 관리자 권한 확인
    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 초대를 취소할 수 있습니다",
      };
    }

    const invitationId =
      input instanceof FormData ? (input.get("invitationId") as string) : input;

    if (!invitationId) {
      return { success: false, message: "초대 ID가 필요합니다" };
    }

    // 초대 확인
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: session.user.organizationId,
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: "초대를 찾을 수 없습니다",
      };
    }

    // 초대 취소
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/settings/team");

    return {
      success: true,
      message: "초대가 취소되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "초대 취소 오류");
    return {
      success: false,
      message: "초대 취소 중 오류가 발생했습니다",
    };
  }
}
export const cancelInvitation = withLogging(
  "cancelInvitation",
  _cancelInvitation
);

// 초대 재발송
async function _resendInvitation(
  input: string | FormData
): Promise<ActionState> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    // 관리자 권한 확인
    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 초대를 재발송할 수 있습니다",
      };
    }

    const invitationId =
      input instanceof FormData ? (input.get("invitationId") as string) : input;

    if (!invitationId) {
      return { success: false, message: "초대 ID가 필요합니다" };
    }

    // 초대 확인
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: session.user.organizationId,
      },
      include: {
        organization: true,
        invitedBy: true,
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: "초대를 찾을 수 없습니다",
      };
    }

    if (invitation.status !== "PENDING") {
      return {
        success: false,
        message: "대기 중인 초대만 재발송할 수 있습니다",
      };
    }

    // 새 토큰 및 만료일 생성
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const newToken = crypto.randomUUID();

    // 초대 업데이트
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        expiresAt,
        token: newToken,
        updatedAt: new Date(),
      },
      include: {
        organization: true,
        invitedBy: true,
      },
    });

    // 초대 이메일 재발송
    await sendInvitationEmail({
      email: updatedInvitation.email,
      token: updatedInvitation.token,
      organizationName: updatedInvitation.organization.name,
      inviterName: updatedInvitation.invitedBy?.name || "관리자",
      role: updatedInvitation.role,
    });

    revalidatePath("/settings/team");

    return {
      success: true,
      message: "초대가 재발송되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "초대 재발송 오류");
    return {
      success: false,
      message: "초대 재발송 중 오류가 발생했습니다",
    };
  }
}
export const resendInvitation = withLogging(
  "resendInvitation",
  _resendInvitation
);

// 초대 수락
async function _acceptInvitation(token: string): Promise<ActionState> {
  try {
    // 초대 확인
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: "PENDING",
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: "유효하지 않은 초대입니다",
      };
    }

    // 만료 확인
    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });

      return {
        success: false,
        message: "초대가 만료되었습니다",
      };
    }

    // 현재 로그인한 사용자 확인
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "로그인이 필요합니다",
      };
    }

    // 이메일 일치 확인
    if (session.user.email !== invitation.email) {
      return {
        success: false,
        message: "초대받은 이메일로 로그인해 주세요",
      };
    }

    // 이미 다른 조직에 속해 있는지 확인
    if (session.user.organizationId) {
      return {
        success: false,
        message: "이미 다른 조직에 속해 있습니다",
      };
    }

    // 초대 수락 처리
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", token: crypto.randomUUID() },
    });

    // 사용자 조직 연결 (upsert: 없으면 생성, 있으면 업데이트)
    await prisma.user.upsert({
      where: { email: session.user.email! },
      update: {
        organizationId: invitation.organizationId,
        role: invitation.role,
        teamId: invitation.teamId,
      },
      create: {
        email: session.user.email!,
        name: session.user.name,
        image: session.user.image,
        organizationId: invitation.organizationId,
        role: invitation.role,
        teamId: invitation.teamId,
      },
    });

    return {
      success: true,
      message: "초대를 수락했습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "초대 수락 오류");
    return {
      success: false,
      message: "초대 수락 중 오류가 발생했습니다",
    };
  }
}
export const acceptInvitation = withLogging(
  "acceptInvitation",
  _acceptInvitation
);
