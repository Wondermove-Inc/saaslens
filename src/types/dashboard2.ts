// src/types/dashboard2.ts

import { AppSource, AppStatus } from "@prisma/client";
import type {
  LicenseUsageTrend,
  LowUtilizationApp,
  SeatWidgetData,
  TopLicenseApp,
} from "./dashboard";

// Seat/License 타입은 @/types/dashboard 에서 re-export
export type {
  LicenseUsageTrend,
  LowUtilizationApp,
  SeatWidgetData,
  TopLicenseApp,
};

/**
 * Shadow IT 목록 항목
 */
export interface ShadowITItem {
  id: string;
  appId: string;
  appName: string;
  appLogo?: string | null;
  source: AppSource;
  status: AppStatus;
  estimatedCost?: number | null;
  discoveredAt: Date;
  userCount?: number;
  isAI?: boolean; // Shadow AI 여부
  category?: string | null;
}

/**
 * 앱 상태 분포 (Donut Chart용)
 */
export interface AppStatusDistribution {
  active: number;
  inactive: number;
  blocked: number;
  total: number;
}

/**
 * 보안 리스크 게이지 데이터
 */
export interface SecurityRiskGauge {
  riskScore: number; // 0-100
  forRisk: number; // For Review count
  highRisk: number; // High Risk count
  unapproved: number; // Unapproved count
}

/**
 * 보안 알림 항목
 */
export interface SecurityAlertItem {
  type: "shadow_ai" | "high_risk" | "unapproved";
  icon: "warning" | "alert" | "info";
  message: string;
  appName?: string;
  score?: number;
}

/**
 * 카테고리별 지출 (Stacked Bar + Progress List용)
 */
export interface SpendByCategory {
  category: string;
  amount: number;
  percentage: number;
  subscriptionCount?: number; // 해당 카테고리의 구독 건수
  changeRate?: number; // 전월 대비 증감률 (%)
}

/**
 * 긴급 갱신 요약
 */
export interface UrgentRenewalSummary {
  thirtyDayCount: number;
  thirtyDayAmount: number;
  fifteenDayCount: number;
  fifteenDayAmount: number;
  sevenDayCount: number;
  sevenDayAmount: number;
  criticalApp?: {
    name: string;
    renewalDate: Date;
  } | null;
}

/**
 * Onboarding/Offboarding 사용자
 */
export interface OnboardingOffboardingUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  department: string;
  startDate?: Date;
  endDate?: Date;
  status: "pending" | "in_progress" | "completed";
  progress: number;
}

/**
 * Onboarding/Offboarding 요약
 */
export interface OnboardingOffboardingSummary {
  onboarding: {
    count: number;
    users: OnboardingOffboardingUser[];
  };
  offboarding: {
    count: number;
    users: OnboardingOffboardingUser[];
  };
}

/**
 * Top Spending App (테이블용)
 */
export interface TopSpendingApp {
  id: string;
  name: string;
  logo?: string | null;
  userCount: number;
  monthlyCost: number;
  totalLicenses?: number;
  unusedRate?: number; // 미사용률 (%)
}

/**
 * 플랫폼 상세 정보
 */
export interface PlatformDetail {
  platform: "MACOS" | "WINDOWS" | "LINUX" | "OTHER";
  osVersion?: string | null; // 예: "14.0", "10.0.19045", "Ubuntu 22.04"
  deviceCount: number; // 해당 플랫폼의 디바이스 수
}

/**
 * Device Detected App (FleetDM에서 수집된 앱)
 */
export interface DeviceDetectedApp {
  id: string;
  name: string;
  version?: string | null;
  deviceCount: number; // 설치된 디바이스 수
  approvalStatus: "UNKNOWN" | "APPROVED" | "SHADOW_IT" | "BLOCKED";
  platforms: string[]; // 설치된 OS 플랫폼 목록 (MACOS, WINDOWS, LINUX, OTHER) - 하위 호환성
  platformDetails: PlatformDetail[]; // 플랫폼별 상세 정보 (OS 버전 포함)
  matchedApp?: {
    id: string;
    name: string;
  } | null;
  isOsDefault: boolean; // OS 기본 앱 여부
}

/**
 * Device Detected Apps 통계 (OS 기본 앱 분리)
 */
export interface DeviceDetectedAppsStats {
  total: number;
  osDefault: {
    count: number;
    totalDevices: number;
  };
  userInstalled: {
    count: number;
    totalDevices: number;
  };
  byApprovalStatus: {
    approved: number;
    shadowIt: number;
    blocked: number;
    unknown: number;
  };
}

/**
 * OS Default App 레코드 (DB 타입)
 */
export interface OsDefaultAppRecord {
  id: string;
  name: string;
  bundleId: string | null;
  namePattern: string | null;
  platform: "MACOS" | "WINDOWS" | "LINUX" | "IOS" | "ANDROID" | "OTHER";
  category: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OS Default App 생성 입력
 */
export interface CreateOsDefaultAppInput {
  name: string;
  bundleId?: string;
  namePattern?: string;
  platform: "MACOS" | "WINDOWS" | "LINUX";
  category?: string;
  description?: string;
}

/**
 * 퇴사자 미회수 계정 요약
 */
export interface UnrecoveredAccountsSummary {
  totalCount: number;
  users: {
    id: string;
    name: string;
    email: string;
    terminatedAt: Date;
    unrecoveredApps: number;
  }[];
}

/**
 * Dashboard2 전체 Summary 데이터
 */
export interface Dashboard2Summary {
  // Row 1: KPI Cards
  onboardingOffboarding: OnboardingOffboardingSummary;
  totalMonthlySpend: {
    amount: number;
    changeRate: number;
    budgetRatio?: number; // 예산 대비 비율 (%)
  };
  securityRisks: {
    unapproved: number;
    shadowAI: number;
  };
  totalActiveUsers: {
    count: number;
    licenseUtilization: number;
  };
  urgentRenewals: UrgentRenewalSummary;
  unrecoveredAccounts: UnrecoveredAccountsSummary;

  // Row 2: Charts
  monthlySpendTrend: {
    month: string;
    saasCost: number;
    nonSaasCost: number;
    isCurrentMonth: boolean; // 현재 월(진행 중) 여부
  }[];
  licenseUsageTrend: LicenseUsageTrend[];

  // Row 3: Analysis Cards
  spendByCategory: SpendByCategory[];
  appStatusDistribution: AppStatusDistribution;
  securityRiskOverview: {
    gauge: SecurityRiskGauge;
    alerts: SecurityAlertItem[];
  };

  // Row 4: Tables
  recentShadowIT: ShadowITItem[];
  topSpendingApps: TopSpendingApp[];
  deviceDetectedApps: DeviceDetectedApp[];
}
