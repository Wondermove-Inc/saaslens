/**
 * New Dashboard Components - Barrel Export
 * 모든 대시보드 컴포넌트가 이 디렉토리에 통합됨 (Phase 3 리팩토링)
 */

// 메인 클라이언트
export { NewDashboardClient } from "./new-dashboard-client";

// 자체 구현 컴포넌트
export { AnomalyCard } from "./anomaly-card";
export { AppsWithoutSubCard } from "./apps-without-sub-card";
export {
  BentoAnomalyCard,
  BentoAppsWithoutSubCard,
  BentoKpiCards,
  BentoTerminatedCard,
  BentoTotalCostCard,
} from "./bento-kpi-cards";
export { BentoOptimizationHero } from "./bento-optimization-hero";
export { TerminatedCard } from "./terminated-card";
export { TotalCostCard } from "./total-cost-card";

// 통합된 컴포넌트 (이전: dashboard/, dashboard2/, v2-cost/, v2-seat/, v3/)
export { AppsByCategory } from "./apps-by-category";
export { CostAppsTable } from "./cost-apps-table";
export { CostBarChart } from "./cost-bar-chart";
export {
  DashboardAlertBanner,
  type DashboardAlertItem,
} from "./dashboard-alert-banner";
export { DepartmentSpendChart } from "./department-spend-chart";
export { PerUserLicenseAppsChart } from "./per-user-license-apps-chart";
export { RecentActivity } from "./recent-activity";
export { SeatUtilizationChart } from "./seat-utilization-chart";
export { UpcomingRenewals } from "./upcoming-renewals";
