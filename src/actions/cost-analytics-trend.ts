// src/actions/cost-analytics-trend.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type {
  GetMonthlyCostTrendResult,
  MonthlyCostTrend,
  UnmatchedPaymentSummary,
} from "@/types/cost-analytics";
import {
  applyCardTransactionScope,
  applyPaymentRecordScope,
  resolveReportScope,
} from "./cost-analytics-scope";
import {
  extractAmount,
  formatDisplayLabel,
  formatMonthKey,
} from "./cost-analytics-utils";

/**
 * 월별 비용 추세 조회
 */
export async function getMonthlyCostTrend(options: {
  months?: number;
  appIds?: string[];
  teamId?: string;
  userId?: string;
}): Promise<ActionState<GetMonthlyCostTrendResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    const { months = 6, appIds, teamId, userId } = options;
    const scope = resolveReportScope({ teamId, userId }, session.user);

    // 기간 계산
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - months + 1,
      1
    );

    // CardTransaction 조회 (앱 필터가 없을 때만 포함, 승인내역 기준)
    // matchedAppId를 포함하여 SaaS/Non-SaaS 분류
    let cardPayments: Array<{
      transactionDate: Date;
      amount: number;
      isSaas: boolean;
    }> = [];
    if (!appIds?.length) {
      const startStr = startDate.toISOString().slice(0, 10).replace(/-/g, "");
      const cardWhere: Record<string, unknown> = {
        organizationId: session.user.organizationId,
        transactionType: "APPROVAL", // 승인내역 기준 조회
        useDt: { gte: startStr },
      };
      applyCardTransactionScope(cardWhere, scope);

      const cardTransactions = await prisma.cardTransaction.findMany({
        where: cardWhere,
        select: {
          useDt: true,
          useAmt: true,
          matchedAppId: true, // SaaS 분류용
        },
      });

      cardPayments = cardTransactions.map((tx) => ({
        transactionDate: new Date(
          parseInt(tx.useDt.substring(0, 4)),
          parseInt(tx.useDt.substring(4, 6)) - 1,
          parseInt(tx.useDt.substring(6, 8))
        ),
        amount: Number(tx.useAmt),
        isSaas: tx.matchedAppId !== null, // 앱과 매칭되면 SaaS
      }));
    }

    // PaymentRecord 조회 (PENDING/UNMATCHED도 Non-SaaS 비용으로 집계)
    // matchedAppId를 포함하여 SaaS/Non-SaaS 분류
    const paymentWhere: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      matchStatus: {
        in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
      },
      transactionDate: { gte: startDate },
      ...(appIds?.length ? { matchedAppId: { in: appIds } } : {}),
    };
    applyPaymentRecordScope(paymentWhere, scope);

    const csvPayments = await prisma.paymentRecord.findMany({
      where: paymentWhere,
      select: {
        transactionDate: true,
        amount: true,
        matchedAppId: true, // SaaS 분류용
      },
    });

    // 통합 결제 목록 (isSaas 플래그 포함)
    const payments = [
      ...cardPayments,
      ...csvPayments.map((p) => ({
        transactionDate: p.transactionDate,
        amount: extractAmount(p.amount),
        isSaas: p.matchedAppId !== null, // 앱과 매칭되면 SaaS
      })),
    ];

    // 월별 SaaS/Non-SaaS 분리 집계
    const monthlyData = new Map<
      string,
      {
        saasCost: number;
        nonSaasCost: number;
        saasCount: number;
        nonSaasCount: number;
      }
    >();

    // 초기화: 모든 월에 대해 빈 데이터 생성
    for (let i = 0; i < months; i++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - months + 1 + i,
        1
      );
      const key = formatMonthKey(date);
      monthlyData.set(key, {
        saasCost: 0,
        nonSaasCost: 0,
        saasCount: 0,
        nonSaasCount: 0,
      });
    }

    // 데이터 집계 (SaaS/Non-SaaS 분리)
    payments.forEach((payment) => {
      const key = formatMonthKey(payment.transactionDate);
      const existing = monthlyData.get(key);
      if (existing) {
        if (payment.isSaas) {
          existing.saasCost += payment.amount;
          existing.saasCount += 1;
        } else {
          existing.nonSaasCost += payment.amount;
          existing.nonSaasCount += 1;
        }
      }
    });

    // 결과 변환
    const trends: MonthlyCostTrend[] = [];
    let totalCost = 0;

    monthlyData.forEach((data, key) => {
      const monthTotalCost = data.saasCost + data.nonSaasCost;
      trends.push({
        month: key,
        displayLabel: formatDisplayLabel(key),
        totalCost: monthTotalCost,
        saasCost: data.saasCost,
        nonSaasCost: data.nonSaasCost,
        transactionCount: data.saasCount + data.nonSaasCount,
        saasTransactionCount: data.saasCount,
        nonSaasTransactionCount: data.nonSaasCount,
      });
      totalCost += monthTotalCost;
    });

    // 날짜순 정렬
    trends.sort((a, b) => a.month.localeCompare(b.month));

    const monthsWithData = trends.filter((t) => t.totalCost > 0).length;
    const averageCost =
      monthsWithData > 0 ? Math.round(totalCost / monthsWithData) : 0;

    return {
      success: true,
      data: { trends, averageCost },
    };
  } catch (error) {
    console.error("월별 추세 조회 오류:", error);
    return { success: false, message: "월별 추세 조회 중 오류가 발생했습니다" };
  }
}

/**
 * 미매칭 결제 건수 조회 (CardTransaction + PaymentRecord 통합)
 */
export async function getUnmatchedPaymentCount(): Promise<
  ActionState<UnmatchedPaymentSummary>
> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    // CardTransaction 집계 (앱 매칭 필드 없음 = 전부 미매칭, 승인내역 기준)
    const cardResult = await prisma.cardTransaction.aggregate({
      where: {
        organizationId: session.user.organizationId,
        transactionType: "APPROVAL", // 승인내역 기준 조회
      },
      _count: { id: true },
      _sum: { useAmt: true },
    });

    // PaymentRecord 미매칭 집계
    const csvResult = await prisma.paymentRecord.aggregate({
      where: {
        organizationId: session.user.organizationId,
        matchStatus: { in: ["PENDING", "UNMATCHED"] },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    // 가장 최근 미매칭 결제 조회 (CardTransaction과 PaymentRecord 둘 다)
    const [latestCard, latestCsv] = await Promise.all([
      prisma.cardTransaction.findFirst({
        where: {
          organizationId: session.user.organizationId,
          transactionType: "APPROVAL", // 승인내역 기준 조회
        },
        orderBy: { useDt: "desc" },
        select: { useDt: true },
      }),
      prisma.paymentRecord.findFirst({
        where: {
          organizationId: session.user.organizationId,
          matchStatus: { in: ["PENDING", "UNMATCHED"] },
        },
        orderBy: { transactionDate: "desc" },
        select: { transactionDate: true },
      }),
    ]);

    // 최근 날짜 비교
    let latestDate: Date | null = null;
    if (latestCard?.useDt) {
      const cardDate = new Date(
        parseInt(latestCard.useDt.substring(0, 4)),
        parseInt(latestCard.useDt.substring(4, 6)) - 1,
        parseInt(latestCard.useDt.substring(6, 8))
      );
      latestDate = cardDate;
    }
    if (latestCsv?.transactionDate) {
      if (!latestDate || latestCsv.transactionDate > latestDate) {
        latestDate = latestCsv.transactionDate;
      }
    }

    const cardCount = cardResult._count.id || 0;
    const csvCount = csvResult._count.id || 0;
    const cardAmount = Number(cardResult._sum.useAmt || 0);
    const csvAmount = extractAmount(csvResult._sum.amount);

    return {
      success: true,
      data: {
        count: cardCount + csvCount,
        totalAmount: cardAmount + csvAmount,
        latestDate,
      },
    };
  } catch (error) {
    console.error("미매칭 결제 조회 오류:", error);
    return {
      success: false,
      message: "미매칭 결제 조회 중 오류가 발생했습니다",
    };
  }
}
