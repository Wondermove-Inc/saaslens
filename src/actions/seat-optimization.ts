// src/actions/seat-optimization.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type {
  SavingsOpportunitySummary,
  SeatOptimizationItem,
  SeatOptimizationSummary,
  SimulationResult,
} from "@/types/seat-analytics";

const INACTIVE_DAYS_THRESHOLD = 30;
const BUFFER_RATE = 1.15; // 15% 버퍼

function extractDecimal(val: unknown): number {
  if (val && typeof val === "object" && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val ?? 0);
}

/**
 * Seat 최적화 제안
 * 앱별 권장 Seat 수 산출 + 절감 가능 비용
 */
export async function getSeatOptimizationSuggestions(): Promise<
  ActionState<SeatOptimizationSummary>
> {
  try {
    const { organizationId } = await requireOrganization();

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVE_DAYS_THRESHOLD);

    // totalLicenses > 0인 모든 활성 구독 조회 (billingType 무관)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        totalLicenses: { gt: 0 },
      },
      include: {
        app: { select: { id: true, name: true, customLogoUrl: true } },
        assignedUsers: { select: { userId: true } },
      },
    });

    if (subscriptions.length === 0) {
      return {
        success: true,
        data: {
          totalMonthlySavings: 0,
          totalAnnualSavings: 0,
          optimizableAppCount: 0,
          items: [],
        },
      };
    }

    // UserAppAccess 배치 조회
    const appIds = subscriptions.map((s) => s.app.id);
    const allUserIds = subscriptions.flatMap((s) =>
      s.assignedUsers.map((u) => u.userId)
    );

    const appAccesses =
      allUserIds.length > 0
        ? await prisma.userAppAccess.findMany({
            where: {
              appId: { in: appIds },
              userId: { in: allUserIds },
            },
            select: { userId: true, appId: true, lastUsedAt: true },
          })
        : [];

    const accessMap = new Map<string, Date | null>();
    for (const a of appAccesses) {
      accessMap.set(`${a.appId}:${a.userId}`, a.lastUsedAt);
    }

    const items: SeatOptimizationItem[] = [];

    for (const sub of subscriptions) {
      const currentSeats = sub.totalLicenses ?? 0;
      let perSeatPrice = extractDecimal(sub.perSeatPrice);

      // FLAT_RATE 등 perSeatPrice가 없는 경우: amount / totalLicenses로 추정
      if (perSeatPrice === 0 && currentSeats > 0) {
        perSeatPrice = Math.round(extractDecimal(sub.amount) / currentSeats);
      }

      // 활성 유저 수 계산: 30일 이내 사용 기록이 있는 경우만 활성 (보수적 접근)
      let activeUsers = 0;
      for (const su of sub.assignedUsers) {
        const key = `${sub.app.id}:${su.userId}`;
        const lastUsed = accessMap.get(key);
        if (lastUsed && lastUsed >= thresholdDate) {
          activeUsers++;
        }
      }

      const recommendedSeats = Math.ceil(activeUsers * BUFFER_RATE);
      const excessSeats = Math.max(0, currentSeats - recommendedSeats);

      if (excessSeats <= 0) continue; // 최적화 불필요

      const monthlySavings = excessSeats * perSeatPrice;

      items.push({
        subscriptionId: sub.id,
        appId: sub.app.id,
        appName: sub.app.name,
        appLogoUrl: sub.app.customLogoUrl,
        currentSeats,
        activeUsers,
        recommendedSeats,
        excessSeats,
        perSeatPrice,
        monthlySavings,
        annualSavings: monthlySavings * 12,
      });
    }

    items.sort((a, b) => b.monthlySavings - a.monthlySavings);

    const totalMonthlySavings = items.reduce((s, i) => s + i.monthlySavings, 0);

    return {
      success: true,
      data: {
        totalMonthlySavings,
        totalAnnualSavings: totalMonthlySavings * 12,
        optimizableAppCount: items.length,
        items,
      },
    };
  } catch (error) {
    console.error("Seat 최적화 제안 오류:", error);
    return { success: false, error: "Seat 최적화 제안에 실패했습니다" };
  }
}

/**
 * 다운사이징 시뮬레이션
 */
export async function simulateSeatReduction(
  subscriptionId: string,
  targetSeats: number
): Promise<ActionState<SimulationResult>> {
  try {
    const { organizationId } = await requireOrganization();

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVE_DAYS_THRESHOLD);

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, organizationId },
      include: {
        app: { select: { id: true, name: true } },
        assignedUsers: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!subscription) {
      return { success: false, error: "구독을 찾을 수 없습니다" };
    }

    const currentSeats = subscription.totalLicenses ?? 0;
    const perSeatPrice = extractDecimal(subscription.perSeatPrice);

    // UserAppAccess 조회
    const userIds = subscription.assignedUsers.map((su) => su.userId);
    const appAccesses = await prisma.userAppAccess.findMany({
      where: {
        appId: subscription.app.id,
        userId: { in: userIds },
      },
      select: { userId: true, lastUsedAt: true },
    });

    const accessMap = new Map(appAccesses.map((a) => [a.userId, a.lastUsedAt]));

    // 비활성 유저 = 축소 시 영향받는 유저
    const affectedUsers = subscription.assignedUsers
      .filter((su) => {
        const lastUsed = accessMap.get(su.userId) ?? null;
        return !lastUsed || lastUsed < thresholdDate;
      })
      .map((su) => ({
        id: su.user.id,
        name: su.user.name,
        email: su.user.email,
        lastUsedAt: accessMap.get(su.userId) ?? null,
      }));

    return {
      success: true,
      data: {
        subscriptionId,
        appName: subscription.app.name,
        currentSeats,
        targetSeats,
        currentMonthlyCost: currentSeats * perSeatPrice,
        targetMonthlyCost: targetSeats * perSeatPrice,
        monthlySavings: (currentSeats - targetSeats) * perSeatPrice,
        annualSavings: (currentSeats - targetSeats) * perSeatPrice * 12,
        affectedUsers,
      },
    };
  } catch (error) {
    console.error("Seat 축소 시뮬레이션 오류:", error);
    return { success: false, error: "시뮬레이션에 실패했습니다" };
  }
}

/**
 * 대시보드 위젯용 절감 기회 요약 (Top 3)
 */
export async function getSavingsOpportunitySummary(): Promise<
  ActionState<SavingsOpportunitySummary>
> {
  const result = await getSeatOptimizationSuggestions();
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const topApps = result.data.items.slice(0, 3).map((item) => ({
    appName: item.appName,
    annualSavings: item.annualSavings,
  }));

  return {
    success: true,
    data: {
      totalAnnualSavings: result.data.totalAnnualSavings,
      topApps,
    },
  };
}
