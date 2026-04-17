// src/actions/account.ts
"use server";

/**
 * Account 관련 Server Actions
 * - 계정 삭제
 */

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import { redirect } from "next/navigation";

/**
 * 본인 계정 삭제
 *
 * 제약사항:
 * - 조직의 마지막 ADMIN인 경우 삭제 불가
 *
 * 데이터 처리:
 * - Cascade 삭제: accounts, sessions, appAccesses
 * - SetNull 처리: ownedApps, auditLogs, invitations, schedules, devices, directReports
 */
async function _deleteAccount(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "인증이 필요합니다" };
  }

  const userId = session.user.id;
  const organizationId = session.user.organizationId;

  // 조직의 마지막 ADMIN인지 확인
  if (organizationId && session.user.role === "ADMIN") {
    const otherAdminCount = await prisma.user.count({
      where: {
        organizationId,
        role: "ADMIN",
        id: { not: userId },
      },
    });

    if (otherAdminCount === 0) {
      return {
        success: false,
        error:
          "조직의 마지막 관리자는 계정을 삭제할 수 없습니다. 다른 관리자를 지정한 후 다시 시도하세요.",
      };
    }
  }

  // 삭제 전 사용자 정보 조회 (감사 로그용)
  const userToDelete = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      role: true,
      department: true,
    },
  });

  // 감사 로그 기록 (삭제 전 - 사용자 정보 보존)
  if (organizationId) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "DELETE",
        entityType: "User",
        entityId: userId,
        metadata: {
          reason: "self_deletion",
          // 삭제된 사용자 정보 보존 (userId가 SetNull되어도 조회 가능)
          deletedUserName: userToDelete?.name,
          deletedUserEmail: userToDelete?.email,
          deletedUserRole: userToDelete?.role,
          deletedUserDepartment: userToDelete?.department,
        },
      },
    });

    // 초대 레코드 삭제 (재초대 가능하도록)
    if (userToDelete?.email) {
      await prisma.invitation.deleteMany({
        where: {
          email: userToDelete.email,
          organizationId,
        },
      });
    }
  }

  // User 삭제 (Cascade/SetNull 자동 처리)
  await prisma.user.delete({
    where: { id: userId },
  });

  // 세션 무효화
  await signOut({ redirect: false });

  // 로그인 페이지로 리다이렉트
  redirect("/login?deleted=true");
}
export const deleteAccount = withLogging("deleteAccount", _deleteAccount);
