// src/lib/services/payment/recurrence.types.ts

/**
 * 최소 결제 정보 (카드사 raw 데이터 형식)
 */
export interface MinimalPurchase {
  /** 거래일자 (YYYYMMDD) */
  useDt: string;
  /** 거래시간 (HHMM) */
  useTm?: string | null;
  /** 가맹점명 */
  useStore: string;
  /** 거래금액 */
  useAmt: string;
}

/**
 * 월별 거래 정보
 */
export interface MonthlyTransaction {
  /** 월 (YYYYMM) */
  month: string;
  /** 일자 (1-31) */
  day: number;
  /** 금액 */
  amount: number;
}

/**
 * 월 반복 결제 정보
 */
export interface MonthlyRecurrence {
  /** 반복 횟수 (월 수) */
  count: number;
  /** 최소 금액 */
  minAmount: number;
  /** 최대 금액 */
  maxAmount: number;
}

/**
 * SaaS 구독 휴리스틱 결과
 */
export interface SaaSSubscriptionHint {
  /**
   * SaaS 구독 가능성 점수 (0-100)
   * - 50 이상: SaaS 가능성 높음
   * - 30-50: 불확실
   * - 30 미만: SaaS 가능성 낮음
   */
  score: number;
  /** 탐지된 패턴 설명 */
  reasons: string[];
  /** 월별 거래 횟수 (서로 다른 월) */
  monthCount: number;
  /** 평균 금액 */
  avgAmount: number;
  /** 금액 편차율 (0-1, 0에 가까울수록 일관성 높음) */
  amountVariation: number;
}

/**
 * SaaS 휴리스틱 옵션
 */
export interface SaaSHeuristicOptions {
  /** 금액 유사성 허용 범위 (기본값: 0.1 = ±10%) */
  amountTolerance?: number;
  /** 최소 월 횟수 (기본값: 2) */
  minMonthCount?: number;
  /** 일자 유사성 허용 범위 (기본값: 3일) */
  dayTolerance?: number;
}

/**
 * 결제 주기 타입
 */
export type BillingCycle = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";

/**
 * 반복 결제 패턴 분석 결과
 */
export interface RecurrencePattern {
  /** 반복 결제로 판정되었는지 여부 */
  isRecurring: boolean;
  /** 결제 주기 */
  billingCycle: BillingCycle | null;
  /** 평균 간격 (일) */
  avgIntervalDays: number;
  /** 간격 표준편차 (일) */
  intervalStdDev: number;
  /** 예측된 다음 결제일 */
  nextPaymentDate: Date | null;
  /** 마지막 결제일 */
  lastPaymentDate: Date | null;
  /** 분석에 사용된 거래 수 */
  transactionCount: number;
  /** 평균 금액 */
  avgAmount: number;
}

/**
 * 날짜별 거래 정보 (내부 사용)
 */
export interface DateTransaction {
  date: Date;
  amount: number;
}
