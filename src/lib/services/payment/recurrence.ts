// src/lib/services/payment/recurrence.ts
/**
 * 결제 반복 패턴 분석 통합 모듈
 *
 * 모든 기능을 재-export하여 기존 import 호환성 유지:
 * - recurrence.types.ts: 타입 정의
 * - recurrence.utils.ts: 유틸리티 함수
 * - recurrence-detection.ts: 월 반복 결제 감지
 * - recurrence-saas.ts: SaaS 패턴 분석
 * - recurrence-interval.ts: 결제 간격 분석
 */

// Types re-export
export type {
  BillingCycle,
  DateTransaction,
  MinimalPurchase,
  MonthlyRecurrence,
  MonthlyTransaction,
  RecurrencePattern,
  SaaSHeuristicOptions,
  SaaSSubscriptionHint,
} from "./recurrence.types";

// Utils re-export (내부 사용)
export {
  calculateDayVariation,
  calculateVariation,
  parseDateString,
  parseDayOfMonth,
  parseMinutes,
  parseMonthKey,
} from "./recurrence.utils";

// Detection re-export
export { detectMonthlyRecurrence } from "./recurrence-detection";

// SaaS analysis re-export
export {
  analyzeSaaSSubscriptionPatterns,
  formatSaaSHintForLLM,
} from "./recurrence-saas";

// Interval analysis re-export
export { analyzePaymentIntervals } from "./recurrence-interval";
