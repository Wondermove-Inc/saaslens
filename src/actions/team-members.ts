// src/actions/team-members.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface UpdateMemberRoleInput {
  userId: string;
  role: UserRole;
}

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  status: string;
  image: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

// 팀원 역할 변경
async function _updateMemberRole(
  input: UpdateMemberRoleInput
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
        message: "관리자만 역할을 변경할 수 있습니다",
      };
    }

    // 자기 자신의 역할 변경 불가
    if (input.userId === session.user.id) {
      return {
        success: false,
        message: "자신의 역할은 변경할 수 없습니다",
      };
    }

    // 대상 사용자 확인
    const targetUser = await prisma.user.findFirst({
      where: {
        id: input.userId,
        organizationId: session.user.organizationId,
      },
    });

    if (!targetUser) {
      return {
        success: false,
        message: "팀원을 찾을 수 없습니다",
      };
    }

    // 역할 업데이트
    await prisma.user.update({
      where: { id: input.userId },
      data: { role: input.role },
    });

    revalidatePath("/settings/team");

    return {
      success: true,
      message: "역할이 변경되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "역할 변경 오류");
    return {
      success: false,
      message: "역할 변경 중 오류가 발생했습니다",
    };
  }
}
export const updateMemberRole = withLogging(
  "updateMemberRole",
  _updateMemberRole
);

// 팀원 제거
async function _removeMember(userId: string): Promise<ActionState> {
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
        message: "관리자만 팀원을 제거할 수 있습니다",
      };
    }

    // 자기 자신 제거 불가
    if (userId === session.user.id) {
      return {
        success: false,
        message: "자신은 제거할 수 없습니다",
      };
    }

    // 대상 사용자 확인
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: session.user.organizationId,
      },
    });

    if (!targetUser) {
      return {
        success: false,
        message: "팀원을 찾을 수 없습니다",
      };
    }

    // 마지막 관리자인지 확인
    if (targetUser.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: {
          organizationId: session.user.organizationId,
          role: "ADMIN",
        },
      });

      if (adminCount <= 1) {
        return {
          success: false,
          message: "조직의 마지막 관리자는 제거할 수 없습니다",
        };
      }
    }

    // 조직에서 제거 (organizationId를 null로 설정)
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: null,
        role: "VIEWER", // 기본 역할로 리셋
      },
    });

    revalidatePath("/settings/team");

    return {
      success: true,
      message: "팀원이 제거되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "팀원 제거 오류");
    return {
      success: false,
      message: "팀원 제거 중 오류가 발생했습니다",
    };
  }
}
export const removeMember = withLogging("removeMember", _removeMember);

// 팀원 목록 조회
export async function getTeamMembers(): Promise<ActionState<TeamMember[]>> {
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

    const members = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      data: members,
    };
  } catch (error) {
    logger.error({ err: error }, "팀원 목록 조회 오류");
    return {
      success: false,
      message: "팀원 목록 조회 중 오류가 발생했습니다",
    };
  }
}
