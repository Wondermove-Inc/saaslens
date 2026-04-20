"use client";

import type { DepartmentInsights } from "@/actions/department-insights";
import { ResponsiveBentoGrid, ResponsiveBentoItem } from "@/components/common";
import type {
  CategoryDistribution,
  DashboardV3Data,
  RecentActivityItem,
  SeatWidgetData,
  SubscriptionAnomalyItem,
} from "@/types/dashboard";
import { useState } from "react";

import { AppsByCategory } from "./apps-by-category";
import { BentoKpiCards } from "./bento-kpi-cards";
import { BentoOptimizationHero } from "./bento-optimization-hero";
import { CostAppsTable } from "./cost-apps-table";
import { CostBarChart } from "./cost-bar-chart";
import {
  DashboardAlertBanner,
  type DashboardAlertItem,
} from "./dashboard-alert-banner";
import { DepartmentSpendChart } from "./department-spend-chart";
import { PerUserLicenseAppsChart } from "./per-user-license-apps-chart";
import { RecentActivity } from "./recent-activity";
import { SeatUtilizationChart } from "./seat-utilization-chart";
import { UpcomingRenewals } from "./upcoming-renewals";

interface NewDashboardClientProps {
  data: DashboardV3Data;
  categoryData: CategoryDistribution[];
  recentActivities: RecentActivityItem[];
  seatWidgetData: SeatWidgetData;
  departmentSpendData: DepartmentInsights;
  hasPaymentData?: boolean;
  terminatedWithSubCount?: number;
  subscriptionAnomalies?: SubscriptionAnomalyItem[];
  suggestionCount?: number;
  isReadOnly?: boolean;
}

/**
 * NewDashboardClient
 * Bento Grid 스타일 대시보드 클라이언트 컴포넌트
 * 5-Row Layout with Bento Grid:
 * Row 1: BentoOptimizationHero (12 cols)
 * Row 2: 4 KPI Cards (3-3-3-3 cols)
 * Row 3: BentoCostBarChart + BentoCostAppsTable (6-6 cols)
 * Row 4: BentoSeatUtilization + BentoPerUserLicense + BentoUpcomingRenewals (4-4-4 cols)
 * Row 5: BentoAppsByCategory + BentoDepartmentSpend + BentoRecentActivity (4-4-4 cols)
 */
export function NewDashboardClient({
  data,
  categoryData,
  recentActivities,
  seatWidgetData,
  departmentSpendData,
  hasPaymentData: hasPayment,
  terminatedWithSubCount,
  subscriptionAnomalies = [],
  suggestionCount = 0,
  isReadOnly = false,
}: NewDashboardClientProps) {
  const [period, setPeriod] = useState<string>("6");

  const alerts: DashboardAlertItem[] = [];
  if (hasPayment === false) {
    alerts.push({
      id: "no-payment-data",
      severity: "info",
      titleKey: "noPaymentData.title",
      messageKey: "noPaymentData.message",
      href: "/payments?tab=import",
    });
  }
  if (terminatedWithSubCount && terminatedWithSubCount > 0) {
    alerts.push({
      id: "terminated-with-subscriptions",
      severity: "warning",
      titleKey: "terminatedWithSub.title",
      messageKey: "terminatedWithSub.message",
      href: "/users/offboarded",
    });
  }
  if (suggestionCount > 0) {
    alerts.push({
      id: "pending-subscriptions",
      severity: "warning",
      titleKey: "pendingSubscriptions.title",
      messageKey: "pendingSubscriptions.message",
      messageParams: { count: suggestionCount },
      href: "/subscriptions",
    });
  }
  for (const anomaly of subscriptionAnomalies) {
    if (anomaly.billingType === "FLAT_RATE") {
      alerts.push({
        id: `sub-anomaly-${anomaly.subscriptionId}`,
        severity: "warning",
        titleKey: "subAnomalyFlatRate.title",
        messageKey: "subAnomalyFlatRate.message",
        titleParams: { appName: anomaly.appName },
        href: `/subscriptions/${anomaly.subscriptionId}/edit`,
      });
    } else {
      alerts.push({
        id: `sub-anomaly-${anomaly.subscriptionId}`,
        severity: "info",
        titleKey: "subAnomalyPerSeat.title",
        messageKey: "subAnomalyPerSeat.message",
        titleParams: { appName: anomaly.appName },
        messageParams: {
          usedLicenses: anomaly.usedLicenses ?? 0,
          totalLicenses: anomaly.totalLicenses ?? 0,
        },
        href: `/subscriptions/${anomaly.subscriptionId}/edit`,
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Alert Banner - MEMBER(isReadOnly)에게는 숨김 */}
      {!isReadOnly && alerts.length > 0 && (
        <DashboardAlertBanner alerts={alerts} />
      )}

      {/* Row 1: BentoOptimizationHero (12 cols) */}
      <BentoOptimizationHero data={data.hero} isReadOnly={isReadOnly} />

      {/* Row 2: 4 KPI Cards (3-3-3-3 cols) */}
      <BentoKpiCards
        totalCost={data.kpi.totalCost}
        anomaly={data.kpi.anomaly}
        terminated={data.kpi.terminated}
        appsWithoutSub={data.kpi.appsWithoutSub}
        isReadOnly={isReadOnly}
      />

      {/* Row 3: CostBarChart (6 cols) + CostAppsTable (6 cols) */}
      <ResponsiveBentoGrid gap="md">
        <ResponsiveBentoItem cols={1} colsSm={6} colsMd={4} colsLg={6}>
          <CostBarChart
            data={data.costTrend}
            period={period}
            onPeriodChange={setPeriod}
          />
        </ResponsiveBentoItem>
        <ResponsiveBentoItem cols={1} colsSm={6} colsMd={4} colsLg={6}>
          <CostAppsTable
            initialData={data.topApps}
            period={period}
            onPeriodChange={setPeriod}
          />
        </ResponsiveBentoItem>
      </ResponsiveBentoGrid>

      {/* Row 4: 3 components (4+4+4 cols) */}
      <ResponsiveBentoGrid gap="md">
        <ResponsiveBentoItem cols={1} colsSm={6} colsMd={8} colsLg={4}>
          <SeatUtilizationChart data={seatWidgetData.lowUtilizationApps} />
        </ResponsiveBentoItem>
        <ResponsiveBentoItem cols={1} colsSm={6} colsMd={8} colsLg={4}>
          <PerUserLicenseAppsChart data={seatWidgetData.topLicenseApps} />
        </ResponsiveBentoItem>
        <ResponsiveBentoItem cols={1} colsSm={6} colsMd={8} colsLg={4}>
          <UpcomingRenewals data={data.renewals} />
        </ResponsiveBentoItem>
      </ResponsiveBentoGrid>

      {/* Row 5: 3 components (4+4+4 cols) */}
      <ResponsiveBentoGrid gap="md">
        <ResponsiveBentoItem cols={1} colsSm={6} colsMd={8} colsLg={4}>
          <AppsByCategory data={categoryData} />
        </ResponsiveBentoItem>
        <ResponsiveBentoItem cols={1} colsSm={6} colsMd={8} colsLg={4}>
          <DepartmentSpendChart data={departmentSpendData} />
        </ResponsiveBentoItem>
        <ResponsiveBentoItem cols={1} colsSm={6} colsMd={8} colsLg={4}>
          <RecentActivity activities={recentActivities} />
        </ResponsiveBentoItem>
      </ResponsiveBentoGrid>
    </div>
  );
}
