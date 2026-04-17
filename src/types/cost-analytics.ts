/**
 * 비용 분석 관련 타입 정의
 * Phase 10: 비용 분석 대시보드
 */

/**
 * 비용 통계 요약
 */
export interface CostStatistics {
  /** 총 비용 (원화) */
  totalCost: number;
  /** 월 평균 비용 */
  monthlyAverage: number;
  /** 전월 대비 증감률 (%) - 양수: 증가, 음수: 감소 */
  costChange: number;
  /** 전월 대비 절대 금액 차이 (원화) - 양수: 증가, 음수: 감소 */
  costDifference: number;
  /** 거래 건수 */
  transactionCount: number;
  /** 통화 코드 */
  currency: string;
  /** 분석 기간 시작일 */
  periodStart: Date;
  /** 분석 기간 종료일 */
  periodEnd: Date;
  /** 전체 비용 (SaaS + Non-SaaS 포함) */
  totalCostAll: number;
}

/**
 * 앱별 비용 분포
 */
export interface AppCostDistribution {
  /** 앱 ID */
  appId: string;
  /** 앱 이름 */
  appName: string;
  /** 앱 로고 URL (선택) */
  appLogoUrl?: string;
  /** 총 비용 */
  totalCost: number;
  /** 전체 비용 대비 비율 (%) */
  percentage: number;
  /** 거래 건수 */
  transactionCount: number;
}

/**
 * 월별 비용 추이
 */
export interface MonthlyCostTrend {
  /** 월 식별자 (YYYY-MM 형식) */
  month: string;
  /** 표시용 라벨 (예: "2024년 1월") */
  displayLabel: string;
  /** 해당 월 총 비용 (호환성 유지) */
  totalCost: number;
  /** SaaS 비용 (앱과 매칭된 결제) */
  saasCost: number;
  /** Non-SaaS 비용 (미매칭 결제) */
  nonSaasCost: number;
  /** 해당 월 총 거래 건수 */
  transactionCount: number;
  /** SaaS 거래 건수 */
  saasTransactionCount: number;
  /** Non-SaaS 거래 건수 */
  nonSaasTransactionCount: number;
}

/**
 * 비용 분석 필터
 */
export interface CostAnalyticsFilters {
  /** 시작일 */
  startDate?: Date;
  /** 종료일 */
  endDate?: Date;
  /** 특정 앱들만 필터링 (선택) */
  appIds?: string[];
  /** 팀 필터 (선택) */
  teamId?: string;
  /** 사용자 필터 (선택) */
  userId?: string;
}

/**
 * 이상 비용 정보
 */
export interface CostAnomaly {
  /** 앱 ID */
  appId: string;
  /** 앱 이름 */
  appName: string;
  /** 현재 월 비용 */
  currentCost: number;
  /** 이전 월 비용 */
  previousCost: number;
  /** 증감률 (%) */
  changeRate: number;
  /** 심각도 - low: 50-100%, medium: 100-200%, high: 200%+ */
  severity: "low" | "medium" | "high";
  /** 감지 메시지 */
  message: string;
}

/**
 * 비용 예측 결과
 */
export interface ForecastResult {
  /** 예측 대상 월 (YYYY-MM 형식) */
  targetMonth: string;
  /** 표시용 라벨 */
  displayLabel: string;
  /** 예측 비용 (구독 기반) */
  forecastedCost: number;
  /** 실제 비용 (있는 경우) */
  actualCost?: number;
  /** 예측 대비 차이 (실제 - 예측) */
  variance?: number;
  /** 차이 비율 (%) */
  variancePercentage?: number;
  /** 구독별 예측 내역 */
  subscriptionBreakdown: SubscriptionForecast[];
}

/**
 * 구독별 비용 예측
 */
export interface SubscriptionForecast {
  /** 구독 ID */
  subscriptionId: string;
  /** 앱 이름 */
  appName: string;
  /** 예상 비용 */
  expectedCost: number;
  /** 청구 주기 */
  billingCycle: "MONTHLY" | "YEARLY" | "QUARTERLY";
  /** 다음 갱신일 */
  nextRenewalDate: Date | null;
}

/**
 * 미매칭 결제 현황
 */
export interface UnmatchedPaymentSummary {
  /** 미매칭 결제 건수 */
  count: number;
  /** 미매칭 총 금액 */
  totalAmount: number;
  /** 가장 최근 미매칭 결제 날짜 */
  latestDate: Date | null;
}

/**
 * Server Actions 결과 타입들
 */
export interface GetCostStatisticsResult {
  statistics: CostStatistics;
}

export interface GetTopCostAppsResult {
  apps: AppCostDistribution[];
  totalCost: number;
}

export interface GetMonthlyCostTrendResult {
  trends: MonthlyCostTrend[];
  averageCost: number;
}

export interface DetectCostAnomaliesResult {
  anomalies: CostAnomaly[];
  hasAnomalies: boolean;
}

export interface GetForecastedCostResult {
  forecast: ForecastResult;
}
