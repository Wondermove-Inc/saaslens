// src/types/seat-analytics.ts

// ==================== D-2: Seat 낭비 분석 ====================

export interface SeatWastePerApp {
  appId: string;
  appName: string;
  appLogoUrl: string | null;
  totalSeats: number;
  assignedSeats: number;
  activeSeats: number; // 30일 이내 사용
  unassignedSeats: number;
  inactiveSeats: number; // 할당됐지만 30일+ 미사용
  wastedSeats: number; // unassigned + inactive
  perSeatPrice: number;
  monthlyWaste: number; // wastedSeats * perSeatPrice
  annualWaste: number;
  utilizationRate: number; // (activeSeats / totalSeats) * 100
}

export interface SeatWasteSummary {
  totalMonthlyWaste: number;
  totalAnnualWaste: number;
  overallUtilizationRate: number;
  appCount: number;
  totalWastedSeats: number;
}

export interface SeatWasteAnalysis {
  summary: SeatWasteSummary;
  apps: SeatWastePerApp[];
}

// ==================== D-3: 유저별/팀별 비용 ====================

export interface UserCostSubscription {
  subscriptionId: string;
  appName: string;
  appLogoUrl: string | null;
  perSeatPrice: number;
  isActive: boolean; // 30일 이내 사용
}

export interface UserCostItem {
  userId: string;
  userName: string | null;
  userEmail: string;
  teamId: string | null;
  teamName: string | null;
  totalMonthlyCost: number;
  assignedAppCount: number;
  activeAppCount: number;
  subscriptions: UserCostSubscription[];
}

export interface TeamCostComparison {
  teamId: string;
  teamName: string;
  memberCount: number;
  totalMonthlyCost: number;
  costPerMember: number;
  activeRate: number; // 활성 비율 (%)
}

export interface UserCostBreakdown {
  users: UserCostItem[];
  totalMonthlyCost: number;
}

export interface TeamCostComparisonResult {
  teams: TeamCostComparison[];
}

// ==================== D-4: Seat 최적화 제안 ====================

export interface SeatOptimizationItem {
  subscriptionId: string;
  appId: string;
  appName: string;
  appLogoUrl: string | null;
  currentSeats: number;
  activeUsers: number;
  recommendedSeats: number; // Math.ceil(activeUsers * 1.15)
  excessSeats: number; // currentSeats - recommendedSeats
  perSeatPrice: number;
  monthlySavings: number;
  annualSavings: number;
}

export interface SeatOptimizationSummary {
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  optimizableAppCount: number;
  items: SeatOptimizationItem[];
}

export interface SimulationResult {
  subscriptionId: string;
  appName: string;
  currentSeats: number;
  targetSeats: number;
  currentMonthlyCost: number;
  targetMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  affectedUsers: {
    id: string;
    name: string | null;
    email: string;
    lastUsedAt: Date | null;
  }[];
}

export interface SavingsOpportunitySummary {
  totalAnnualSavings: number;
  topApps: {
    appName: string;
    annualSavings: number;
  }[];
}
