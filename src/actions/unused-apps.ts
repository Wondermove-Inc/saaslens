// src/actions/unused-apps.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { extractMainDomain } from "@/lib/utils/domain-extractor";
import type { ActionState } from "@/types";

const INACTIVE_DAYS_THRESHOLD = 30;

export interface UnusedAppsResult {
  count: number;
  cost: number;
}

function toMonthlyAmount(amount: number, billingCycle: string): number {
  switch (billingCycle) {
    case "YEARLY":
      return amount / 12;
    case "QUARTERLY":
      return amount / 3;
    default:
      // MONTHLY, ONE_TIME
      return amount;
  }
}

function toNumber(value: unknown): number {
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value ?? 0);
}

/**
 * 구독 미사용 비용 집계 (사용자별 구독 분석)
 *
 * 사용 여부 판단: UserAppAccess OR ExtensionUsage (OR 조건)
 * - UserAppAccess: 로그인 이벤트 기반 (lastUsedAt >= 30일 전)
 * - ExtensionUsage: 브라우징 로그 기반 (date >= 30일 전, 앱 도메인 매칭)
 *
 * 빌링 타입별 계산:
 * - FLAT_RATE (기본): 할당된 사용자 중 1명이라도 활성이면 사용 중
 * - PER_SEAT: 미활성 사용자 수 × perSeatPrice
 *
 * count: 미사용 구독 수
 * cost: 미사용 구독의 월 환산 비용 합계
 */
export async function getUnusedApps(): Promise<ActionState<UnusedAppsResult>> {
  try {
    const { organizationId } = await requireOrganization();

    // 1) ACTIVE 구독 조회 (할당된 사용자 + 앱 도메인 정보 포함)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        appId: true,
        billingType: true,
        billingCycle: true,
        amount: true,
        perSeatPrice: true,
        totalLicenses: true,
        assignedUsers: { select: { userId: true } },
        app: {
          select: {
            customWebsite: true,
            catalog: {
              select: {
                website: true,
                patterns: {
                  where: { matchType: "DOMAIN" },
                  select: { pattern: true },
                },
              },
            },
          },
        },
      },
    });

    if (subscriptions.length === 0) {
      return { success: true, data: { count: 0, cost: 0 } };
    }

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVE_DAYS_THRESHOLD);

    // 2) 고유 appId 목록
    const appIds = [...new Set(subscriptions.map((s) => s.appId))];

    // 3-1) UserAppAccess: 30일 내 로그인 이력 조회
    const recentAccesses = await prisma.userAppAccess.findMany({
      where: {
        appId: { in: appIds },
        lastUsedAt: { gte: thresholdDate },
      },
      select: { appId: true, userId: true },
    });

    // "appId:userId" Set으로 빠른 조회
    const accessSet = new Set(
      recentAccesses.map((a) => `${a.appId}:${a.userId}`)
    );

    // 3-2) appId → domain[] 역방향 맵 구축 (ExtensionUsage 매칭용)
    const domainToAppId = new Map<string, string>();
    for (const sub of subscriptions) {
      if (!sub.app) continue;
      const domains: string[] = [];

      if (sub.app.customWebsite) {
        const d = extractMainDomain(sub.app.customWebsite);
        if (d) domains.push(d);
      }
      if (sub.app.catalog?.website) {
        const d = extractMainDomain(sub.app.catalog.website);
        if (d) domains.push(d);
      }
      for (const p of sub.app.catalog?.patterns ?? []) {
        const d = p.pattern.toLowerCase().replace(/^\*\./, "");
        if (d) domains.push(d);
      }

      for (const d of domains) {
        domainToAppId.set(d, sub.appId);
      }
    }

    // 3-3) ExtensionUsage: 30일 내 브라우징 기록 (앱 도메인 기반)
    const usageSet = new Set<string>();
    if (domainToAppId.size > 0) {
      const recentUsages = await prisma.extensionUsage.findMany({
        where: {
          organizationId,
          domain: { in: [...domainToAppId.keys()] },
          date: { gte: thresholdDate },
          userId: { not: null },
        },
        select: { domain: true, userId: true },
      });

      for (const u of recentUsages) {
        const appId = domainToAppId.get(u.domain);
        if (appId && u.userId) {
          usageSet.add(`${appId}:${u.userId}`);
        }
      }
    }

    // 활성 사용자 판단: UserAppAccess OR ExtensionUsage
    const isActiveUser = (appId: string, userId: string): boolean =>
      accessSet.has(`${appId}:${userId}`) || usageSet.has(`${appId}:${userId}`);

    // 4) 구독별 미사용 비용 계산
    const unusedAppIds = new Set<string>(); // 미사용 앱 수 (구독이 아닌 앱 단위)
    let totalMonthlyCost = 0;

    for (const sub of subscriptions) {
      const amount = toNumber(sub.amount);
      const monthlyAmount = toMonthlyAmount(amount, sub.billingCycle);
      const assignedUserIds = (sub.assignedUsers ?? []).map((u) => u.userId);

      if (sub.billingType === "PER_SEAT") {
        // 미접속 사용자 수 × perSeatPrice
        const perSeatPrice =
          toNumber(sub.perSeatPrice) ||
          (sub.totalLicenses && sub.totalLicenses > 0
            ? monthlyAmount / sub.totalLicenses
            : 0);

        const inactiveCount = assignedUserIds.filter(
          (uid) => !isActiveUser(sub.appId, uid)
        ).length;

        if (inactiveCount > 0 && perSeatPrice > 0) {
          totalMonthlyCost += inactiveCount * perSeatPrice;
          unusedAppIds.add(sub.appId);
        }
      } else {
        // FLAT_RATE (기본): 할당 사용자 중 활성 사용자가 없으면 미사용
        const hasActiveUser = assignedUserIds.some((uid) =>
          isActiveUser(sub.appId, uid)
        );
        if (!hasActiveUser) {
          totalMonthlyCost += monthlyAmount;
          unusedAppIds.add(sub.appId);
        }
      }
    }

    return {
      success: true,
      data: {
        count: unusedAppIds.size,
        cost: Math.round(totalMonthlyCost),
      },
    };
  } catch (error) {
    console.error("미사용 구독 조회 오류:", error);
    return { success: false, error: "미사용 구독 조회에 실패했습니다" };
  }
}
