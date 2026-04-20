// src/types/dashboard.ts
// 대시보드 관련 통합 타입 정의 (Phase 4: dashboard-v3.ts + dashboard2 Seat 타입 병합)

// ─── 기본 대시보드 타입 ───

/**
 * 대시보드 통계 데이터
 */
export interface DashboardStats {
  totalApps: number;
  activeSubscriptions: number;
  totalUsers: number;
  totalMonthlyCost: number;
  currency: string;
}

/**
 * 다가오는 갱신 구독 정보
 */
export interface UpcomingRenewal {
  id: string;
  appName: string;
  appLogoUrl?: string;
  renewalDate: Date;
  amount: number;
  currency: string;
  daysUntilRenewal: number;
  teamId?: string | null;
  teamName?: string | null;
  assignedUsers?: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
}

/**
 * 카테고리별 앱 분포
 */
export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

/**
 * 최근 활동 항목
 */
export interface RecentActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userName?: string;
  userEmail?: string;
  createdAt: Date;
  description: string;
}

/**
 * 리포트용 갱신 목록 조회 데이터
 */
export interface RenewalReportData {
  within7Days: UpcomingRenewal[];
  within30Days: UpcomingRenewal[];
  within90Days: UpcomingRenewal[];
  totalRenewalCost: number;
  totalCount: number;
}

// ─── V3 대시보드 레이아웃 타입 (구 dashboard-v3.ts) ───

/**
 * OptimizationHero 컴포넌트 데이터
 */
export interface OptimizationHeroData {
  monthlySavings: number;
  annualSavings: number;
  vsLastMonth: number;
  breakdown: {
    unusedLicenses: { amount: number; count: number };
    duplicateSubs: { amount: number; count: number };
    unusedApps: { amount: number; count: number };
  };
}

/**
 * UpcomingRenewals 컴포넌트 아이템 타입
 */
export interface RenewalItem {
  id: string;
  appName: string;
  logoUrl?: string;
  renewalCost: number;
  daysUntilRenewal: number;
  urgency: "urgent" | "moderate" | "safe";
}

/**
 * Total Cost KPI Card Props
 */
export interface TotalCostKpiData {
  amount: number;
  changePercent: number;
  note?: string;
}

/**
 * Anomaly Detection KPI Card Props
 */
export interface AnomalyKpiData {
  count: number;
  severity: "low" | "medium" | "high";
}

/**
 * Terminated Users KPI Card Props
 */
export interface TerminatedKpiData {
  count: number;
  appCount: number;
}

/**
 * Apps Without Subscription KPI Card Props
 */
export interface AppsWithoutSubKpiData {
  count: number;
  totalActiveApps: number;
}

/**
 * MonthlyBarData for CostBarChart component
 */
export interface MonthlyBarData {
  month: string;
  displayLabel: string;
  saasCost: number;
  nonSaasCost: number;
  isCurrentMonth?: boolean;
}

/**
 * CostAppData for CostAppsTable component
 */
export interface CostAppData {
  id: string;
  name: string;
  logoUrl?: string;
  monthlyCost: number;
  usedLicenses: number;
  totalLicenses: number;
  usageEfficiency: number;
  grade: "A" | "B" | "C" | "D";
  hasSeatData: boolean;
}

/**
 * Subscription Anomaly Item
 */
export interface SubscriptionAnomalyItem {
  subscriptionId: string;
  appName: string;
  billingType: "FLAT_RATE" | "PER_SEAT";
  totalLicenses?: number;
  usedLicenses?: number;
  savableAmount?: number;
}

/**
 * Dashboard V3 Client Component Props
 */
export interface DashboardV3Data {
  hero: OptimizationHeroData;
  kpi: {
    totalCost: TotalCostKpiData;
    anomaly: AnomalyKpiData;
    terminated: TerminatedKpiData;
    appsWithoutSub: AppsWithoutSubKpiData;
  };
  costTrend: MonthlyBarData[];
  topApps: CostAppData[];
  renewals: RenewalItem[];
}

// ─── Seat/License 타입 (구 dashboard2.ts에서 이동) ───

/**
 * 월별 Seat 배정 추이
 */
export interface LicenseUsageTrend {
  month: string;
  totalSeats: number;
  assignedSeats: number;
  unassignedSeats: number;
}

/**
 * Seat 활용률 하위 앱
 */
export interface LowUtilizationApp {
  appId: string;
  appName: string;
  totalSeats: number;
  assignedSeats: number;
  utilizationRate: number;
}

/**
 * 개별 라이선스 앱 (Top)
 */
export interface TopLicenseApp {
  appId: string;
  appName: string;
  appLogo?: string;
  userCount: number;
  usageCount?: number;
}

/**
 * Seat 위젯 데이터
 */
export interface SeatWidgetData {
  lowUtilizationApps: LowUtilizationApp[];
  topLicenseApps: TopLicenseApp[];
}
