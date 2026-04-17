// src/app/(dashboard)/dashboard/page.tsx
import {
  getCostAnomalies,
  getCostStatistics,
  getMonthlyCostTrend,
  getTopCostApps,
} from "@/actions/cost-analytics";
import {
  getAppsByCategory,
  getAppsWithoutSubscriptions,
  getDashboardStats,
  getPendingOnboardingCount,
  getRecentActivity,
  getSubscriptionAnomalies,
  getTerminatedUsersCount,
  getTerminatedUsersSubAssignmentCount,
  getTerminatedUsersWithSubCount,
  getUpcomingRenewals,
} from "@/actions/dashboard";
import { getSeatWidgetData } from "@/actions/dashboard2-seat";
import { getDepartmentInsights } from "@/actions/department-insights";
import { hasPaymentData } from "@/actions/payments";
import { getSeatWasteAnalysis } from "@/actions/seat-waste-analysis";
import { getSuggestionCount } from "@/actions/subscriptions/subscription-suggestions";
import { getUnusedApps } from "@/actions/unused-apps";
import { NewDashboardClient } from "@/components/dashboard";
import { requireOrganization } from "@/lib/auth/require-auth";

import { transformToDashboardV3Data } from "./transforms";

export default async function DashboardPage() {
  const { role, userId, teamId } = await requireOrganization();
  const isMember = role === "MEMBER";

  // Batch 1: Core data fetching with Promise.all
  const [stats, costStatsRes, topAppsRes, monthlyTrendRes, anomaliesRes] =
    await Promise.all([
      getDashboardStats(),
      getCostStatistics({}),
      getTopCostApps({ limit: 10 }),
      getMonthlyCostTrend({ months: 12 }),
      getCostAnomalies(),
    ]);

  // Batch 2: Additional data + seat analytics + unused apps + department insights
  const [
    renewals,
    terminatedCount,
    appsWithoutSubData,
    categoryData,
    recentActivities,
    seatWasteAnalysisRes,
    unusedAppsRes,
    seatWidgetData,
    departmentInsights,
    hasPaymentDataRes,
    terminatedWithSubCount,
    subscriptionAnomalies,
    terminatedSubAssignmentCount,
    _pendingOnboardingCount,
    suggestionCountRes,
  ] = await Promise.all([
    // MEMBER: 팀 갱신 예정만, ADMIN: 전체
    getUpcomingRenewals(isMember ? { teamId } : {}),
    getTerminatedUsersCount(),
    getAppsWithoutSubscriptions(),
    getAppsByCategory(),
    // MEMBER: 본인 활동만, ADMIN: 전체
    getRecentActivity(isMember ? { userId } : {}),
    getSeatWasteAnalysis(),
    getUnusedApps(),
    getSeatWidgetData(),
    getDepartmentInsights(),
    hasPaymentData(),
    getTerminatedUsersWithSubCount(),
    getSubscriptionAnomalies(),
    getTerminatedUsersSubAssignmentCount(),
    getPendingOnboardingCount(),
    getSuggestionCount(),
  ]);

  // Extract data from ActionState responses
  const costStats = costStatsRes.success
    ? (costStatsRes.data?.statistics ?? null)
    : null;
  const topApps = topAppsRes.success ? topAppsRes.data?.apps || [] : [];
  const monthlyTrend = monthlyTrendRes.success
    ? monthlyTrendRes.data?.trends || []
    : [];
  const anomalyData = anomaliesRes.success ? anomaliesRes.data || null : null;
  const seatWasteData = seatWasteAnalysisRes.success
    ? (seatWasteAnalysisRes.data ?? null)
    : null;
  const unusedAppsData = unusedAppsRes.success
    ? (unusedAppsRes.data ?? null)
    : null;
  const hasPayment = hasPaymentDataRes.success
    ? hasPaymentDataRes.data?.hasData
    : undefined;
  const suggestionCount = suggestionCountRes.success
    ? (suggestionCountRes.data?.count ?? 0)
    : 0;

  // Transform data to DashboardV3Data
  const dashboardData = transformToDashboardV3Data(
    stats,
    costStats,
    topApps,
    monthlyTrend,
    renewals,
    terminatedCount,
    anomalyData,
    appsWithoutSubData,
    seatWasteData,
    unusedAppsData,
    terminatedWithSubCount,
    terminatedSubAssignmentCount
  );

  return (
    <div className="flex flex-1 flex-col">
      <NewDashboardClient
        data={dashboardData}
        categoryData={categoryData}
        recentActivities={recentActivities}
        seatWidgetData={seatWidgetData}
        departmentSpendData={departmentInsights}
        hasPaymentData={hasPayment}
        terminatedWithSubCount={terminatedWithSubCount}
        subscriptionAnomalies={subscriptionAnomalies}
        suggestionCount={suggestionCount}
        isReadOnly={isMember}
      />
    </div>
  );
}
