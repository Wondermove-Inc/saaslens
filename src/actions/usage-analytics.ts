// src/actions/usage-analytics.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// 타입 정의
export interface UsageReportFilters {
  period: "30d" | "90d" | "1y" | "custom";
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  teamId?: string;
  userId?: string;
}

export interface UsageReportData {
  activeUsersTrend: Array<{ date: string; count: number }>;
  appUsageRanking: Array<{
    appId: string;
    appName: string;
    userCount: number;
    usageRate: number;
  }>;
  unusedApps: Array<{
    appId: string;
    appName: string;
    lastUsedAt: string | null;
    licenseCount: number | null;
    monthlyWastedCost: number;
  }>;
  summary: {
    totalActiveUsers: number;
    totalApps: number;
    unusedAppsCount: number;
    averageUsageRate: number;
  };
}

export type UsageExportFormat = "csv" | "excel";

/**
 * 구독 앱 ID 목록 조회 (공통 헬퍼)
 *
 * - 전체 조회: 조직 내 모든 ACTIVE 구독 앱 반환
 * - 사용자/팀 필터: 해당 사용자에게 SubscriptionUser로 할당된 구독의 앱만 반환
 */
async function getSubscribedAppIds(
  organizationId: string,
  userScope: Prisma.UserWhereInput,
  hasUserFilter: boolean
): Promise<string[]> {
  if (hasUserFilter) {
    // 사용자/팀 필터: 해당 사용자에게 구독 할당된 앱만
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        assignedUsers: {
          some: {
            user: userScope,
          },
        },
      },
      select: { appId: true },
      distinct: ["appId"],
    });
    return subscriptions.map((s) => s.appId);
  }

  // 전체 조회: 조직 내 모든 ACTIVE 구독 앱
  const subscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
    },
    select: { appId: true },
    distinct: ["appId"],
  });
  return subscriptions.map((s) => s.appId);
}

/**
 * 사용 현황 리포트 데이터 조회
 */
export async function getUsageReport(
  filters: UsageReportFilters
): Promise<UsageReportData> {
  const {
    organizationId,
    role,
    teamId: memberTeamId,
    userId,
  } = await requireOrganization();

  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);

  const isRestricted = role !== "ADMIN";
  const effectiveTeamId = isRestricted
    ? (memberTeamId ?? undefined)
    : filters.teamId;
  const effectiveUserId =
    isRestricted && !memberTeamId ? userId : filters.userId;

  const hasUserFilter = !!(effectiveTeamId || effectiveUserId);

  const userScope: Prisma.UserWhereInput = {
    organizationId,
    ...(effectiveTeamId ? { teamId: effectiveTeamId } : {}),
    ...(effectiveUserId ? { id: effectiveUserId } : {}),
  };

  // 구독 앱 ID 1회 조회 후 재사용
  const subscribedAppIds = await getSubscribedAppIds(
    organizationId,
    userScope,
    hasUserFilter
  );

  // ACTIVE 상태인 모든 앱 수 (구독 유무와 무관)
  const totalApps = await prisma.app.count({
    where: { organizationId, status: "ACTIVE" },
  });

  // 구독 앱이 없으면 활성 사용자/사용률은 0이지만 totalApps는 실제 수 반환
  if (subscribedAppIds.length === 0) {
    return {
      activeUsersTrend: [],
      appUsageRanking: [],
      unusedApps: [],
      summary: {
        totalActiveUsers: 0,
        totalApps,
        unusedAppsCount: 0,
        averageUsageRate: 0,
      },
    };
  }

  // 병렬 실행: 독립 쿼리들
  const [activeUsersTrend, appUsageRanking, unusedApps, activeUserRecords] =
    await Promise.all([
      // 활성 사용자 추이
      getActiveUsersTrendInternal(
        startDate,
        endDate,
        userScope,
        subscribedAppIds
      ),
      // 앱별 사용률 순위
      getAppUsageRankingInternal(
        organizationId,
        userScope,
        subscribedAppIds,
        10
      ),
      // 미사용 앱 목록 (사용자 선택 기간 반영)
      getUnusedAppsInternal(
        organizationId,
        userScope,
        hasUserFilter,
        startDate
      ),
      // 총 활성 사용자: 구독 앱에 lastUsedAt이 기간 내인 사용자
      prisma.userAppAccess.findMany({
        where: {
          user: userScope,
          appId: { in: subscribedAppIds },
          lastUsedAt: { gte: startDate, lte: endDate },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

  const totalActiveUsers = activeUserRecords.length;

  // 평균 사용률 계산
  const averageUsageRate =
    appUsageRanking.length > 0
      ? appUsageRanking.reduce((sum, app) => sum + app.usageRate, 0) /
        appUsageRanking.length
      : 0;

  return {
    activeUsersTrend,
    appUsageRanking,
    unusedApps,
    summary: {
      totalActiveUsers,
      totalApps,
      unusedAppsCount: unusedApps.length,
      averageUsageRate: Math.round(averageUsageRate * 10) / 10,
    },
  };
}

/**
 * 활성 사용자 추이 조회 (내부용)
 * 구독 앱에 대한 lastUsedAt 기준으로만 집계
 */
async function getActiveUsersTrendInternal(
  startDate: Date,
  endDate: Date,
  userScope: Prisma.UserWhereInput,
  subscribedAppIds: string[]
): Promise<Array<{ date: string; count: number }>> {
  if (subscribedAppIds.length === 0) {
    return [];
  }

  const accesses = await prisma.userAppAccess.findMany({
    where: {
      user: userScope,
      appId: { in: subscribedAppIds },
      lastUsedAt: { gte: startDate, lte: endDate },
    },
    select: {
      userId: true,
      lastUsedAt: true,
    },
  });

  // 날짜별로 고유 사용자 집계
  const trendMap = new Map<string, Set<string>>();

  for (const access of accesses) {
    if (access.lastUsedAt) {
      const dateKey = access.lastUsedAt.toISOString().split("T")[0];
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, new Set());
      }
      trendMap.get(dateKey)!.add(access.userId);
    }
  }

  // Map을 배열로 변환
  const result: Array<{ date: string; count: number }> = [];
  trendMap.forEach((userSet, date) => {
    result.push({ date, count: userSet.size });
  });

  // 날짜순 정렬
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * 활성 사용자 추이 조회 (외부 호출용)
 */
export async function getActiveUsersTrend(
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; count: number }>> {
  const {
    organizationId,
    role,
    teamId: memberTeamId,
    userId,
  } = await requireOrganization();

  const isRestricted = role !== "ADMIN";
  const effectiveTeamId = isRestricted
    ? (memberTeamId ?? undefined)
    : undefined;
  const effectiveUserId = isRestricted && !memberTeamId ? userId : undefined;

  const hasUserFilter = !!(effectiveTeamId || effectiveUserId);

  const userScope: Prisma.UserWhereInput = {
    organizationId,
    ...(effectiveTeamId ? { teamId: effectiveTeamId } : {}),
    ...(effectiveUserId ? { id: effectiveUserId } : {}),
  };

  const subscribedAppIds = await getSubscribedAppIds(
    organizationId,
    userScope,
    hasUserFilter
  );

  return getActiveUsersTrendInternal(
    new Date(startDate),
    new Date(endDate),
    userScope,
    subscribedAppIds
  );
}

/**
 * 앱별 사용률 순위 조회 (내부용)
 *
 * - 로그인 사용자 = UserAppAccess.lastUsedAt이 not null인 사용자 (구독 앱 한정)
 * - 할당 사용자 = 해당 앱 구독의 SubscriptionUser 수
 * - usageRate = (로그인 사용자 / 할당 사용자) × 100
 */
async function getAppUsageRankingInternal(
  organizationId: string,
  userScope: Prisma.UserWhereInput,
  subscribedAppIds: string[],
  limit?: number
): Promise<
  Array<{
    appId: string;
    appName: string;
    userCount: number;
    usageRate: number;
  }>
> {
  if (subscribedAppIds.length === 0) {
    return [];
  }

  // 구독 앱별 로그인 사용자 (lastUsedAt이 not null)
  const loginRecords = await prisma.userAppAccess.findMany({
    where: {
      user: userScope,
      appId: { in: subscribedAppIds },
      lastUsedAt: { not: null },
    },
    select: { appId: true, userId: true },
  });

  // 앱별 로그인 사용자 집계
  const appLoginMap = new Map<string, Set<string>>();
  for (const record of loginRecords) {
    if (!appLoginMap.has(record.appId)) {
      appLoginMap.set(record.appId, new Set());
    }
    appLoginMap.get(record.appId)!.add(record.userId);
  }

  // 구독 앱별 할당 사용자 수 (SubscriptionUser)
  const assignedCounts = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      appId: { in: subscribedAppIds },
    },
    select: {
      appId: true,
      _count: { select: { assignedUsers: true } },
    },
  });

  // 앱별 할당 사용자 수 맵
  const appAssignedMap = new Map<string, number>();
  for (const sub of assignedCounts) {
    const current = appAssignedMap.get(sub.appId) || 0;
    appAssignedMap.set(sub.appId, current + sub._count.assignedUsers);
  }

  // 앱 이름 조회
  const apps = await prisma.app.findMany({
    where: { id: { in: subscribedAppIds } },
    select: { id: true, name: true },
  });
  const appNameMap = new Map(apps.map((app) => [app.id, app.name]));

  // 순위 계산
  const ranked = subscribedAppIds
    .map((appId) => {
      const loginCount = appLoginMap.get(appId)?.size || 0;
      const assignedCount = appAssignedMap.get(appId) || 0;
      return {
        appId,
        appName: appNameMap.get(appId) || "알 수 없음",
        userCount: loginCount,
        usageRate:
          assignedCount > 0
            ? Math.round((loginCount / assignedCount) * 100 * 10) / 10
            : 0,
      };
    })
    .sort((a, b) => b.userCount - a.userCount);

  return limit ? ranked.slice(0, limit) : ranked;
}

/**
 * 앱별 사용률 순위 조회 (외부 호출용)
 */
export async function getAppUsageRanking(): Promise<
  Array<{
    appId: string;
    appName: string;
    userCount: number;
    usageRate: number;
  }>
> {
  const { organizationId } = await requireOrganization();

  const userScope: Prisma.UserWhereInput = { organizationId };
  const subscribedAppIds = await getSubscribedAppIds(
    organizationId,
    userScope,
    false
  );

  return getAppUsageRankingInternal(
    organizationId,
    userScope,
    subscribedAppIds,
    10
  );
}

/**
 * 구독 금액을 월간 비용으로 정규화
 */
function toMonthlyCost(amount: number, billingCycle: string): number {
  switch (billingCycle) {
    case "YEARLY":
      return amount / 12;
    case "QUARTERLY":
      return amount / 3;
    case "MONTHLY":
      return amount;
    case "ONE_TIME":
    default:
      return 0;
  }
}

/**
 * 미사용 앱 목록 조회 (내부용)
 * 구독 앱 중 지정 기간 내 로그인 이력이 없는 앱
 */
async function getUnusedAppsInternal(
  organizationId: string,
  userScope: Prisma.UserWhereInput,
  hasUserFilter: boolean,
  periodStart?: Date
): Promise<
  Array<{
    appId: string;
    appName: string;
    lastUsedAt: string | null;
    licenseCount: number | null;
    monthlyWastedCost: number;
  }>
> {
  const cutoff =
    periodStart ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d;
    })();

  const apps = await prisma.app.findMany({
    where: {
      organizationId,
      subscriptions: {
        some: {
          status: "ACTIVE",
          ...(hasUserFilter
            ? { assignedUsers: { some: { user: userScope } } }
            : {}),
        },
      },
      userAccesses: {
        none: {
          lastUsedAt: { gte: cutoff },
          user: userScope,
        },
      },
    },
    select: {
      id: true,
      name: true,
      subscriptions: {
        select: { totalLicenses: true, amount: true, billingCycle: true },
        where: { status: "ACTIVE" },
      },
      userAccesses: {
        select: { lastUsedAt: true },
        orderBy: { lastUsedAt: "desc" },
        take: 1,
      },
    },
  });

  return apps.map((app) => {
    const monthlyCost = app.subscriptions.reduce(
      (sum, sub) => sum + toMonthlyCost(Number(sub.amount), sub.billingCycle),
      0
    );
    return {
      appId: app.id,
      appName: app.name,
      lastUsedAt: app.userAccesses[0]?.lastUsedAt?.toISOString() || null,
      licenseCount: app.subscriptions[0]?.totalLicenses || null,
      monthlyWastedCost: Math.round(monthlyCost),
    };
  });
}

/**
 * 미사용 앱 목록 조회 (외부 호출용)
 */
export async function getUnusedApps(): Promise<
  Array<{
    appId: string;
    appName: string;
    lastUsedAt: string | null;
    licenseCount: number | null;
    monthlyWastedCost: number;
  }>
> {
  const { organizationId } = await requireOrganization();
  const userScope: Prisma.UserWhereInput = { organizationId };

  return getUnusedAppsInternal(organizationId, userScope, false);
}

/**
 * 사용 현황 내보내기 데이터 생성
 */
export async function getUsageExportData(filters: UsageReportFilters): Promise<{
  summary: UsageReportData["summary"];
  activeUsersTrend: UsageReportData["activeUsersTrend"];
  appUsage: Array<{
    appName: string;
    userCount: number;
    usageRate: string;
  }>;
  unusedApps: Array<{
    appName: string;
    lastUsedAt: string;
    licenseCount: string;
  }>;
}> {
  const {
    organizationId,
    role,
    teamId: memberTeamId,
    userId,
  } = await requireOrganization();

  const isRestricted = role !== "ADMIN";
  const effectiveTeamId = isRestricted
    ? (memberTeamId ?? undefined)
    : filters.teamId;
  const effectiveUserId =
    isRestricted && !memberTeamId ? userId : filters.userId;

  const userScope: Prisma.UserWhereInput = {
    organizationId,
    ...(effectiveTeamId ? { teamId: effectiveTeamId } : {}),
    ...(effectiveUserId ? { id: effectiveUserId } : {}),
  };

  const hasUserFilter = !!(effectiveTeamId || effectiveUserId);
  const subscribedAppIds = await getSubscribedAppIds(
    organizationId,
    userScope,
    hasUserFilter
  );

  const report = await getUsageReport(filters);
  const appUsageAll = await getAppUsageRankingInternal(
    organizationId,
    userScope,
    subscribedAppIds
  );

  return {
    summary: report.summary,
    activeUsersTrend: report.activeUsersTrend,
    appUsage: appUsageAll.map((app) => ({
      appName: app.appName,
      userCount: app.userCount,
      usageRate: `${app.usageRate}%`,
    })),
    unusedApps: report.unusedApps.map((app) => ({
      appName: app.appName,
      lastUsedAt: app.lastUsedAt || "없음",
      licenseCount: app.licenseCount?.toString() || "-",
    })),
  };
}
