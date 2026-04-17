// src/actions/dashboard.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { advanceToFutureDate } from "@/lib/utils/renewal-date";
import type {
  CategoryDistribution,
  DashboardStats,
  RecentActivityItem,
  RenewalReportData,
  SubscriptionAnomalyItem,
  UpcomingRenewal,
} from "@/types/dashboard";

/**
 * 대시보드 통계 데이터 조회
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { organizationId } = await requireOrganization();

  const [totalApps, activeSubscriptions, totalUsers, costData] =
    await Promise.all([
      prisma.app.count({ where: { organizationId, status: "ACTIVE" } }),
      prisma.subscription.count({
        where: { organizationId, status: "ACTIVE" },
      }),
      prisma.user.count({ where: { organizationId, status: "ACTIVE" } }),
      prisma.subscription.findMany({
        where: { organizationId, status: "ACTIVE" },
        select: { amount: true, billingCycle: true },
      }),
    ]);

  // 월간 비용 계산 (YEARLY는 /12, QUARTERLY는 /3)
  const totalMonthlyCost = costData.reduce((sum, sub) => {
    const amount = Number(sub.amount);
    if (sub.billingCycle === "YEARLY") return sum + amount / 12;
    if (sub.billingCycle === "QUARTERLY") return sum + amount / 3;
    return sum + amount;
  }, 0);

  return {
    totalApps,
    activeSubscriptions,
    totalUsers,
    totalMonthlyCost: Math.round(totalMonthlyCost),
    currency: "KRW",
  };
}

/**
 * ACTIVE 앱 중 구독이 연결되지 않은 앱 수 조회
 */
export async function getAppsWithoutSubscriptions(): Promise<{
  count: number;
  totalActiveApps: number;
}> {
  const { organizationId } = await requireOrganization();

  const [appsWithoutSub, totalActiveApps] = await Promise.all([
    prisma.app.count({
      where: {
        organizationId,
        status: "ACTIVE",
        subscriptions: { none: {} },
      },
    }),
    prisma.app.count({
      where: { organizationId, status: "ACTIVE" },
    }),
  ]);

  return { count: appsWithoutSub, totalActiveApps };
}

/**
 * 퇴사자 미회수 계정 수 조회
 */
export async function getTerminatedUsersCount(): Promise<number> {
  const { organizationId } = await requireOrganization();

  return prisma.user.count({
    where: {
      organizationId,
      status: "TERMINATED",
      appAccesses: { some: {} },
    },
  });
}

/**
 * 퇴사자 중 구독 배정(SubscriptionUser)이 남아있는 사용자 수 조회
 */
export async function getTerminatedUsersWithSubCount(): Promise<number> {
  const { organizationId } = await requireOrganization();

  return prisma.user.count({
    where: {
      organizationId,
      status: "TERMINATED",
      subscriptionAssignments: { some: {} },
    },
  });
}

/**
 * 퇴사자의 미회수 구독 배정(SubscriptionUser) 건수 조회
 */
export async function getTerminatedUsersSubAssignmentCount(): Promise<number> {
  const { organizationId } = await requireOrganization();

  return prisma.subscriptionUser.count({
    where: {
      user: {
        organizationId,
        status: "TERMINATED",
      },
    },
  });
}

/**
 * 30일 이내 갱신 예정 구독 조회 (최대 5개)
 * @param options.teamId - 팀 ID (MEMBER role 시 해당 팀의 구독만 조회)
 */
export async function getUpcomingRenewals(
  options: { teamId?: string | null } = {}
): Promise<UpcomingRenewal[]> {
  const { organizationId } = await requireOrganization();

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      renewalDate: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
      ...(options.teamId ? { teamId: options.teamId } : {}),
    },
    include: {
      app: {
        include: { catalog: true },
      },
    },
    orderBy: { renewalDate: "asc" },
    take: 5,
  });

  return subscriptions.map((sub) => {
    const daysUntilRenewal = Math.ceil(
      (sub.renewalDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: sub.id,
      appName: sub.app.name,
      appLogoUrl:
        sub.app.catalog?.logoUrl ?? sub.app.customLogoUrl ?? undefined,
      renewalDate: sub.renewalDate!,
      amount: Number(sub.amount),
      currency: sub.currency,
      daysUntilRenewal,
    };
  });
}

/**
 * 카테고리별 앱 분포 조회
 */
export async function getAppsByCategory(): Promise<CategoryDistribution[]> {
  const { organizationId } = await requireOrganization();

  const groups = await prisma.app.groupBy({
    by: ["category"],
    where: { organizationId, status: "ACTIVE" },
    _count: { _all: true },
  });

  const total = groups.reduce((sum, g) => sum + g._count._all, 0);

  return groups.map((g) => ({
    category: g.category ?? "__UNCATEGORIZED__",
    count: g._count._all,
    percentage: total > 0 ? Math.round((g._count._all / total) * 100) : 0,
  }));
}

/**
 * 최근 활동 조회 (최대 10개)
 * @param options.userId - 사용자 ID (MEMBER role 시 본인 활동만 조회)
 */
export async function getRecentActivity(
  options: { userId?: string } = {}
): Promise<RecentActivityItem[]> {
  const { organizationId } = await requireOrganization();

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      ...(options.userId ? { userId: options.userId } : {}),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const actionDescriptions: Record<string, string> = {
    CREATE_APP: "앱을 추가했습니다",
    UPDATE_APP: "앱을 수정했습니다",
    DELETE_APP: "앱을 삭제했습니다",
    CREATE_SUBSCRIPTION: "구독을 등록했습니다",
    UPDATE_SUBSCRIPTION: "구독을 수정했습니다",
    DELETE_SUBSCRIPTION: "구독을 삭제했습니다",
    USER_TERMINATED: "사용자를 퇴사 처리했습니다",
    REVOKE_APP_ACCESS: "앱 접근 권한을 회수했습니다",
    GRANT_APP_ACCESS: "앱 접근 권한을 부여했습니다",
  };

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId ?? undefined,
    userName: log.user?.name ?? undefined,
    userEmail: log.user?.email ?? undefined,
    createdAt: log.createdAt,
    description: actionDescriptions[log.action] ?? log.action,
  }));
}

/**
 * 구독 이상(Anomaly) 감지
 * - FLAT_RATE: 배정된 사용자가 0명인 활성 구독
 * - PER_SEAT: usedLicenses < totalLicenses인 활성 구독
 * 최대 5개까지 반환
 */
export async function getSubscriptionAnomalies(): Promise<
  SubscriptionAnomalyItem[]
> {
  const { organizationId } = await requireOrganization();

  const [flatRateAnomalies, perSeatAnomalies] = await Promise.all([
    // FLAT_RATE: 배정 사용자 0명인 활성 구독
    prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        billingType: "FLAT_RATE",
        assignedUsers: { none: {} },
      },
      include: { app: { select: { name: true } } },
      take: 5,
    }),
    // PER_SEAT: 여유 시트가 있는 활성 구독
    prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        billingType: "PER_SEAT",
        totalLicenses: { gt: 0 },
      },
      include: { app: { select: { name: true } } },
      take: 5,
    }),
  ]);

  const results: SubscriptionAnomalyItem[] = [];

  for (const sub of flatRateAnomalies) {
    results.push({
      subscriptionId: sub.id,
      appName: sub.app.name,
      billingType: "FLAT_RATE",
    });
  }

  for (const sub of perSeatAnomalies) {
    const total = sub.totalLicenses ?? 0;
    const used = sub.usedLicenses ?? 0;
    if (used >= total) continue;

    const perSeatPrice = Number(sub.perSeatPrice ?? 0);
    const savableAmount = (total - used) * perSeatPrice;

    results.push({
      subscriptionId: sub.id,
      appName: sub.app.name,
      billingType: "PER_SEAT",
      totalLicenses: total,
      usedLicenses: used,
      savableAmount,
    });
  }

  return results.slice(0, 5);
}

/**
 * Extension 온보딩 미완료 활성 사용자 수 조회
 * - Extension 디바이스가 설치되어 있지만 온보딩을 완료하지 않은 사용자
 */
export async function getPendingOnboardingCount(): Promise<number> {
  const { organizationId } = await requireOrganization();

  return prisma.user.count({
    where: {
      organizationId,
      status: "ACTIVE",
      extensionDevices: {
        some: { onboardingCompletedAt: null },
      },
    },
  });
}

/**
 * 리포트용 갱신 목록 조회 (전체 기간, 기간별 분류)
 */
export async function getRenewalReportData(
  filters: {
    teamId?: string;
    userId?: string;
  } = {}
): Promise<RenewalReportData> {
  const {
    organizationId,
    role,
    teamId: memberTeamId,
    userId,
  } = await requireOrganization();

  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  const isRestricted = role !== "ADMIN";
  const effectiveTeamId = isRestricted
    ? (memberTeamId ?? undefined)
    : filters.teamId;
  const effectiveUserId =
    isRestricted && !memberTeamId ? userId : filters.userId;

  const where: Record<string, unknown> = {
    organizationId,
    status: "ACTIVE",
    renewalDate: {
      gte: now,
      lte: ninetyDaysFromNow,
    },
  };

  if (effectiveUserId) {
    where.assignedUsers =
      isRestricted && memberTeamId
        ? { some: { userId: effectiveUserId, user: { teamId: memberTeamId } } }
        : { some: { userId: effectiveUserId } };
  } else if (effectiveTeamId) {
    where.OR = [
      { teamId: effectiveTeamId },
      { assignedUsers: { some: { user: { teamId: effectiveTeamId } } } },
    ];
  }

  const subscriptions = await prisma.subscription.findMany({
    where,
    include: {
      app: {
        include: { catalog: true },
      },
      team: {
        select: { id: true, name: true },
      },
      assignedUsers: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { renewalDate: "asc" },
  });

  // 안전장치: autoRenewal=true이지만 renewalDate가 과거인 구독 조회
  // 크론잡 미실행 시에도 리포트가 정상 동작하도록 함
  const overdueWhere: Record<string, unknown> = {
    organizationId,
    status: "ACTIVE",
    autoRenewal: true,
    billingCycle: { not: "ONE_TIME" },
    renewalDate: { lt: now },
  };

  if (effectiveUserId) {
    overdueWhere.assignedUsers =
      isRestricted && memberTeamId
        ? { some: { userId: effectiveUserId, user: { teamId: memberTeamId } } }
        : { some: { userId: effectiveUserId } };
  } else if (effectiveTeamId) {
    overdueWhere.OR = [
      { teamId: effectiveTeamId },
      { assignedUsers: { some: { user: { teamId: effectiveTeamId } } } },
    ];
  }

  const overdueSubscriptions = await prisma.subscription.findMany({
    where: overdueWhere,
    include: {
      app: {
        include: { catalog: true },
      },
      team: {
        select: { id: true, name: true },
      },
      assignedUsers: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { renewalDate: "asc" },
  });

  // 이미 기존 쿼리에 포함된 구독 ID 집합
  const existingIds = new Set(subscriptions.map((s) => s.id));

  // 과거 갱신일을 미래로 계산하여 90일 이내인 구독만 추가
  const overdueWithCalculatedDates = overdueSubscriptions
    .filter((sub) => !existingIds.has(sub.id) && sub.renewalDate)
    .map((sub) => {
      const nextDate = advanceToFutureDate(sub.renewalDate!, sub.billingCycle);
      return { ...sub, renewalDate: nextDate };
    })
    .filter((sub) => sub.renewalDate <= ninetyDaysFromNow);

  // 기존 결과와 병합
  const allSubscriptions = [...subscriptions, ...overdueWithCalculatedDates];

  const mapToRenewal = (sub: (typeof allSubscriptions)[0]): UpcomingRenewal => {
    const daysUntilRenewal = Math.ceil(
      (sub.renewalDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: sub.id,
      appName: sub.app.name,
      appLogoUrl:
        sub.app.catalog?.logoUrl ?? sub.app.customLogoUrl ?? undefined,
      renewalDate: sub.renewalDate!,
      amount: Number(sub.amount),
      currency: sub.currency,
      daysUntilRenewal,
      teamId: sub.teamId ?? null,
      teamName: sub.team?.name ?? null,
      assignedUsers: sub.assignedUsers.map((assignment) => ({
        id: assignment.userId,
        name: assignment.user.name,
        email: assignment.user.email,
      })),
    };
  };

  const within7Days: UpcomingRenewal[] = [];
  const within30Days: UpcomingRenewal[] = [];
  const within90Days: UpcomingRenewal[] = [];
  let totalRenewalCost = 0;

  allSubscriptions.forEach((sub) => {
    const renewal = mapToRenewal(sub);
    totalRenewalCost += renewal.amount;

    if (sub.renewalDate! <= sevenDaysFromNow) {
      within7Days.push(renewal);
    } else if (sub.renewalDate! <= thirtyDaysFromNow) {
      within30Days.push(renewal);
    } else {
      within90Days.push(renewal);
    }
  });

  return {
    within7Days,
    within30Days,
    within90Days,
    totalRenewalCost,
    totalCount: allSubscriptions.length,
  };
}
