// src/actions/users-write.ts
"use server";

/**
 * User 수정/삭제 관련 Server Actions
 */

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { isLastAdmin } from "./users-utils";
import { updateUserSchema } from "./users.types";

/**
 * 사용자 정보 수정
 */
async function _updateUser(
  id: string,
  _prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  const { organizationId, userId } = await requireOrganization();

  // Check if user exists and belongs to organization
  const existingUser = await prisma.user.findFirst({
    where: {
      id,
      organizationId,
    },
  });

  if (!existingUser) {
    return { success: false, message: "사용자를 찾을 수 없습니다" };
  }

  // Parse and validate form data
  const rawData = {
    name: formData.get("name") as string | null,
    role: formData.get("role") as string | null,
    status: formData.get("status") as string | null,
    department: formData.get("department") as string | null,
    jobTitle: formData.get("jobTitle") as string | null,
    employeeId: formData.get("employeeId") as string | null,
  };

  // Filter out null/empty values
  const dataToValidate = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== null && v !== "")
  );

  const validationResult = updateUserSchema.safeParse(dataToValidate);

  if (!validationResult.success) {
    return {
      success: false,
      message: "입력 데이터가 올바르지 않습니다",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  try {
    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (rawData.name) updateData.name = rawData.name;
    if (rawData.role) updateData.role = rawData.role;
    if (rawData.status) {
      updateData.status = rawData.status;
      if (rawData.status === "TERMINATED") {
        updateData.terminatedAt = new Date();
      } else {
        updateData.terminatedAt = null;
      }
    }
    if (rawData.department !== null)
      updateData.department = rawData.department || null;
    if (rawData.jobTitle !== null)
      updateData.jobTitle = rawData.jobTitle || null;
    if (rawData.employeeId !== null)
      updateData.employeeId = rawData.employeeId || null;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "UPDATE_USER",
        entityType: "User",
        entityId: updated.id,
        userId,
        organizationId,
        metadata: {
          email: updated.email,
          updatedFields: Object.keys(updateData),
        },
      },
    });

    revalidatePath("/users");
    revalidatePath(`/users/${id}`);

    return {
      success: true,
      message: "사용자 정보가 수정되었습니다",
      data: { id: updated.id },
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to update user");
    return { success: false, message: "사용자 수정에 실패했습니다" };
  }
}
export const updateUser = withLogging("updateUser", _updateUser);

/**
 * 사용자 특정 앱 접근 권한 회수
 */
async function _revokeUserAppAccess(
  userIdToRevoke: string,
  appId: string
): Promise<ActionState> {
  const { organizationId, userId } = await requireOrganization();

  // Find user with app access
  const user = await prisma.user.findFirst({
    where: {
      id: userIdToRevoke,
      organizationId,
    },
    include: {
      appAccesses: {
        where: { appId },
        include: { app: true },
      },
    },
  });

  if (!user) {
    return { success: false, message: "사용자를 찾을 수 없습니다" };
  }

  const access = user.appAccesses[0];
  if (!access) {
    return { success: false, message: "접근 권한을 찾을 수 없습니다" };
  }

  try {
    // 해당 앱의 구독에 배정된 SubscriptionUser 조회
    const affectedSubscriptionUsers = await prisma.subscriptionUser.findMany({
      where: {
        userId: userIdToRevoke,
        subscription: { appId },
      },
      select: { id: true, subscriptionId: true },
    });
    const affectedSubscriptionIds = affectedSubscriptionUsers.map(
      (su) => su.subscriptionId
    );

    // UserAppAccess 삭제 + SubscriptionUser 삭제 + usedLicenses 재계산
    await prisma.$transaction(async (tx) => {
      await tx.userAppAccess.delete({
        where: { id: access.id },
      });

      if (affectedSubscriptionUsers.length > 0) {
        await tx.subscriptionUser.deleteMany({
          where: {
            userId: userIdToRevoke,
            subscription: { appId },
          },
        });

        for (const subscriptionId of affectedSubscriptionIds) {
          const count = await tx.subscriptionUser.count({
            where: { subscriptionId },
          });
          await tx.subscription.update({
            where: { id: subscriptionId },
            data: { usedLicenses: count },
          });
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "REVOKE_ACCESS",
        entityType: "UserAppAccess",
        entityId: access.id,
        userId,
        organizationId,
        metadata: { userEmail: user.email, appId, appName: access.app.name },
      },
    });

    revalidatePath("/users");
    revalidatePath(`/users/${userIdToRevoke}`);
    revalidatePath("/users/offboarded");
    revalidatePath("/subscriptions");
    for (const subscriptionId of affectedSubscriptionIds) {
      revalidatePath(`/subscriptions/${subscriptionId}`);
    }

    return {
      success: true,
      message: `${access.app.name} 접근 권한이 회수되었습니다`,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to revoke access");
    return { success: false, message: "접근 권한 회수에 실패했습니다" };
  }
}
export const revokeUserAppAccess = withLogging(
  "revokeUserAppAccess",
  _revokeUserAppAccess
);

/**
 * 사용자 모든 앱 접근 권한 회수
 */
async function _revokeAllUserAppAccess(
  userIdToRevoke: string
): Promise<ActionState> {
  const { organizationId, userId } = await requireOrganization();

  // Find user with both appAccesses and subscriptionAssignments
  const user = await prisma.user.findFirst({
    where: {
      id: userIdToRevoke,
      organizationId,
    },
    include: {
      appAccesses: true,
      subscriptionAssignments: true,
    },
  });

  if (!user) {
    return { success: false, message: "사용자를 찾을 수 없습니다" };
  }

  const appAccessCount = user.appAccesses.length;
  const subscriptionAssignmentCount = user.subscriptionAssignments.length;

  if (appAccessCount + subscriptionAssignmentCount === 0) {
    return { success: false, message: "회수할 접근 권한이 없습니다" };
  }

  try {
    // 삭제 전 영향받는 구독 ID 수집
    const affectedSubscriptionIds = user.subscriptionAssignments.map(
      (sa) => sa.subscriptionId
    );

    // Interactive 트랜잭션: 삭제 후 usedLicenses 재계산
    const {
      appAccessCount: revokedAppAccessCount,
      subscriptionCount: revokedSubscriptionCount,
    } = await prisma.$transaction(async (tx) => {
      const appAccessResult = await tx.userAppAccess.deleteMany({
        where: { userId: userIdToRevoke },
      });

      const subscriptionResult = await tx.subscriptionUser.deleteMany({
        where: { userId: userIdToRevoke },
      });

      // 영향받는 구독의 usedLicenses 재계산
      for (const subscriptionId of affectedSubscriptionIds) {
        const count = await tx.subscriptionUser.count({
          where: { subscriptionId },
        });
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: { usedLicenses: count },
        });
      }

      return {
        appAccessCount: appAccessResult.count,
        subscriptionCount: subscriptionResult.count,
      };
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "REVOKE_ALL_ACCESS",
        entityType: "UserAppAccess",
        entityId: userIdToRevoke,
        userId,
        organizationId,
        metadata: {
          userEmail: user.email,
          revokedAppAccessCount,
          revokedSubscriptionAssignmentCount: revokedSubscriptionCount,
          revokedCount: revokedAppAccessCount + revokedSubscriptionCount,
        },
      },
    });

    const totalRevoked = revokedAppAccessCount + revokedSubscriptionCount;

    revalidatePath("/users");
    revalidatePath(`/users/${userIdToRevoke}`);
    revalidatePath("/users/offboarded");
    revalidatePath("/subscriptions");
    for (const subscriptionId of affectedSubscriptionIds) {
      revalidatePath(`/subscriptions/${subscriptionId}`);
    }

    return {
      success: true,
      message: `${totalRevoked}개의 접근 권한이 회수되었습니다`,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to revoke all access");
    return { success: false, message: "접근 권한 회수에 실패했습니다" };
  }
}
export const revokeAllUserAppAccess = withLogging(
  "revokeAllUserAppAccess",
  _revokeAllUserAppAccess
);

/**
 * Admin 권한 이관
 * 현재 ADMIN이 대상자에게 ADMIN 역할을 이관하고, 본인은 newSelfRole로 변경
 */
async function _transferAdminRole(
  targetUserId: string,
  newSelfRole: Exclude<UserRole, "ADMIN">
): Promise<ActionState> {
  const { organizationId, userId, role } = await requireOrganization();

  if (role !== "ADMIN") {
    return { success: false, message: "관리자만 권한을 이관할 수 있습니다" };
  }

  if (targetUserId === userId) {
    return { success: false, message: "본인에게 이관할 수 없습니다" };
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      organizationId,
    },
  });

  if (!targetUser) {
    return { success: false, message: "대상 사용자를 찾을 수 없습니다" };
  }

  if (targetUser.status !== "ACTIVE") {
    return {
      success: false,
      message: "활성 상태의 사용자에게만 이관할 수 있습니다",
    };
  }

  if (targetUser.role === "ADMIN") {
    return {
      success: false,
      message: "대상 사용자가 이미 관리자입니다",
    };
  }

  const lastAdmin = await isLastAdmin(organizationId, userId);
  if (lastAdmin) {
    logger.info(
      { userId, targetUserId, organizationId },
      "Last admin transferring role"
    );
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { role: "ADMIN" },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { role: newSelfRole },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        action: "TRANSFER_ADMIN",
        entityType: "User",
        entityId: targetUserId,
        userId,
        organizationId,
        metadata: {
          fromUserId: userId,
          toUserId: targetUserId,
          toUserEmail: targetUser.email,
          newSelfRole,
        },
      },
    });

    revalidatePath("/settings/team");
    revalidatePath("/users");

    return {
      success: true,
      message: "관리자 권한이 이관되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to transfer admin role");
    return { success: false, message: "관리자 권한 이관에 실패했습니다" };
  }
}
export const transferAdminRole = withLogging(
  "transferAdminRole",
  _transferAdminRole
);

/**
 * Admin 주도 사용자 퇴사 처리 (Offboard)
 * 사용자 상태를 TERMINATED로 변경하고 세션/계정을 무효화.
 * 관련 데이터(앱 소유, 카드, 트랜잭션 등)는 유지하여 offboarded 페이지에서 관리 가능.
 */
async function _offboardUser(targetUserId: string): Promise<ActionState> {
  const { organizationId, userId, role } = await requireOrganization();

  if (role !== "ADMIN") {
    return { success: false, message: "관리자만 퇴사 처리할 수 있습니다" };
  }

  if (targetUserId === userId) {
    return {
      success: false,
      message: "본인은 퇴사 처리할 수 없습니다.",
    };
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      organizationId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      department: true,
    },
  });

  if (!targetUser) {
    return { success: false, message: "사용자를 찾을 수 없습니다" };
  }

  if (targetUser.role === "ADMIN") {
    return {
      success: false,
      message:
        "관리자는 퇴사 처리할 수 없습니다. 먼저 관리자 권한을 다른 멤버에게 이관하세요.",
    };
  }

  if (targetUser.status === "TERMINATED") {
    return {
      success: false,
      message: "이미 퇴사 처리된 사용자입니다.",
    };
  }

  try {
    await prisma.$transaction([
      // 사용자 상태를 TERMINATED로 변경
      prisma.user.update({
        where: { id: targetUserId },
        data: { status: "TERMINATED", terminatedAt: new Date() },
      }),
      // 세션 삭제 (로그인 차단)
      prisma.session.deleteMany({
        where: { userId: targetUserId },
      }),
      // 계정 삭제 (OAuth 연동 해제)
      prisma.account.deleteMany({
        where: { userId: targetUserId },
      }),
      // 초대 레코드 삭제 (재초대 가능하도록)
      prisma.invitation.deleteMany({
        where: {
          email: targetUser.email,
          organizationId,
        },
      }),
    ]);

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        action: "OFFBOARD_USER",
        entityType: "User",
        entityId: targetUserId,
        userId,
        organizationId,
        metadata: {
          offboardedUserName: targetUser.name,
          offboardedUserEmail: targetUser.email,
          offboardedUserRole: targetUser.role,
          offboardedUserDepartment: targetUser.department,
          offboardedBy: userId,
        },
      },
    });

    revalidatePath("/settings/team");
    revalidatePath("/users");
    revalidatePath("/users/offboarded");

    return {
      success: true,
      message: "사용자가 퇴사 처리되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to offboard user");
    return { success: false, message: "퇴사 처리에 실패했습니다" };
  }
}
export const offboardUser = withLogging("offboardUser", _offboardUser);

/**
 * 퇴사 처리된 사용자 영구 삭제 (Permanent Delete)
 * TERMINATED 상태인 사용자만 대상. 관련 데이터 null 재배정 후 cascade 삭제.
 */
async function _permanentlyDeleteUser(
  targetUserId: string
): Promise<ActionState> {
  const { organizationId, userId, role } = await requireOrganization();

  if (role !== "ADMIN") {
    return {
      success: false,
      message: "관리자만 사용자를 영구 삭제할 수 있습니다",
    };
  }

  if (targetUserId === userId) {
    return {
      success: false,
      message: "본인은 삭제할 수 없습니다.",
    };
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      organizationId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      department: true,
    },
  });

  if (!targetUser) {
    return { success: false, message: "사용자를 찾을 수 없습니다" };
  }

  if (targetUser.status !== "TERMINATED") {
    return {
      success: false,
      message:
        "퇴사 처리된 사용자만 영구 삭제할 수 있습니다. 먼저 퇴사 처리하세요.",
    };
  }

  try {
    // 감사 로그 기록 (삭제 전)
    await prisma.auditLog.create({
      data: {
        action: "PERMANENTLY_DELETE_USER",
        entityType: "User",
        entityId: targetUserId,
        userId,
        organizationId,
        metadata: {
          deletedUserName: targetUser.name,
          deletedUserEmail: targetUser.email,
          deletedUserRole: targetUser.role,
          deletedUserDepartment: targetUser.department,
          deletedBy: userId,
        },
      },
    });

    // 삭제 전 영향받는 구독 ID 수집
    const affectedSubscriptions = await prisma.subscriptionUser.findMany({
      where: { userId: targetUserId },
      select: { subscriptionId: true },
    });
    const affectedSubscriptionIds = affectedSubscriptions.map(
      (s) => s.subscriptionId
    );

    // 관련 데이터 재배정/해제 + 삭제를 interactive 트랜잭션으로 처리
    await prisma.$transaction(async (tx) => {
      // 소유 앱 → 소유자 해제
      await tx.app.updateMany({
        where: { ownerId: targetUserId },
        data: { ownerId: null },
      });
      // 배정 카드 → 배정자 해제
      await tx.corporateCard.updateMany({
        where: { assignedUserId: targetUserId },
        data: { assignedUserId: null },
      });
      // 배정 트랜잭션 → 배정자 해제
      await tx.cardTransaction.updateMany({
        where: { userId: targetUserId },
        data: { userId: null },
      });
      // 직속 부하 → 매니저 해제
      await tx.user.updateMany({
        where: { managerId: targetUserId },
        data: { managerId: null },
      });
      // 초대 레코드 삭제 (재초대 가능하도록)
      await tx.invitation.deleteMany({
        where: {
          email: targetUser.email,
          organizationId,
        },
      });
      // User 삭제 (cascade: accounts, sessions, appAccesses, subscriptionAssignments 등)
      await tx.user.delete({
        where: { id: targetUserId },
      });

      // 영향받는 구독의 usedLicenses 재계산
      for (const subscriptionId of affectedSubscriptionIds) {
        const count = await tx.subscriptionUser.count({
          where: { subscriptionId },
        });
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: { usedLicenses: count },
        });
      }
    });

    revalidatePath("/settings/team");
    revalidatePath("/users");
    revalidatePath("/users/offboarded");
    revalidatePath("/subscriptions");
    for (const subscriptionId of affectedSubscriptionIds) {
      revalidatePath(`/subscriptions/${subscriptionId}`);
    }

    return {
      success: true,
      message: "사용자가 영구 삭제되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to permanently delete user");
    return { success: false, message: "사용자 영구 삭제에 실패했습니다" };
  }
}
export const permanentlyDeleteUser = withLogging(
  "permanentlyDeleteUser",
  _permanentlyDeleteUser
);
