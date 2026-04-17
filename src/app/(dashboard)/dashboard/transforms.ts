// src/app/(dashboard)/dashboard/transforms.ts
// Pure transform functions extracted from page.tsx for testability

import type {
  AppCostDistribution,
  CostStatistics,
  MonthlyCostTrend,
} from "@/types/cost-analytics";
import type {
  CostAppData,
  DashboardStats,
  DashboardV3Data,
  LicenseUsageTrend,
  MonthlyBarData,
  OptimizationHeroData,
  RenewalItem,
  UpcomingRenewal,
} from "@/types/dashboard";
import type {
  SeatWasteAnalysis,
  SeatWastePerApp,
} from "@/types/seat-analytics";

// Transform monthly cost trend to chart data
export function transformMonthlyTrend(
  trends: MonthlyCostTrend[]
): MonthlyBarData[] {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return trends.map((trend) => {
    const [year, month] = trend.month.split("-").map(Number);
    const isCurrentMonth = year === currentYear && month === currentMonth + 1;

    return {
      month: trend.month,
      displayLabel: `${month}월`,
      saasCost: trend.saasCost || trend.totalCost,
      nonSaasCost: trend.nonSaasCost || 0,
      isCurrentMonth,
    };
  });
}

// Transform SeatWasteAnalysis to LicenseUsageTrend for the seat chart
export function transformSeatWasteToLicenseTrend(
  seatWaste: SeatWasteAnalysis | null,
  monthlyTrend: MonthlyCostTrend[]
): { trends: LicenseUsageTrend[]; totalUnassignedCost: number } {
  // Aggregate totals across all apps
  let totalSeats = 0;
  let assignedSeats = 0;
  let unassignedSeats = 0;
  let totalUnassignedCost = 0;

  for (const app of seatWaste?.apps ?? []) {
    totalSeats += app.totalSeats;
    assignedSeats += app.assignedSeats;
    unassignedSeats += app.unassignedSeats;
    totalUnassignedCost += app.unassignedSeats * app.perSeatPrice;
  }

  // Use monthlyTrend months as time axis; current snapshot for all months
  const trends = monthlyTrend.map((trend) => ({
    month: trend.month,
    totalSeats,
    assignedSeats,
    unassignedSeats,
  }));

  return { trends, totalUnassignedCost };
}

// Transform top apps to table data
export function transformTopApps(
  apps: AppCostDistribution[],
  seatWasteApps?: SeatWastePerApp[]
): CostAppData[] {
  const seatMap = new Map<string, SeatWastePerApp>();
  for (const sw of seatWasteApps ?? []) {
    seatMap.set(sw.appId, sw);
  }

  return apps.map((app) => {
    const seat = seatMap.get(app.appId);
    const hasSeatData = seat !== undefined;
    const usedLicenses = seat?.assignedSeats ?? 0;
    const totalLicenses = seat?.totalSeats ?? 0;
    const usageEfficiency =
      seat && seat.totalSeats > 0
        ? Math.round((seat.assignedSeats / seat.totalSeats) * 100)
        : 0;
    const grade = getGrade(usageEfficiency);

    return {
      id: app.appId,
      name: app.appName,
      logoUrl: app.appLogoUrl,
      monthlyCost: app.totalCost,
      usedLicenses,
      totalLicenses,
      usageEfficiency,
      grade,
      hasSeatData,
    };
  });
}

// Calculate efficiency grade
export function getGrade(efficiency: number): "A" | "B" | "C" | "D" {
  if (efficiency >= 80) return "A";
  if (efficiency >= 60) return "B";
  if (efficiency >= 40) return "C";
  return "D";
}

// Transform renewals to component data
export function transformRenewals(renewals: UpcomingRenewal[]): RenewalItem[] {
  return renewals.slice(0, 4).map((renewal) => {
    const urgency = getUrgency(renewal.daysUntilRenewal);

    return {
      id: renewal.id,
      appName: renewal.appName,
      logoUrl: renewal.appLogoUrl,
      renewalCost: renewal.amount,
      daysUntilRenewal: renewal.daysUntilRenewal,
      urgency,
    };
  });
}

// Calculate urgency
export function getUrgency(days: number): "urgent" | "moderate" | "safe" {
  if (days <= 7) return "urgent";
  if (days <= 30) return "moderate";
  return "safe";
}

// Transform all data to DashboardV3Data
export function transformToDashboardV3Data(
  stats: DashboardStats,
  costStats: CostStatistics | null,
  topApps: AppCostDistribution[],
  monthlyTrend: MonthlyCostTrend[],
  renewals: UpcomingRenewal[],
  terminatedCount: number,
  anomalyData: { count: number; severity: "low" | "medium" | "high" } | null,
  appsWithoutSubData: { count: number; totalActiveApps: number } | null,
  seatWaste: SeatWasteAnalysis | null,
  unusedAppsData: { count: number; cost: number } | null = null,
  terminatedWithSubCount: number = 0,
  terminatedSubAssignmentCount: number = 0
): DashboardV3Data {
  // Unused licenses: from seat waste analysis (unassigned seats)
  let unusedLicensesCost = 0;
  let unusedLicensesCount = 0;

  for (const app of seatWaste?.apps ?? []) {
    unusedLicensesCost += app.unassignedSeats * app.perSeatPrice;
    unusedLicensesCount += app.unassignedSeats;
  }

  // Unused apps: from dedicated getUnusedApps() server action (all ACTIVE subs, not just seat-based)
  const unusedAppsCost = unusedAppsData?.cost ?? 0;
  const unusedAppsCount = unusedAppsData?.count ?? 0;

  // Duplicate subs: no real detection logic exists yet, UI doesn't display this card
  const duplicateSubsCost = 0;
  const duplicateSubsCount = 0;

  // Hero totals = breakdown sum (single source of truth)
  const monthlySavings =
    unusedLicensesCost + unusedAppsCost + duplicateSubsCost;
  const annualSavings = monthlySavings * 12;

  // Use costDifference from getCostStatistics (same rolling-30d source as costChange %)
  const vsLastMonth = Math.abs(costStats?.costDifference ?? 0);

  // Use actual DB values for terminated users with subscription assignments
  const terminatedUsersWithAccess = terminatedWithSubCount;
  const actualSubAssignmentCount = terminatedSubAssignmentCount;

  const hero: OptimizationHeroData = {
    monthlySavings,
    annualSavings,
    vsLastMonth,
    breakdown: {
      unusedLicenses: {
        amount: unusedLicensesCost,
        count: unusedLicensesCount,
      },
      duplicateSubs: {
        amount: duplicateSubsCost,
        count: duplicateSubsCount,
      },
      unusedApps: {
        amount: unusedAppsCost,
        count: unusedAppsCount,
      },
    },
  };

  return {
    hero,
    kpi: {
      totalCost: {
        amount: costStats?.totalCost ?? stats.totalMonthlyCost,
        changePercent: costStats?.costChange ?? 0,
        note: "전월 대비",
      },
      anomaly: anomalyData || { count: 0, severity: "low" },
      terminated: {
        count: terminatedUsersWithAccess,
        appCount: actualSubAssignmentCount,
      },
      appsWithoutSub: appsWithoutSubData || { count: 0, totalActiveApps: 0 },
    },
    costTrend: transformMonthlyTrend(monthlyTrend),
    topApps: transformTopApps(topApps, seatWaste?.apps),
    renewals: transformRenewals(renewals),
  };
}
