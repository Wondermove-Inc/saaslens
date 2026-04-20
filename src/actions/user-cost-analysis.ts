// src/actions/user-cost-analysis.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type {
  TeamCostComparisonResult,
  UserCostBreakdown,
  UserCostItem,
  UserCostSubscription,
} from "@/types/seat-analytics";

const INACTIVE_DAYS_THRESHOLD = 30;

function extractDecimal(val: unknown): number {
  if (val && typeof val === "object" && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val ?? 0);
}

/**
 * 유저별 비용 Breakdown
 * SubscriptionUser → Subscription(PER_SEAT) → perSeatPrice 집계
 */
export async function getUserCostBreakdown(options?: {
  teamId?: string;
}): Promise<ActionState<UserCostBreakdown>> {
  try {
    const { organizationId } = await requireOrganization();

    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVE_DAYS_THRESHOLD);

    // 유저별 PER_SEAT 구독 배정 조회
    const subscriptionUsers = await prisma.subscriptionUser.findMany({
      where: {
        subscription: {
          organizationId,
          billingType: "PER_SEAT",
          status: "ACTIVE",
          perSeatPrice: { not: null },
        },
        ...(options?.teamId ? { user: { teamId: options.teamId } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        },
        subscription: {
          include: {
            app: {
              select: { id: true, name: true, customLogoUrl: true },
            },
          },
        },
      },
    });

    // UserAppAccess lastUsedAt 배치 조회
    const userAppPairs = subscriptionUsers.map((su) => ({
      userId: su.userId,
      appId: su.subscription.appId,
    }));

    const appAccesses =
      userAppPairs.length > 0
        ? await prisma.userAppAccess.findMany({
            where: {
              OR: userAppPairs.map((p) => ({
                userId: p.userId,
                appId: p.appId,
              })),
            },
            select: { userId: true, appId: true, lastUsedAt: true },
          })
        : [];

    const accessMap = new Map<string, Date | null>();
    for (const a of appAccesses) {
      accessMap.set(`${a.userId}:${a.appId}`, a.lastUsedAt);
    }

    // 유저별 집계
    const userMap = new Map<string, UserCostItem>();

    for (const su of subscriptionUsers) {
      const userId = su.user.id;
      const perSeatPrice = extractDecimal(su.subscription.perSeatPrice);
      const lastUsedAt =
        accessMap.get(`${userId}:${su.subscription.appId}`) ?? null;
      const isActive = !!lastUsedAt && lastUsedAt >= thresholdDate;

      const subItem: UserCostSubscription = {
        subscriptionId: su.subscription.id,
        appName: su.subscription.app.name,
        appLogoUrl: su.subscription.app.customLogoUrl,
        perSeatPrice,
        isActive,
      };

      if (userMap.has(userId)) {
        const existing = userMap.get(userId)!;
        existing.subscriptions.push(subItem);
        existing.totalMonthlyCost += perSeatPrice;
        existing.assignedAppCount++;
        if (isActive) existing.activeAppCount++;
      } else {
        userMap.set(userId, {
          userId,
          userName: su.user.name,
          userEmail: su.user.email,
          teamId: su.user.team?.id ?? null,
          teamName: su.user.team?.name ?? null,
          totalMonthlyCost: perSeatPrice,
          assignedAppCount: 1,
          activeAppCount: isActive ? 1 : 0,
          subscriptions: [subItem],
        });
      }
    }

    const users = Array.from(userMap.values()).sort(
      (a, b) => b.totalMonthlyCost - a.totalMonthlyCost
    );

    const totalMonthlyCost = users.reduce((s, u) => s + u.totalMonthlyCost, 0);

    return { success: true, data: { users, totalMonthlyCost } };
  } catch (error) {
    console.error("유저별 비용 분석 오류:", error);
    return { success: false, error: "유저별 비용 분석에 실패했습니다" };
  }
}

/**
 * 팀별 비용 비교
 */
export async function getTeamCostComparison(): Promise<
  ActionState<TeamCostComparisonResult>
> {
  try {
    const { organizationId } = await requireOrganization();

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVE_DAYS_THRESHOLD);

    // 팀 목록 조회
    const teams = await prisma.team.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
    });

    // PER_SEAT 구독 유저 배정 (팀 매핑)
    const subscriptionUsers = await prisma.subscriptionUser.findMany({
      where: {
        subscription: {
          organizationId,
          billingType: "PER_SEAT",
          status: "ACTIVE",
          perSeatPrice: { not: null },
        },
      },
      include: {
        user: {
          select: { id: true, teamId: true },
        },
        subscription: {
          select: { appId: true, perSeatPrice: true },
        },
      },
    });

    // UserAppAccess 배치 조회
    const userIds = [...new Set(subscriptionUsers.map((su) => su.userId))];
    const appIds = [
      ...new Set(subscriptionUsers.map((su) => su.subscription.appId)),
    ];

    const appAccesses =
      userIds.length > 0
        ? await prisma.userAppAccess.findMany({
            where: {
              userId: { in: userIds },
              appId: { in: appIds },
            },
            select: { userId: true, appId: true, lastUsedAt: true },
          })
        : [];

    const accessMap = new Map<string, Date | null>();
    for (const a of appAccesses) {
      accessMap.set(`${a.userId}:${a.appId}`, a.lastUsedAt);
    }

    // 팀별 집계
    const teamCostMap = new Map<
      string,
      { totalCost: number; activeCount: number; totalAssignments: number }
    >();

    for (const su of subscriptionUsers) {
      const teamId = su.user.teamId;
      if (!teamId) continue;

      const price = extractDecimal(su.subscription.perSeatPrice);
      const lastUsedAt =
        accessMap.get(`${su.userId}:${su.subscription.appId}`) ?? null;
      const isActive = !!lastUsedAt && lastUsedAt >= thresholdDate;

      const entry = teamCostMap.get(teamId) ?? {
        totalCost: 0,
        activeCount: 0,
        totalAssignments: 0,
      };
      entry.totalCost += price;
      entry.totalAssignments++;
      if (isActive) entry.activeCount++;
      teamCostMap.set(teamId, entry);
    }

    const result = teams
      .map((team) => {
        const entry = teamCostMap.get(team.id);
        return {
          teamId: team.id,
          teamName: team.name,
          memberCount: team._count.members,
          totalMonthlyCost: entry?.totalCost ?? 0,
          costPerMember:
            team._count.members > 0
              ? Math.round((entry?.totalCost ?? 0) / team._count.members)
              : 0,
          activeRate:
            entry && entry.totalAssignments > 0
              ? Math.round((entry.activeCount / entry.totalAssignments) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.totalMonthlyCost - a.totalMonthlyCost);

    return { success: true, data: { teams: result } };
  } catch (error) {
    console.error("팀별 비용 비교 오류:", error);
    return { success: false, error: "팀별 비용 비교에 실패했습니다" };
  }
}
