// src/actions/subscriptions/subscription-seat-management.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type { SeatDetails, SeatUser } from "@/types/subscription";
import { revalidatePath } from "next/cache";

const INACTIVE_DAYS_THRESHOLD = 30;

/**
 * 구독의 Seat 상세 정보 조회
 * SubscriptionUser + UserAppAccess.lastUsedAt 크로스 조인
 */
export async function getSubscriptionSeatDetails(
  subscriptionId: string
): Promise<ActionState<SeatDetails>> {
  try {
    const { organizationId } = await requireOrganization();

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, organizationId },
      select: {
        id: true,
        appId: true,
        totalLicenses: true,
        usedLicenses: true,
      },
    });

    if (!subscription) {
      return { success: false, error: "구독을 찾을 수 없습니다" };
    }

    const totalSeats = subscription.totalLicenses ?? 0;

    // SubscriptionUser + User 정보 조회
    const subscriptionUsers = await prisma.subscriptionUser.findMany({
      where: { subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    // UserAppAccess에서 lastUsedAt 매핑
    const userIds = subscriptionUsers.map((su) => su.userId);
    const appAccesses = await prisma.userAppAccess.findMany({
      where: {
        userId: { in: userIds },
        appId: subscription.appId,
      },
      select: {
        userId: true,
        lastUsedAt: true,
      },
    });

    const lastUsedMap = new Map(
      appAccesses.map((a) => [a.userId, a.lastUsedAt])
    );

    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVE_DAYS_THRESHOLD);

    const assignedUsers: SeatUser[] = subscriptionUsers.map((su) => {
      const lastUsedAt = lastUsedMap.get(su.userId) ?? null;

      // 활성 판단:
      // 1. lastUsedAt 있고 30일 이내 → 활성
      // 2. lastUsedAt 있고 30일 초과 → 비활성
      // 3. UserAppAccess 없거나 lastUsedAt null → 할당되어 있으므로 활성 (fallback)
      let isInactive: boolean;
      if (lastUsedAt) {
        isInactive = lastUsedAt < thresholdDate;
      } else {
        // lastUsedAt이 null: 레코드 없거나 null → 할당 fallback → 활성
        isInactive = false;
      }

      return {
        id: su.user.id,
        name: su.user.name,
        email: su.user.email,
        assignedAt: su.assignedAt,
        assignedBy: su.assignedBy,
        lastUsedAt,
        isInactive,
      };
    });

    const usedSeats = assignedUsers.length;
    const inactiveSeats = assignedUsers.filter((u) => u.isInactive).length;

    return {
      success: true,
      data: {
        assignedUsers,
        totalSeats,
        usedSeats,
        unassignedSeats: Math.max(0, totalSeats - usedSeats),
        inactiveSeats,
      },
    };
  } catch (error) {
    console.error("Seat 상세 조회 오류:", error);
    return { success: false, error: "Seat 상세 정보 조회에 실패했습니다" };
  }
}

/**
 * 구독에 유저 할당
 * Seat 용량 검증 + SubscriptionUser 생성 + usedLicenses 갱신
 */
export async function assignUserToSubscription(
  subscriptionId: string,
  userId: string
): Promise<ActionState<{ assignedAt: Date }>> {
  try {
    const { organizationId, userId: currentUserId } =
      await requireOrganization();

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, organizationId },
      select: {
        id: true,
        totalLicenses: true,
        _count: { select: { assignedUsers: true } },
      },
    });

    if (!subscription) {
      return { success: false, error: "구독을 찾을 수 없습니다" };
    }

    // Seat 용량 검증
    if (
      subscription.totalLicenses !== null &&
      subscription._count.assignedUsers >= subscription.totalLicenses
    ) {
      return { success: false, error: "Seat 한도에 도달했습니다" };
    }

    // 유저가 같은 조직인지 검증
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, teamId: true },
    });

    if (!user) {
      return { success: false, error: "유저를 찾을 수 없습니다" };
    }

    // 중복 검증
    const existing = await prisma.subscriptionUser.findUnique({
      where: {
        subscriptionId_userId: { subscriptionId, userId },
      },
    });

    if (existing) {
      return { success: false, error: "이미 배정된 유저입니다" };
    }

    // SubscriptionUser 생성 + usedLicenses 갱신 (트랜잭션)
    const result = await prisma.$transaction(async (tx) => {
      const su = await tx.subscriptionUser.create({
        data: {
          subscriptionId,
          userId,
          assignedBy: currentUserId,
        },
      });

      const count = await tx.subscriptionUser.count({
        where: { subscriptionId },
      });

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { usedLicenses: count },
      });

      return su;
    });

    // SubscriptionTeam 자동 연결 (유저의 팀이 있는 경우)
    if (user.teamId) {
      const existingSubscriptionTeam = await prisma.subscriptionTeam.findFirst({
        where: { subscriptionId, teamId: user.teamId },
      });
      if (!existingSubscriptionTeam) {
        await prisma.subscriptionTeam.create({
          data: {
            subscriptionId,
            teamId: user.teamId,
            assignedBy: currentUserId,
          },
        });
      }
    }

    revalidatePath(`/subscriptions/${subscriptionId}`);

    return { success: true, data: { assignedAt: result.assignedAt } };
  } catch (error) {
    console.error("유저 배정 오류:", error);
    return { success: false, error: "유저 배정에 실패했습니다" };
  }
}

/**
 * 구독에서 유저 제거
 * SubscriptionUser 삭제 + usedLicenses 감소
 */
export async function removeUserFromSubscription(
  subscriptionId: string,
  userId: string
): Promise<ActionState> {
  try {
    const { organizationId } = await requireOrganization();

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, organizationId },
      select: { id: true },
    });

    if (!subscription) {
      return { success: false, error: "구독을 찾을 수 없습니다" };
    }

    // 배정 확인
    const existing = await prisma.subscriptionUser.findUnique({
      where: {
        subscriptionId_userId: { subscriptionId, userId },
      },
    });

    if (!existing) {
      return { success: false, error: "배정되지 않은 유저입니다" };
    }

    // 삭제 + usedLicenses 갱신 (트랜잭션)
    await prisma.$transaction(async (tx) => {
      await tx.subscriptionUser.delete({
        where: {
          subscriptionId_userId: { subscriptionId, userId },
        },
      });

      const count = await tx.subscriptionUser.count({
        where: { subscriptionId },
      });

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { usedLicenses: count },
      });
    });

    revalidatePath(`/subscriptions/${subscriptionId}`);

    return { success: true };
  } catch (error) {
    console.error("유저 제거 오류:", error);
    return { success: false, error: "유저 제거에 실패했습니다" };
  }
}
