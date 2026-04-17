// src/actions/seat-waste-analysis.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type {
  SeatWasteAnalysis,
  SeatWastePerApp,
  SeatWasteSummary,
} from "@/types/seat-analytics";

const INACTIVE_DAYS_THRESHOLD = 30;

/**
 * 앱별 Seat 낭비 상세 분석
 * totalLicenses가 있는 모든 활성 구독에 대해 미할당/미사용 Seat 분석
 * (FLAT_RATE도 totalLicenses가 있으면 분석 대상)
 */
export async function getSeatWasteAnalysis(): Promise<
  ActionState<SeatWasteAnalysis>
> {
  try {
    const { organizationId } = await requireOrganization();

    // totalLicenses > 0인 모든 활성 구독 조회 (billingType 무관)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        totalLicenses: { gt: 0 },
      },
      include: {
        app: {
          select: { id: true, name: true, customLogoUrl: true },
        },
        assignedUsers: {
          select: { userId: true },
        },
      },
    });

    if (subscriptions.length === 0) {
      return {
        success: true,
        data: {
          summary: {
            totalMonthlyWaste: 0,
            totalAnnualWaste: 0,
            overallUtilizationRate: 100,
            appCount: 0,
            totalWastedSeats: 0,
          },
          apps: [],
        },
      };
    }

    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVE_DAYS_THRESHOLD);

    // 모든 관련 appId에 대한 UserAppAccess 조회 (배치)
    const appIds = subscriptions.map((s) => s.app.id);
    const allUserIds = subscriptions.flatMap((s) =>
      s.assignedUsers.map((u) => u.userId)
    );

    const appAccesses = await prisma.userAppAccess.findMany({
      where: {
        appId: { in: appIds },
        userId: { in: allUserIds },
      },
      select: {
        userId: true,
        appId: true,
        lastUsedAt: true,
      },
    });

    // appId+userId → lastUsedAt 맵
    const accessMap = new Map<string, Date | null>();
    for (const a of appAccesses) {
      accessMap.set(`${a.appId}:${a.userId}`, a.lastUsedAt);
    }

    let totalWastedSeats = 0;
    let totalSeatsAll = 0;
    let totalActiveSeats = 0;

    const apps: SeatWastePerApp[] = subscriptions.map((sub) => {
      const totalSeats = sub.totalLicenses ?? 0;
      const assignedUserIds = sub.assignedUsers.map((u) => u.userId);
      const assignedSeats = assignedUserIds.length;
      const unassignedSeats = Math.max(0, totalSeats - assignedSeats);

      // 활성 유저: 30일 이내 사용 기록이 있는 경우만 활성
      // 과다 배정(inactive): lastUsedAt이 존재하면서 30일 초과인 경우만 (증거 기반)
      // UserAppAccess 레코드 없음/null lastUsedAt → untracked (과다 배정 아님)
      let activeSeats = 0;
      let inactiveSeats = 0;
      for (const uid of assignedUserIds) {
        const key = `${sub.app.id}:${uid}`;
        const lastUsed = accessMap.get(key);
        if (lastUsed && lastUsed >= thresholdDate) {
          activeSeats++;
        } else if (lastUsed && lastUsed < thresholdDate) {
          inactiveSeats++; // 증거 기반 비활성
        }
        // else: 레코드 없음 or null lastUsedAt → untracked (과다 배정 아님)
      }
      const wastedSeats = unassignedSeats + inactiveSeats;
      const rawPrice = sub.perSeatPrice;
      let perSeatPrice =
        rawPrice && typeof rawPrice === "object" && "toNumber" in rawPrice
          ? (rawPrice as { toNumber: () => number }).toNumber()
          : Number(rawPrice ?? 0);

      // FLAT_RATE 등 perSeatPrice가 없는 경우: amount / totalLicenses로 추정
      if (perSeatPrice === 0 && totalSeats > 0) {
        const rawAmount = sub.amount;
        const amount =
          rawAmount && typeof rawAmount === "object" && "toNumber" in rawAmount
            ? (rawAmount as { toNumber: () => number }).toNumber()
            : Number(rawAmount ?? 0);
        perSeatPrice = Math.round(amount / totalSeats);
      }
      const monthlyWaste = wastedSeats * perSeatPrice;
      const utilizationRate =
        totalSeats > 0 ? Math.round((activeSeats / totalSeats) * 100) : 0;

      totalWastedSeats += wastedSeats;
      totalSeatsAll += totalSeats;
      totalActiveSeats += activeSeats;

      return {
        appId: sub.app.id,
        appName: sub.app.name,
        appLogoUrl: sub.app.customLogoUrl,
        totalSeats,
        assignedSeats,
        activeSeats,
        unassignedSeats,
        inactiveSeats,
        wastedSeats,
        perSeatPrice,
        monthlyWaste,
        annualWaste: monthlyWaste * 12,
        utilizationRate,
      };
    });

    // 낭비액 내림차순 정렬
    apps.sort((a, b) => b.monthlyWaste - a.monthlyWaste);

    const totalMonthlyWaste = apps.reduce((s, a) => s + a.monthlyWaste, 0);
    const overallUtilizationRate =
      totalSeatsAll > 0
        ? Math.round((totalActiveSeats / totalSeatsAll) * 100)
        : 100;

    return {
      success: true,
      data: {
        summary: {
          totalMonthlyWaste,
          totalAnnualWaste: totalMonthlyWaste * 12,
          overallUtilizationRate,
          appCount: apps.length,
          totalWastedSeats,
        },
        apps,
      },
    };
  } catch (error) {
    console.error("Seat 낭비 분석 오류:", error);
    return { success: false, error: "Seat 낭비 분석에 실패했습니다" };
  }
}

/**
 * 대시보드 위젯용 Seat 낭비 요약
 */
export async function getSeatWasteSummary(): Promise<
  ActionState<SeatWasteSummary>
> {
  const result = await getSeatWasteAnalysis();
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data.summary };
}
