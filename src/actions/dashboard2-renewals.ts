// src/actions/dashboard2-renewals.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { UrgentRenewalSummary } from "@/types/dashboard2";
import { SubscriptionStatus, UserStatus } from "@prisma/client";

/**
 * 30일 내 긴급 갱신 요약 조회 (7일/15일 세분화 포함)
 */
export async function getUrgentRenewals(): Promise<UrgentRenewalSummary> {
  const { organizationId } = await requireOrganization();

  const now = new Date();
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const fifteenDaysLater = new Date(now);
  fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);

  const thirtyDaysLater = new Date(now);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const renewals = await prisma.subscription.findMany({
    where: {
      organizationId,
      renewalDate: {
        gte: now,
        lte: thirtyDaysLater,
      },
      status: SubscriptionStatus.ACTIVE,
    },
    include: {
      app: { select: { name: true } },
    },
    orderBy: { renewalDate: "asc" },
  });

  // 30일 내 전체
  const thirtyDayCount = renewals.length;
  const thirtyDayAmount = renewals.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  // 7일 이내 필터링
  const sevenDayRenewals = renewals.filter(
    (r) => r.renewalDate && new Date(r.renewalDate) <= sevenDaysLater
  );
  const sevenDayCount = sevenDayRenewals.length;
  const sevenDayAmount = sevenDayRenewals.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  // 15일 이내 필터링
  const fifteenDayRenewals = renewals.filter(
    (r) => r.renewalDate && new Date(r.renewalDate) <= fifteenDaysLater
  );
  const fifteenDayCount = fifteenDayRenewals.length;
  const fifteenDayAmount = fifteenDayRenewals.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  const critical = renewals[0];

  return {
    thirtyDayCount,
    thirtyDayAmount,
    fifteenDayCount,
    fifteenDayAmount,
    sevenDayCount,
    sevenDayAmount,
    criticalApp: critical
      ? {
          name: critical.app.name,
          renewalDate: critical.renewalDate!,
        }
      : null,
  };
}

/**
 * 퇴사자 미회수 계정 조회
 * TERMINATED 사용자 중 아직 앱 접근 권한이 남아있는 사용자
 */
export async function getUnrecoveredAccounts(): Promise<{
  totalCount: number;
  users: {
    id: string;
    name: string;
    email: string;
    terminatedAt: Date;
    unrecoveredApps: number;
  }[];
}> {
  const { organizationId } = await requireOrganization();

  // TERMINATED 상태이면서 앱 접근 권한이 남아있는 사용자 조회
  const terminatedUsers = await prisma.user.findMany({
    where: {
      organizationId,
      status: UserStatus.TERMINATED,
      appAccesses: {
        some: {}, // 최소 1개 이상의 앱 접근 권한이 있는 경우
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      terminatedAt: true,
      _count: {
        select: { appAccesses: true },
      },
    },
    orderBy: { terminatedAt: "desc" },
    take: 10,
  });

  return {
    totalCount: terminatedUsers.length,
    users: terminatedUsers.map((user) => ({
      id: user.id,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      terminatedAt: user.terminatedAt || new Date(),
      unrecoveredApps: user._count.appAccesses,
    })),
  };
}
