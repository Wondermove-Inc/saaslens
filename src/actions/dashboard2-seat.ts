// src/actions/dashboard2-seat.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { SeatWidgetData } from "@/types/dashboard";
import { SubscriptionStatus } from "@prisma/client";

/**
 * Seat 현황 위젯 데이터 조회
 * - 위젯 A: 활용률 하위 Top 5 (낭비 중인 앱)
 * - 위젯 B: 라이선스 보유 수 상위 Top 5
 */
export async function getSeatWidgetData(): Promise<SeatWidgetData> {
  const { organizationId } = await requireOrganization();

  // PER_SEAT 활성 구독 조회 (위젯 A: 활용률 계산용)
  const perSeatSubscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: SubscriptionStatus.ACTIVE,
      billingType: "PER_SEAT",
      totalLicenses: { gt: 0 },
    },
    include: {
      app: { select: { id: true, name: true } },
      assignedUsers: { select: { id: true } },
    },
  });

  // 활용률 계산
  const appsWithUtilization = perSeatSubscriptions
    .filter((sub) => (sub.totalLicenses ?? 0) > 0)
    .map((sub) => {
      const totalSeats = sub.totalLicenses!;
      const assignedSeats = sub.assignedUsers.length;
      const utilizationRate = Math.round((assignedSeats / totalSeats) * 100);
      return {
        appId: sub.app.id,
        appName: sub.app.name,
        totalSeats,
        assignedSeats,
        utilizationRate,
      };
    });

  // 위젯 A: 활용률 낮은 순 정렬, Top 5
  const lowUtilizationApps = [...appsWithUtilization]
    .sort((a, b) => a.utilizationRate - b.utilizationRate)
    .slice(0, 5);

  // FLAT_RATE 활성 구독 조회 (위젯 B: 개별 라이선스 앱 Top 5용)
  const flatRateSubscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: SubscriptionStatus.ACTIVE,
      billingType: "FLAT_RATE",
    },
    include: {
      app: { select: { id: true, name: true } },
      assignedUsers: { select: { userId: true } },
    },
  });

  // appId별 그룹핑: 동일 앱에 여러 FLAT_RATE 구독이 있으면 사용자 수 합산
  const appMap = new Map<string, { appName: string; userCount: number }>();
  for (const sub of flatRateSubscriptions) {
    const existing = appMap.get(sub.appId) ?? {
      appName: sub.app.name,
      userCount: 0,
    };
    existing.userCount += sub.assignedUsers.length;
    appMap.set(sub.appId, existing);
  }

  // 위젯 B: userCount 내림차순 Top 5
  const topLicenseApps = [...appMap.entries()]
    .map(([appId, { appName, userCount }]) => ({ appId, appName, userCount }))
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 5);

  return {
    lowUtilizationApps,
    topLicenseApps,
  };
}
