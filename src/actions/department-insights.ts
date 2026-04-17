// src/actions/department-insights.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

export interface DepartmentSpend {
  department: string;
  totalCost: number;
  headcount: number;
  perEmployee: number;
}

export interface DepartmentTopApp {
  department: string;
  appName: string;
  appCost: number;
}

export interface DepartmentInsights {
  totalDepartments: number;
  departments: DepartmentSpend[];
  topApps: DepartmentTopApp[];
}

export async function getDepartmentInsights(): Promise<DepartmentInsights> {
  const { organizationId } = await requireOrganization();

  // 1. 팀 목록 조회
  const teams = await prisma.team.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });

  if (teams.length === 0) {
    return { totalDepartments: 0, departments: [], topApps: [] };
  }

  // 2. ACTIVE 구독 조회 (teamId, amount, assignedUsers, app 정보 포함)
  const subscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      teamId: true,
      amount: true,
      app: { select: { name: true } },
      assignedUsers: {
        select: {
          user: { select: { id: true, teamId: true } },
        },
      },
    },
  });

  // 팀별 비용 및 사용자 추적
  const teamCostMap = new Map<string, number>();
  const teamUserSet = new Map<string, Set<string>>();
  // 팀별 앱별 비용 추적
  const teamAppCostMap = new Map<string, Map<string, number>>();

  const teamIdSet = new Set(teams.map((t) => t.id));

  for (const sub of subscriptions) {
    const amount = Number(sub.amount);

    if (sub.teamId && teamIdSet.has(sub.teamId)) {
      // Case A: 구독에 teamId가 직접 지정된 경우 → 해당 팀에 전액 귀속
      teamCostMap.set(sub.teamId, (teamCostMap.get(sub.teamId) || 0) + amount);

      // 앱별 비용
      const appMap =
        teamAppCostMap.get(sub.teamId) || new Map<string, number>();
      appMap.set(sub.app.name, (appMap.get(sub.app.name) || 0) + amount);
      teamAppCostMap.set(sub.teamId, appMap);

      // 배정된 사용자를 해당 팀 headcount에 포함
      for (const au of sub.assignedUsers) {
        const userSet = teamUserSet.get(sub.teamId) || new Set<string>();
        userSet.add(au.user.id);
        teamUserSet.set(sub.teamId, userSet);
      }
    } else {
      // Case B: teamId가 null인 구독 → assignedUsers의 user.teamId 기준 비율 분배
      const usersWithTeam = sub.assignedUsers.filter(
        (au) => au.user.teamId && teamIdSet.has(au.user.teamId!)
      );
      const totalAssigned = sub.assignedUsers.length;

      if (totalAssigned === 0) continue;

      // 팀별 사용자 수 집계
      const teamCountInSub = new Map<string, number>();
      for (const au of usersWithTeam) {
        const tid = au.user.teamId!;
        teamCountInSub.set(tid, (teamCountInSub.get(tid) || 0) + 1);
      }

      // 비율 분배
      for (const [tid, count] of teamCountInSub) {
        const allocatedCost = Math.round((amount * count) / totalAssigned);
        teamCostMap.set(tid, (teamCostMap.get(tid) || 0) + allocatedCost);

        // 앱별 비용
        const appMap = teamAppCostMap.get(tid) || new Map<string, number>();
        appMap.set(
          sub.app.name,
          (appMap.get(sub.app.name) || 0) + allocatedCost
        );
        teamAppCostMap.set(tid, appMap);
      }

      // 사용자 headcount 추적
      for (const au of usersWithTeam) {
        const tid = au.user.teamId!;
        const userSet = teamUserSet.get(tid) || new Set<string>();
        userSet.add(au.user.id);
        teamUserSet.set(tid, userSet);
      }
    }
  }

  // 3. 팀 이름 매핑 & DepartmentSpend 생성
  const departments: DepartmentSpend[] = teams
    .map((team) => {
      const totalCost = teamCostMap.get(team.id) || 0;
      const headcount = teamUserSet.get(team.id)?.size || 0;
      const perEmployee = headcount > 0 ? Math.round(totalCost / headcount) : 0;
      return {
        department: team.name,
        totalCost,
        headcount,
        perEmployee,
      };
    })
    .filter((d) => d.totalCost > 0 || d.headcount > 0)
    .sort((a, b) => b.totalCost - a.totalCost);

  // 4. Top 앱: 전체 팀의 앱별 비용 합산 후 상위 5개
  const globalAppCostMap = new Map<string, number>();
  for (const [, appMap] of teamAppCostMap) {
    for (const [appName, cost] of appMap) {
      globalAppCostMap.set(
        appName,
        (globalAppCostMap.get(appName) || 0) + cost
      );
    }
  }

  const topApps: DepartmentTopApp[] = Array.from(globalAppCostMap.entries())
    .map(([appName, appCost]) => ({ department: "전체", appName, appCost }))
    .sort((a, b) => b.appCost - a.appCost)
    .slice(0, 5);

  return {
    totalDepartments: departments.length,
    departments,
    topApps,
  };
}
