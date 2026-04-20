// src/actions/department-activity.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

// ============================================================================
// Types
// ============================================================================

export interface DepartmentActivityItem {
  department: string;
  teamId: string;
  monthlyActivity: Array<{ month: string; count: number }>;
  activeUsers: number;
  totalUsers: number;
  activeApps: number;
  appUsage: Array<{ appName: string; usageRate: number; userCount: number }>;
}

export interface DepartmentActivityReport {
  departments: DepartmentActivityItem[];
  totalMonthlyActivity: Array<{ month: string; count: number }>;
  summary: {
    totalDepartments: number;
    totalActiveUsers: number;
    totalActivityCount: number;
  };
}

export interface ActivityHeatmapData {
  data: Array<{ date: string; count: number }>;
  totalCount: number;
  period: { start: string; end: string };
}

export interface TopCostApp {
  name: string;
  cost: number;
  category: string | null;
  users: number;
  trend: number; // MoM percentage change
}

// ============================================================================
// getDepartmentActivityReport
// ============================================================================

/**
 * 부서별 월간 활동 추이 + 앱 사용률 조회
 * - AuditLog 기반 활동량 집계
 * - UserAppAccess 기반 사용률 계산
 */
export async function getDepartmentActivityReport(): Promise<DepartmentActivityReport> {
  const { organizationId } = await requireOrganization();

  // 1. 팀(부서) 목록 조회
  const teams = await prisma.team.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      members: {
        select: { id: true },
        where: { status: "ACTIVE" },
      },
    },
  });

  if (teams.length === 0) {
    return {
      departments: [],
      totalMonthlyActivity: [],
      summary: {
        totalDepartments: 0,
        totalActiveUsers: 0,
        totalActivityCount: 0,
      },
    };
  }

  // 2. 12개월 기간 설정
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // 3. AuditLog에서 부서별 월간 활동 집계
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      createdAt: { gte: startDate },
      userId: { not: null },
    },
    select: {
      createdAt: true,
      userId: true,
      user: {
        select: { teamId: true },
      },
    },
  });

  // 팀별 월별 활동 카운트
  const teamMonthlyCount = new Map<string, Map<string, number>>();
  const totalMonthlyCount = new Map<string, number>();

  for (const log of auditLogs) {
    const teamId = log.user?.teamId;
    if (!teamId) continue;

    const monthKey = `${log.createdAt.getFullYear()}-${String(log.createdAt.getMonth() + 1).padStart(2, "0")}`;

    // 팀별 카운트
    if (!teamMonthlyCount.has(teamId)) {
      teamMonthlyCount.set(teamId, new Map());
    }
    const teamMap = teamMonthlyCount.get(teamId)!;
    teamMap.set(monthKey, (teamMap.get(monthKey) || 0) + 1);

    // 전체 카운트
    totalMonthlyCount.set(monthKey, (totalMonthlyCount.get(monthKey) || 0) + 1);
  }

  // 4. UserAppAccess에서 30일 내 활성 사용자 집계
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const userAppAccesses = await prisma.userAppAccess.findMany({
    where: {
      user: { organizationId },
      lastUsedAt: { gte: thirtyDaysAgo },
    },
    select: {
      userId: true,
      appId: true,
      app: { select: { name: true } },
      user: { select: { teamId: true } },
    },
  });

  // 팀별 활성 사용자 및 앱 사용 집계
  const teamActiveUsers = new Map<string, Set<string>>();
  const teamActiveApps = new Map<string, Set<string>>();
  const teamAppUsers = new Map<string, Map<string, Set<string>>>();

  for (const access of userAppAccesses) {
    const teamId = access.user?.teamId;
    if (!teamId) continue;

    // 활성 사용자
    if (!teamActiveUsers.has(teamId)) {
      teamActiveUsers.set(teamId, new Set());
    }
    teamActiveUsers.get(teamId)!.add(access.userId);

    // 활성 앱
    if (!teamActiveApps.has(teamId)) {
      teamActiveApps.set(teamId, new Set());
    }
    teamActiveApps.get(teamId)!.add(access.appId);

    // 앱별 사용자
    if (!teamAppUsers.has(teamId)) {
      teamAppUsers.set(teamId, new Map());
    }
    const appMap = teamAppUsers.get(teamId)!;
    if (!appMap.has(access.app.name)) {
      appMap.set(access.app.name, new Set());
    }
    appMap.get(access.app.name)!.add(access.userId);
  }

  // 5. 월 키 생성 (12개월)
  const monthKeys: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  // 6. 부서별 데이터 조합
  const departments: DepartmentActivityItem[] = teams.map((team) => {
    const teamMap = teamMonthlyCount.get(team.id) || new Map();
    const monthlyActivity = monthKeys.map((month) => ({
      month,
      count: teamMap.get(month) || 0,
    }));

    const activeUserSet = teamActiveUsers.get(team.id) || new Set();
    const activeAppSet = teamActiveApps.get(team.id) || new Set();
    const appUsersMap = teamAppUsers.get(team.id) || new Map();

    // 앱별 사용률 (활성사용자/전체멤버)
    const totalUsers = team.members.length;
    const appUsage = Array.from(appUsersMap.entries())
      .map(([appName, users]) => ({
        appName,
        userCount: users.size,
        usageRate:
          totalUsers > 0 ? Math.round((users.size / totalUsers) * 100) : 0,
      }))
      .sort((a, b) => b.usageRate - a.usageRate)
      .slice(0, 5);

    return {
      department: team.name,
      teamId: team.id,
      monthlyActivity,
      activeUsers: activeUserSet.size,
      totalUsers,
      activeApps: activeAppSet.size,
      appUsage,
    };
  });

  // 7. 전체 월간 활동
  const totalMonthlyActivity = monthKeys.map((month) => ({
    month,
    count: totalMonthlyCount.get(month) || 0,
  }));

  // 8. 요약
  const totalActivityCount = Array.from(totalMonthlyCount.values()).reduce(
    (sum, count) => sum + count,
    0
  );
  const totalActiveUsers = new Set(userAppAccesses.map((a) => a.userId)).size;

  return {
    departments: departments.filter(
      (d) => d.totalUsers > 0 || d.activeUsers > 0
    ),
    totalMonthlyActivity,
    summary: {
      totalDepartments: departments.filter((d) => d.totalUsers > 0).length,
      totalActiveUsers,
      totalActivityCount,
    },
  };
}

// ============================================================================
// getActivityHeatmapByDept
// ============================================================================

/**
 * 부서별/전체 연간 활동 히트맵 데이터 조회
 * @param teamId - 특정 부서만 조회 (optional, 없으면 전체)
 */
export async function getActivityHeatmapByDept(
  teamId?: string
): Promise<ActivityHeatmapData> {
  const { organizationId } = await requireOrganization();

  // 1년 기간 설정
  const now = new Date();
  const startDate = new Date(now);
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setHours(0, 0, 0, 0);

  // 팀 필터 조건 구성
  const whereCondition: Record<string, unknown> = {
    organizationId,
    createdAt: { gte: startDate },
  };

  if (teamId) {
    whereCondition.user = { teamId };
  }

  // AuditLog 조회
  const logs = await prisma.auditLog.findMany({
    where: whereCondition,
    select: { createdAt: true },
  });

  // 일별 집계
  const dailyCount = new Map<string, number>();
  for (const log of logs) {
    const dateKey = log.createdAt.toISOString().split("T")[0];
    dailyCount.set(dateKey, (dailyCount.get(dateKey) || 0) + 1);
  }

  // 365일 데이터 생성 (빈 날짜도 포함)
  const data: Array<{ date: string; count: number }> = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    data.push({
      date: dateStr,
      count: dailyCount.get(dateStr) || 0,
    });
  }

  const totalCount = logs.length;

  return {
    data,
    totalCount,
    period: {
      start: startDate.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
    },
  };
}

// ============================================================================
// getTopCostAppsWithTrend
// ============================================================================

/**
 * 비용 상위 앱 + MoM 추세 조회
 * @param limit - 반환할 앱 개수 (기본 10)
 */
export async function getTopCostAppsWithTrend(
  limit: number = 10
): Promise<TopCostApp[]> {
  const { organizationId } = await requireOrganization();

  // 이전 월 끝 시점 설정 (MoM 비교용)
  const now = new Date();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // ACTIVE 구독 조회 (현재)
  const subscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
    },
    select: {
      appId: true,
      amount: true,
      billingCycle: true,
      createdAt: true,
      app: {
        select: {
          name: true,
          category: true,
        },
      },
      assignedUsers: {
        select: { userId: true },
      },
    },
  });

  // 앱별 비용 및 사용자 집계
  const appCostMap = new Map<
    string,
    {
      name: string;
      category: string | null;
      currentCost: number;
      users: Set<string>;
    }
  >();

  for (const sub of subscriptions) {
    let monthlyCost = Number(sub.amount);
    if (sub.billingCycle === "YEARLY") monthlyCost /= 12;
    if (sub.billingCycle === "QUARTERLY") monthlyCost /= 3;

    if (!appCostMap.has(sub.appId)) {
      appCostMap.set(sub.appId, {
        name: sub.app.name,
        category: sub.app.category,
        currentCost: 0,
        users: new Set(),
      });
    }

    const appData = appCostMap.get(sub.appId)!;
    appData.currentCost += monthlyCost;
    for (const au of sub.assignedUsers) {
      appData.users.add(au.userId);
    }
  }

  // 이전 달 구독 조회 (비용 추세 계산용)
  const lastMonthSubs = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      createdAt: { lte: lastMonthEnd },
    },
    select: {
      appId: true,
      amount: true,
      billingCycle: true,
    },
  });

  const lastMonthCostMap = new Map<string, number>();
  for (const sub of lastMonthSubs) {
    let monthlyCost = Number(sub.amount);
    if (sub.billingCycle === "YEARLY") monthlyCost /= 12;
    if (sub.billingCycle === "QUARTERLY") monthlyCost /= 3;

    lastMonthCostMap.set(
      sub.appId,
      (lastMonthCostMap.get(sub.appId) || 0) + monthlyCost
    );
  }

  // 결과 조합
  const result: TopCostApp[] = Array.from(appCostMap.entries())
    .map(([appId, data]) => {
      const lastCost = lastMonthCostMap.get(appId) || 0;
      const trend =
        lastCost > 0
          ? Math.round(((data.currentCost - lastCost) / lastCost) * 100 * 10) /
            10
          : 0;

      return {
        name: data.name,
        cost: Math.round(data.currentCost),
        category: data.category,
        users: data.users.size,
        trend,
      };
    })
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);

  return result;
}
