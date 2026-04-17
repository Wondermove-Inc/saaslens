// src/actions/dashboard2-cost.ts
// @deprecated Dashboard2 전용 비용 액션. 리포트용은 @/actions/reports/cost-analytics 사용.
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { SpendByCategory, TopSpendingApp } from "@/types/dashboard2";
import { SubscriptionStatus } from "@prisma/client";

import {
  DEFAULT_BUDGET_SETTINGS,
  type BudgetSettings,
} from "./dashboard2-cost.constants";

/**
 * 카테고리별 지출 조회 (전월 대비 증감률 포함)
 * 증감률은 전월에 시작된 구독 vs 이번 달 시작된 구독 기준으로 추정
 */
export async function getSpendByCategory(): Promise<SpendByCategory[]> {
  const { organizationId } = await requireOrganization();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 현재 활성 구독 조회
  const subscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: SubscriptionStatus.ACTIVE,
    },
    include: { app: { select: { category: true } } },
  });

  // 현재 월 카테고리별 합계 및 구독 건수
  const categoryTotals = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const sub of subscriptions) {
    const category = sub.app.category || "Other";
    const current = categoryTotals.get(category) || 0;
    categoryTotals.set(category, current + Number(sub.amount || 0));
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  // 전월 기준 카테고리별 합계 추정
  // 전월 이전에 시작된 구독만 포함 (이번 달에 새로 시작된 구독 제외)
  const previousCategoryTotals = new Map<string, number>();
  for (const sub of subscriptions) {
    const startDate = sub.startDate ? new Date(sub.startDate) : null;
    // 전월 이전에 시작된 구독만 포함
    if (startDate && startDate < currentMonthStart) {
      const category = sub.app.category || "Other";
      const current = previousCategoryTotals.get(category) || 0;
      previousCategoryTotals.set(category, current + Number(sub.amount || 0));
    }
  }

  const totalAmount = Array.from(categoryTotals.values()).reduce(
    (a, b) => a + b,
    0
  );

  const result: SpendByCategory[] = Array.from(categoryTotals.entries())
    .map(([category, amount]) => {
      const previousAmount = previousCategoryTotals.get(category) || 0;
      // 증감률 계산: ((현재 - 이전) / 이전) * 100
      let changeRate: number | undefined;
      if (previousAmount > 0) {
        changeRate = Math.round(
          ((amount - previousAmount) / previousAmount) * 100
        );
      } else if (amount > 0) {
        // 전월에 없던 카테고리면 신규 (100% 증가로 표시)
        changeRate = 100;
      }

      return {
        category,
        amount,
        percentage:
          totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        subscriptionCount: categoryCounts.get(category) || 0,
        changeRate,
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5); // Top 5 카테고리

  return result;
}

/**
 * Top Spending Apps 조회 (사용자 수 + 미사용률 포함)
 */
export async function getTopSpendingApps(
  limit: number = 10
): Promise<TopSpendingApp[]> {
  const { organizationId } = await requireOrganization();

  const subscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: SubscriptionStatus.ACTIVE,
    },
    include: {
      app: {
        select: {
          id: true,
          name: true,
          customLogoUrl: true,
          _count: {
            select: { userAccesses: true },
          },
        },
      },
    },
    orderBy: { amount: "desc" },
    take: limit,
  });

  return subscriptions.map((sub) => {
    const totalLicenses = sub.totalLicenses || 0;
    const usedLicenses = sub.app._count.userAccesses;
    // 미사용률 계산: (총 라이선스 - 사용 중) / 총 라이선스 * 100
    const unusedRate =
      totalLicenses > 0
        ? Math.round(((totalLicenses - usedLicenses) / totalLicenses) * 100)
        : 0;

    return {
      id: sub.app.id,
      name: sub.app.name,
      logo: sub.app.customLogoUrl,
      userCount: usedLicenses,
      monthlyCost: Number(sub.amount || 0),
      totalLicenses: totalLicenses > 0 ? totalLicenses : undefined,
      unusedRate: totalLicenses > 0 ? unusedRate : undefined,
    };
  });
}

// ==================== 예산 관련 헬퍼 함수 ====================

/**
 * 대시보드용 예산 설정 조회
 */
export async function getBudgetSettingsForDashboard(
  organizationId: string
): Promise<BudgetSettings> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  if (!organization) {
    return DEFAULT_BUDGET_SETTINGS;
  }

  const settings = organization.settings as {
    budget?: Partial<BudgetSettings>;
  } | null;
  const budget = settings?.budget;

  if (!budget) {
    return DEFAULT_BUDGET_SETTINGS;
  }

  return {
    currency: budget.currency ?? DEFAULT_BUDGET_SETTINGS.currency,
    monthlyBudget:
      budget.monthlyBudget ?? DEFAULT_BUDGET_SETTINGS.monthlyBudget,
    alertThreshold:
      budget.alertThreshold ?? DEFAULT_BUDGET_SETTINGS.alertThreshold,
  };
}

/**
 * 대시보드 차트용 월별 예산 조회
 * - monthlyBudget이 설정되어 있으면 해당 값 반환
 * - 설정되지 않았으면 (null) 전월 카드 매입 승인 내역 총액 반환
 */
export async function getMonthlyBudgetForDashboard(
  organizationId: string,
  month: Date,
  budgetSettings: BudgetSettings
): Promise<number> {
  // 예산이 설정되어 있으면 해당 값 반환
  if (budgetSettings.monthlyBudget !== null) {
    return budgetSettings.monthlyBudget;
  }

  // Fallback: 전월 카드 매입 승인 내역 총액
  const prevMonth = new Date(month);
  prevMonth.setMonth(prevMonth.getMonth() - 1);

  const year = prevMonth.getFullYear();
  const monthNum = prevMonth.getMonth() + 1;

  const prevMonthStart = `${year}${String(monthNum).padStart(2, "0")}01`;
  const prevMonthEnd = `${year}${String(monthNum).padStart(2, "0")}31`;

  const cardTransactions = await prisma.cardTransaction.aggregate({
    where: {
      organizationId,
      useDt: {
        gte: prevMonthStart,
        lte: prevMonthEnd,
      },
    },
    _sum: { useAmt: true },
  });

  // Decimal 타입 처리
  const sum = cardTransactions._sum.useAmt;
  if (sum === null) {
    // 전월 카드 매입 내역도 없으면 0 반환
    return 0;
  }

  // Prisma Decimal은 toNumber() 메서드를 가짐
  if (typeof sum === "object" && "toNumber" in sum) {
    return (sum as { toNumber: () => number }).toNumber();
  }

  return Number(sum);
}
