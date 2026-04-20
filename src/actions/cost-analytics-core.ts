// src/actions/cost-analytics-core.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type {
  AppCostDistribution,
  CostAnalyticsFilters,
  CostStatistics,
  GetCostStatisticsResult,
  GetTopCostAppsResult,
} from "@/types/cost-analytics";
import {
  applyCardTransactionScope,
  applyPaymentRecordScope,
  resolveReportScope,
} from "./cost-analytics-scope";
import { extractAmount, formatDateStr } from "./cost-analytics-utils";

/**
 * 비용 통계 조회
 * 총 비용, 월 평균, 전월 대비 증감률 등 핵심 지표를 반환
 */
export async function getCostStatistics(
  filters: CostAnalyticsFilters
): Promise<ActionState<GetCostStatisticsResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    const { startDate, endDate, appIds } = filters;
    const scope = resolveReportScope(filters, session.user);

    // 기본 날짜 설정 (지정되지 않은 경우 최근 30일)
    const now = new Date();
    const periodEnd = endDate || now;
    const periodStart =
      startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // PaymentRecord 현재 기간 집계 (SaaS 매칭된 결제만)
    const currentPaymentWhere: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      matchStatus: {
        in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
      },
      matchedAppId: { not: null },
      transactionDate: { gte: periodStart, lte: periodEnd },
      ...(appIds?.length ? { matchedAppId: { in: appIds } } : {}),
    };
    applyPaymentRecordScope(currentPaymentWhere, scope);

    const currentPaymentResult = await prisma.paymentRecord.aggregate({
      where: currentPaymentWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    // CardTransaction 현재 기간 집계 (승인내역 기준, 앱 필터 없을 때만)
    let currentCardResult: {
      _sum: { useAmt: unknown };
      _count: { id: number };
    } = {
      _sum: { useAmt: null },
      _count: { id: 0 },
    };
    if (!appIds?.length) {
      const currentCardWhere: Record<string, unknown> = {
        organizationId: session.user.organizationId,
        transactionType: "APPROVAL", // 승인내역 기준 조회
        matchedAppId: { not: null },
        useDt: {
          gte: formatDateStr(periodStart),
          lte: formatDateStr(periodEnd),
        },
      };
      applyCardTransactionScope(currentCardWhere, scope);

      currentCardResult = await prisma.cardTransaction.aggregate({
        where: currentCardWhere,
        _sum: { useAmt: true },
        _count: { id: true },
      });
    }

    // 전체 비용 (SaaS + Non-SaaS) 집계 — matchedAppId 필터 없이
    const allPaymentWhere: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      matchStatus: {
        in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
      },
      transactionDate: { gte: periodStart, lte: periodEnd },
    };
    applyPaymentRecordScope(allPaymentWhere, scope);

    const allPaymentResult = await prisma.paymentRecord.aggregate({
      where: allPaymentWhere,
      _sum: { amount: true },
    });

    let allCardTotal = 0;
    if (!appIds?.length) {
      const allCardWhere: Record<string, unknown> = {
        organizationId: session.user.organizationId,
        transactionType: "APPROVAL",
        useDt: {
          gte: formatDateStr(periodStart),
          lte: formatDateStr(periodEnd),
        },
      };
      applyCardTransactionScope(allCardWhere, scope);

      const allCardResult = await prisma.cardTransaction.aggregate({
        where: allCardWhere,
        _sum: { useAmt: true },
      });
      allCardTotal = Number(allCardResult._sum.useAmt || 0);
    }

    const totalCostAll =
      extractAmount(allPaymentResult._sum.amount) + allCardTotal;

    // 이전 기간 계산 (동일한 기간 길이)
    const periodLength = periodEnd.getTime() - periodStart.getTime();
    const previousPeriodStart = new Date(periodStart.getTime() - periodLength);
    const previousPeriodEnd = new Date(periodStart.getTime() - 1);

    // PaymentRecord 이전 기간 집계 (SaaS 매칭된 결제만)
    const previousPaymentWhere: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      matchStatus: {
        in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
      },
      matchedAppId: { not: null },
      transactionDate: { gte: previousPeriodStart, lte: previousPeriodEnd },
      ...(appIds?.length ? { matchedAppId: { in: appIds } } : {}),
    };
    applyPaymentRecordScope(previousPaymentWhere, scope);

    const previousPaymentResult = await prisma.paymentRecord.aggregate({
      where: previousPaymentWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    // CardTransaction 이전 기간 집계 (승인내역 기준, 앱 필터 없을 때만)
    let previousCardResult: {
      _sum: { useAmt: unknown };
      _count: { id: number };
    } = { _sum: { useAmt: null }, _count: { id: 0 } };
    if (!appIds?.length) {
      const previousCardWhere: Record<string, unknown> = {
        organizationId: session.user.organizationId,
        transactionType: "APPROVAL", // 승인내역 기준 조회
        matchedAppId: { not: null },
        useDt: {
          gte: formatDateStr(previousPeriodStart),
          lte: formatDateStr(previousPeriodEnd),
        },
      };
      applyCardTransactionScope(previousCardWhere, scope);

      previousCardResult = await prisma.cardTransaction.aggregate({
        where: previousCardWhere,
        _sum: { useAmt: true },
        _count: { id: true },
      });
    }

    // 통합 집계 (PaymentRecord + CardTransaction)
    const currentPaymentTotal = extractAmount(currentPaymentResult._sum.amount);
    const currentCardTotal = Number(currentCardResult._sum.useAmt || 0);
    const currentTotal = currentPaymentTotal + currentCardTotal;
    const currentCount =
      (currentPaymentResult._count.id || 0) +
      (currentCardResult._count.id || 0);

    const previousPaymentTotal = extractAmount(
      previousPaymentResult._sum.amount
    );
    const previousCardTotal = Number(previousCardResult._sum.useAmt || 0);
    const previousTotal = previousPaymentTotal + previousCardTotal;

    // 증감률 계산
    const costChange =
      previousTotal > 0
        ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
        : 0;

    // 월 평균 계산 (전체 기간 기준)
    let monthlyAverage = currentTotal;
    {
      const allTimePaymentWhere: Record<string, unknown> = {
        organizationId: session.user.organizationId,
        matchStatus: {
          in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
        },
        matchedAppId: { not: null },
        ...(appIds?.length ? { matchedAppId: { in: appIds } } : {}),
      };
      applyPaymentRecordScope(allTimePaymentWhere, scope);

      const [allTimePayment, earliestPayment] = await Promise.all([
        prisma.paymentRecord.aggregate({
          where: allTimePaymentWhere,
          _sum: { amount: true },
        }),
        prisma.paymentRecord.findFirst({
          where: allTimePaymentWhere,
          orderBy: { transactionDate: "asc" },
          select: { transactionDate: true },
        }),
      ]);

      let allTimeCardTotal = 0;
      let earliestCardDate: Date | null = null;

      if (!appIds?.length) {
        const allTimeCardWhere: Record<string, unknown> = {
          organizationId: session.user.organizationId,
          transactionType: "APPROVAL",
          matchedAppId: { not: null },
        };
        applyCardTransactionScope(allTimeCardWhere, scope);

        const [allTimeCard, earliestCard] = await Promise.all([
          prisma.cardTransaction.aggregate({
            where: allTimeCardWhere,
            _sum: { useAmt: true },
          }),
          prisma.cardTransaction.findFirst({
            where: allTimeCardWhere,
            orderBy: { useDt: "asc" },
            select: { useDt: true },
          }),
        ]);
        allTimeCardTotal = Number(allTimeCard._sum.useAmt || 0);
        if (earliestCard?.useDt) {
          const dt = earliestCard.useDt;
          earliestCardDate = new Date(
            `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`
          );
        }
      }

      const allTimeTotal =
        extractAmount(allTimePayment._sum.amount) + allTimeCardTotal;

      // 가장 오래된 거래일 결정
      let earliestDate: Date | null = earliestPayment?.transactionDate ?? null;
      if (
        earliestCardDate &&
        (!earliestDate || earliestCardDate < earliestDate)
      ) {
        earliestDate = earliestCardDate;
      }

      if (earliestDate && allTimeTotal > 0) {
        const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
        const totalMonths = Math.max(
          1,
          Math.ceil((now.getTime() - earliestDate.getTime()) / msPerMonth)
        );
        monthlyAverage = Math.round(allTimeTotal / totalMonths);
      }
    }

    const costDifference = Math.round(currentTotal - previousTotal);

    const statistics: CostStatistics = {
      totalCost: currentTotal,
      monthlyAverage,
      costChange,
      costDifference,
      transactionCount: currentCount,
      currency: "KRW",
      periodStart,
      periodEnd,
      totalCostAll,
    };

    return {
      success: true,
      data: { statistics },
    };
  } catch (error) {
    console.error("비용 통계 조회 오류:", error);
    return { success: false, message: "비용 통계 조회 중 오류가 발생했습니다" };
  }
}

/**
 * 비용 상위 앱 조회
 * PaymentRecord + CardTransaction 통합, matchStatus 5종 사용
 */
export async function getTopCostApps(options: {
  limit?: number | null;
  startDate?: Date;
  endDate?: Date;
  teamId?: string;
  userId?: string;
}): Promise<ActionState<GetTopCostAppsResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    const { limit, startDate, endDate, teamId, userId } = options;
    const take = limit === undefined ? 5 : limit;
    const scope = resolveReportScope({ teamId, userId }, session.user);

    // PaymentRecord groupBy (matchStatus 5종 통일)
    const paymentWhere: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      matchStatus: {
        in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
      },
      matchedAppId: { not: null },
    };
    applyPaymentRecordScope(paymentWhere, scope);

    if (startDate || endDate) {
      paymentWhere.transactionDate = {};
      if (startDate) {
        (paymentWhere.transactionDate as Record<string, Date>).gte = startDate;
      }
      if (endDate) {
        (paymentWhere.transactionDate as Record<string, Date>).lte = endDate;
      }
    }

    const groupedPayments = await prisma.paymentRecord.groupBy({
      by: ["matchedAppId"],
      where: paymentWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    // CardTransaction groupBy (승인내역 기준, SaaS 매칭된 것만)
    const cardWhere: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      transactionType: "APPROVAL",
      matchedAppId: { not: null },
    };
    applyCardTransactionScope(cardWhere, scope);

    if (startDate || endDate) {
      cardWhere.useDt = {};
      if (startDate) {
        (cardWhere.useDt as Record<string, string>).gte =
          formatDateStr(startDate);
      }
      if (endDate) {
        (cardWhere.useDt as Record<string, string>).lte =
          formatDateStr(endDate);
      }
    }

    const groupedCards = await prisma.cardTransaction.groupBy({
      by: ["matchedAppId"],
      where: cardWhere,
      _sum: { useAmt: true },
      _count: { id: true },
    });

    // 앱별 비용 병합 (PaymentRecord + CardTransaction)
    const costMap = new Map<string, { cost: number; count: number }>();

    for (const g of groupedPayments) {
      if (!g.matchedAppId) continue;
      const existing = costMap.get(g.matchedAppId) || { cost: 0, count: 0 };
      existing.cost += extractAmount(g._sum.amount);
      existing.count += g._count.id || 0;
      costMap.set(g.matchedAppId, existing);
    }

    for (const g of groupedCards) {
      if (!g.matchedAppId) continue;
      const existing = costMap.get(g.matchedAppId) || { cost: 0, count: 0 };
      existing.cost += Number(g._sum.useAmt || 0);
      existing.count += g._count.id || 0;
      costMap.set(g.matchedAppId, existing);
    }

    // 비용 기준 정렬 후 top-N 추출
    const sorted = [...costMap.entries()].sort((a, b) => b[1].cost - a[1].cost);
    const topEntries = take ? sorted.slice(0, take) : sorted;

    // 앱 정보 조회
    const appIds = topEntries.map(([id]) => id);

    const apps = await prisma.app.findMany({
      where: { id: { in: appIds } },
      select: { id: true, name: true, customLogoUrl: true },
    });

    const appMap = new Map(apps.map((app) => [app.id, app]));

    // 전체 비용 계산 (모든 앱의 합산, top-N만이 아닌 전체)
    let totalCost = 0;
    for (const [, val] of sorted) {
      totalCost += val.cost;
    }

    // 결과 구성
    const appDistributions: AppCostDistribution[] = topEntries.map(
      ([appId, val]) => {
        const appInfo = appMap.get(appId);
        return {
          appId,
          appName: appInfo?.name || "알 수 없음",
          appLogoUrl: appInfo?.customLogoUrl || undefined,
          totalCost: val.cost,
          percentage: totalCost > 0 ? (val.cost / totalCost) * 100 : 0,
          transactionCount: val.count,
        };
      }
    );

    return {
      success: true,
      data: { apps: appDistributions, totalCost },
    };
  } catch (error) {
    console.error("상위 비용 앱 조회 오류:", error);
    return {
      success: false,
      message: "상위 비용 앱 조회 중 오류가 발생했습니다",
    };
  }
}
