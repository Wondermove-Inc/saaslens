// src/actions/cost-analytics-forecast.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type {
  CostAnomaly,
  DetectCostAnomaliesResult,
  ForecastResult,
  GetForecastedCostResult,
  SubscriptionForecast,
} from "@/types/cost-analytics";
import type { AnomalyKpiData } from "@/types/dashboard";
import {
  applyPaymentRecordScope,
  resolveReportScope,
} from "./cost-analytics-scope";
import {
  calculateMonthlyCost,
  extractAmount,
  formatDisplayLabel,
  formatMonthKey,
  getSeverity,
} from "./cost-analytics-utils";

/**
 * 비용 이상 감지
 * 전월 대비 50% 이상 급증한 앱을 감지
 */
export async function detectCostAnomalies(
  options: {
    teamId?: string;
    userId?: string;
  } = {}
): Promise<ActionState<DetectCostAnomaliesResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    // 현재 월과 이전 월 날짜 계산
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const scope = resolveReportScope(options, session.user);

    const currentWhere: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      matchStatus: { in: ["MANUAL", "AUTO_MATCHED"] },
      matchedAppId: { not: null },
      transactionDate: { gte: currentMonthStart },
    };
    applyPaymentRecordScope(currentWhere, scope);

    // 현재 월 앱별 비용
    const currentMonthData = await prisma.paymentRecord.groupBy({
      by: ["matchedAppId"],
      where: currentWhere,
      _sum: { amount: true },
    });

    // 이전 월 앱별 비용
    const previousWhere: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      matchStatus: { in: ["MANUAL", "AUTO_MATCHED"] },
      matchedAppId: { not: null },
      transactionDate: { gte: previousMonthStart, lte: previousMonthEnd },
    };
    applyPaymentRecordScope(previousWhere, scope);

    const previousMonthData = await prisma.paymentRecord.groupBy({
      by: ["matchedAppId"],
      where: previousWhere,
      _sum: { amount: true },
    });

    // 이전 월 데이터를 Map으로 변환
    const previousCostMap = new Map<string, number>();
    previousMonthData.forEach((item) => {
      if (item.matchedAppId) {
        previousCostMap.set(item.matchedAppId, extractAmount(item._sum.amount));
      }
    });

    // 앱 정보 조회
    const appIds = currentMonthData
      .map((g) => g.matchedAppId)
      .filter((id): id is string => id !== null);

    const apps = await prisma.app.findMany({
      where: { id: { in: appIds } },
      select: { id: true, name: true },
    });

    const appMap = new Map(apps.map((app) => [app.id, app.name]));

    // 이상 감지
    const anomalies: CostAnomaly[] = [];

    currentMonthData.forEach((item) => {
      if (!item.matchedAppId) return;

      const currentCost = extractAmount(item._sum.amount);
      const previousCost = previousCostMap.get(item.matchedAppId) || 0;

      // 이전 월 비용이 있고, 50% 이상 증가한 경우
      if (previousCost > 0) {
        const changeRate = ((currentCost - previousCost) / previousCost) * 100;

        if (changeRate >= 50) {
          const severity = getSeverity(changeRate);
          anomalies.push({
            appId: item.matchedAppId,
            appName: appMap.get(item.matchedAppId) || "알 수 없음",
            currentCost,
            previousCost,
            changeRate: Math.round(changeRate),
            severity,
            message: `전월 대비 ${Math.round(changeRate)}% 증가`,
          });
        }
      }
    });

    // 심각도순 정렬
    anomalies.sort((a, b) => b.changeRate - a.changeRate);

    return {
      success: true,
      data: {
        anomalies,
        hasAnomalies: anomalies.length > 0,
      },
    };
  } catch (error) {
    console.error("이상 비용 감지 오류:", error);
    return { success: false, message: "이상 비용 감지 중 오류가 발생했습니다" };
  }
}

/**
 * 비용 예측 조회
 * 구독 정보 기반으로 다음 달 예상 비용을 계산
 */
export async function getForecastedCost(options: {
  targetMonth?: string; // YYYY-MM 형식
}): Promise<ActionState<GetForecastedCostResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    // 대상 월 결정 (기본값: 다음 달)
    const now = new Date();
    let targetMonth = options.targetMonth;
    if (!targetMonth) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      targetMonth = formatMonthKey(nextMonth);
    }

    // 대상 월의 시작/종료일 계산
    const [year, month] = targetMonth.split("-").map(Number);
    const targetMonthStart = new Date(year, month - 1, 1);
    const targetMonthEnd = new Date(year, month, 0);

    // 활성 구독 조회
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId: session.user.organizationId,
        status: "ACTIVE",
      },
      include: {
        app: { select: { name: true } },
      },
    });

    // 구독별 예측 비용 계산
    const subscriptionBreakdown: SubscriptionForecast[] = [];
    let forecastedCost = 0;

    subscriptions.forEach((sub) => {
      let monthlyCost: number;

      // PER_SEAT 구독은 usedLicenses * perSeatPrice로 더 정확한 예측
      if (
        sub.billingType === "PER_SEAT" &&
        sub.perSeatPrice !== null &&
        sub.usedLicenses !== null &&
        sub.usedLicenses > 0
      ) {
        const price =
          sub.perSeatPrice &&
          typeof sub.perSeatPrice === "object" &&
          "toNumber" in sub.perSeatPrice
            ? (sub.perSeatPrice as { toNumber: () => number }).toNumber()
            : Number(sub.perSeatPrice ?? 0);
        monthlyCost = sub.usedLicenses * price;
      } else {
        monthlyCost = calculateMonthlyCost(sub);
      }

      forecastedCost += monthlyCost;

      subscriptionBreakdown.push({
        subscriptionId: sub.id,
        appName: sub.app.name,
        expectedCost: monthlyCost,
        billingCycle: sub.billingCycle as "MONTHLY" | "YEARLY" | "QUARTERLY",
        nextRenewalDate: sub.renewalDate,
      });
    });

    // 해당 월 실제 결제 내역 (있는 경우)
    const actualPayments = await prisma.paymentRecord.aggregate({
      where: {
        organizationId: session.user.organizationId,
        matchStatus: { in: ["MANUAL", "AUTO_MATCHED"] },
        transactionDate: { gte: targetMonthStart, lte: targetMonthEnd },
      },
      _sum: { amount: true },
    });

    const actualCost = extractAmount(actualPayments._sum.amount);
    const variance = actualCost > 0 ? actualCost - forecastedCost : undefined;
    const variancePercentage =
      actualCost > 0 && forecastedCost > 0
        ? Math.round(((actualCost - forecastedCost) / forecastedCost) * 100)
        : undefined;

    const forecast: ForecastResult = {
      targetMonth,
      displayLabel: formatDisplayLabel(targetMonth),
      forecastedCost,
      actualCost: actualCost > 0 ? actualCost : undefined,
      variance,
      variancePercentage,
      subscriptionBreakdown,
    };

    return {
      success: true,
      data: { forecast },
    };
  } catch (error) {
    console.error("비용 예측 조회 오류:", error);
    return { success: false, message: "비용 예측 조회 중 오류가 발생했습니다" };
  }
}

/**
 * 비용 이상 감지 요약 (Dashboard V3 KPI Card용)
 * detectCostAnomalies()를 래핑하여 간소화된 결과 반환
 */
export async function getCostAnomalies(): Promise<ActionState<AnomalyKpiData>> {
  try {
    const result = await detectCostAnomalies();

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || "비용 이상 감지에 실패했습니다",
      };
    }

    const { anomalies } = result.data;
    const count = anomalies.length;

    // Severity 계산: high (5건 이상), medium (3~4건), low (1~2건)
    let severity: "low" | "medium" | "high";
    if (count >= 5) {
      severity = "high";
    } else if (count >= 3) {
      severity = "medium";
    } else {
      severity = "low";
    }

    return {
      success: true,
      data: { count, severity },
    };
  } catch (error) {
    console.error("비용 이상 감지 요약 오류:", error);
    return {
      success: false,
      message: "비용 이상 감지 요약 중 오류가 발생했습니다",
    };
  }
}
