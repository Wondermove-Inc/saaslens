import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getCostStatistics,
  getMonthlyCostTrend,
  getTopCostApps,
} from "@/actions/cost-analytics";
import {
  getAppsByCategory,
  getDashboardStats,
  getRecentActivity,
  getUpcomingRenewals,
} from "@/actions/dashboard";
import { getDepartmentInsights } from "@/actions/department-insights";
import { getDiscoveryInsights } from "@/actions/discovery-insights";
import { getPendingConfirmations } from "@/actions/pending-confirmations";
import { getSecurityInsights } from "@/actions/security-insights";
import { requireOrganization } from "@/lib/auth/require-auth";
import { getUnifiedUnmatchedCount } from "@/lib/services/payment/unified-payment";

/**
 * 기간 프리셋에 따른 날짜 범위 계산
 */
function getDateRangeFromPreset(preset: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  switch (preset) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "1y":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
}

/**
 * 기간 프리셋에 따른 월 수 계산
 */
function getMonthsFromPreset(preset: string): number {
  switch (preset) {
    case "7d":
      return 1;
    case "30d":
      return 2;
    case "1y":
      return 12;
    default:
      return 6;
  }
}

/**
 * GET /api/v1/dashboard/summary
 * - 대시보드 요약 데이터를 반환
 * - 기존 페이지 로직과 동일한 데이터 소스를 사용
 * - Query params: preset (7d, 30d, 1y), startDate, endDate (custom)
 */
import { withLogging } from "@/lib/logging";

// ... existing imports ...

export const GET = withLogging(
  "GET /api/v1/dashboard/summary",
  async (request: NextRequest) => {
    const { organizationId } = await requireOrganization();

    // 기간 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const preset = searchParams.get("preset") || "30d";
    const customStartDate = searchParams.get("startDate");
    const customEndDate = searchParams.get("endDate");

    // 날짜 범위 계산
    let startDate: Date;
    let endDate: Date;

    if (preset === "custom" && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = getDateRangeFromPreset(preset);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const months =
      preset === "custom"
        ? Math.max(
            1,
            Math.ceil(
              (endDate.getTime() - startDate.getTime()) /
                (30 * 24 * 60 * 60 * 1000)
            )
          )
        : getMonthsFromPreset(preset);

    const [
      stats,
      costStatsRes,
      topAppsRes,
      monthlyTrendRes,
      unmatched,
      categoryDist,
      renewals,
      discovery,
      activity,
      security,
      departments,
      pendingConfirmationsRes,
    ] = await Promise.all([
      getDashboardStats(),
      getCostStatistics({ startDate, endDate }),
      getTopCostApps({ limit: 5, startDate, endDate }),
      getMonthlyCostTrend({ months }),
      getUnifiedUnmatchedCount(organizationId),
      getAppsByCategory(),
      getUpcomingRenewals(),
      getDiscoveryInsights(),
      getRecentActivity(),
      getSecurityInsights(),
      getDepartmentInsights(),
      getPendingConfirmations(3), // 대시보드에는 최대 3개만 표시
    ]);

    const costStats = costStatsRes.success
      ? (costStatsRes.data?.statistics ?? null)
      : null;
    const topApps = topAppsRes.success ? topAppsRes.data?.apps || [] : [];
    const monthlyTrend = monthlyTrendRes.success
      ? monthlyTrendRes.data?.trends || []
      : [];
    const averageCost = monthlyTrendRes.success
      ? monthlyTrendRes.data?.averageCost || 0
      : 0;
    const unmatchedSummary = {
      count: unmatched.total,
      totalAmount: 0,
      latestDate: null,
    };

    const pendingConfirmations = pendingConfirmationsRes.success
      ? pendingConfirmationsRes.data
      : { items: [], total: 0 };

    return NextResponse.json({
      stats,
      costStats,
      topApps,
      monthlyTrend,
      averageCost,
      unmatchedSummary,
      discovery,
      categoryDist,
      renewals,
      security,
      departments,
      activity,
      pendingConfirmations,
    });
  }
);

export const POST = withLogging(
  "POST /api/v1/dashboard/summary",
  async (request: NextRequest) => {
    let body;
    try {
      body = await request.json();
    } catch {
      body = { error: "Invalid JSON" };
    }

    return NextResponse.json({
      success: true,
      message: "POST Echo Verification",
      received: body,
    });
  }
);
