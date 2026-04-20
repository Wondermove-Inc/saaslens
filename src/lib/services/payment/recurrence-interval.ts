// src/lib/services/payment/recurrence-interval.ts
/**
 * 결제 간격 기반 주기 분석
 */
import { normalizeMerchantName } from "./merchant-matcher";
import type {
  BillingCycle,
  DateTransaction,
  MinimalPurchase,
  RecurrencePattern,
} from "./recurrence.types";
import { parseDateString } from "./recurrence.utils";

/**
 * 결제 간격 기반 반복 결제 분석
 *
 * PRD 기준:
 * - 표준편차 < 5일 → 반복 결제로 판정
 * - 평균 간격 기반 주기 판단:
 *   * < 35일: MONTHLY
 *   * 35~100일: QUARTERLY
 *   * 100~200일: SEMI_ANNUAL
 *   * > 300일: ANNUAL
 * - 다음 결제일 예측: lastDate + avgInterval
 */
export function analyzePaymentIntervals(
  purchases: MinimalPurchase[],
  options: {
    /**
     * 반복 결제 판정 기준 표준편차 (일)
     * PRD 기준: 5일
     */
    stdDevThreshold?: number;
    /**
     * 최소 거래 수
     */
    minTransactionCount?: number;
  } = {}
): Map<string, RecurrencePattern> {
  const { stdDevThreshold = 5, minTransactionCount = 2 } = options;

  // 가맹점별 거래 그룹화
  const merchantTxMap = new Map<string, DateTransaction[]>();

  for (const p of purchases) {
    const date = parseDateString(p.useDt);
    if (!date) continue;

    const normalized = normalizeMerchantName(p.useStore);
    const amount = Number.parseFloat(p.useAmt) || 0;
    if (amount <= 0) continue;

    const existing = merchantTxMap.get(normalized) || [];
    existing.push({ date, amount });
    merchantTxMap.set(normalized, existing);
  }

  const result = new Map<string, RecurrencePattern>();

  for (const [merchant, transactions] of merchantTxMap) {
    if (transactions.length < minTransactionCount) continue;

    const pattern = analyzeIntervals(
      transactions,
      stdDevThreshold,
      minTransactionCount
    );
    result.set(merchant, pattern);
  }

  return result;
}

function analyzeIntervals(
  transactions: DateTransaction[],
  stdDevThreshold: number,
  minTransactionCount: number
): RecurrencePattern {
  // 날짜순 정렬
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const transactionCount = sorted.length;
  const amounts = sorted.map((t) => t.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const lastPaymentDate = sorted[sorted.length - 1].date;

  // 거래가 2개 미만이면 간격 계산 불가
  if (transactionCount < minTransactionCount) {
    return {
      isRecurring: false,
      billingCycle: null,
      avgIntervalDays: 0,
      intervalStdDev: 0,
      nextPaymentDate: null,
      lastPaymentDate,
      transactionCount,
      avgAmount,
    };
  }

  // 간격 계산
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs = sorted[i].date.getTime() - sorted[i - 1].date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    intervals.push(diffDays);
  }

  // 평균 간격
  const avgIntervalDays =
    intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // 표준편차 계산
  const squaredDiffs = intervals.map((i) => Math.pow(i - avgIntervalDays, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
  const intervalStdDev = Math.sqrt(variance);

  // 반복 결제 판정 (표준편차 < threshold)
  const isRecurring = intervalStdDev < stdDevThreshold;

  // 주기 판단
  const billingCycle = isRecurring
    ? determineBillingCycle(avgIntervalDays)
    : null;

  // 다음 결제일 예측
  const nextPaymentDate = isRecurring
    ? new Date(
        lastPaymentDate.getTime() + avgIntervalDays * 24 * 60 * 60 * 1000
      )
    : null;

  return {
    isRecurring,
    billingCycle,
    avgIntervalDays: Math.round(avgIntervalDays * 10) / 10,
    intervalStdDev: Math.round(intervalStdDev * 10) / 10,
    nextPaymentDate,
    lastPaymentDate,
    transactionCount,
    avgAmount,
  };
}

/**
 * 평균 간격으로 결제 주기 판단
 *
 * - < 35일: MONTHLY
 * - 35~100일: QUARTERLY
 * - 100~200일: SEMI_ANNUAL
 * - > 300일: ANNUAL
 */
function determineBillingCycle(avgIntervalDays: number): BillingCycle {
  if (avgIntervalDays < 35) {
    return "MONTHLY";
  }
  if (avgIntervalDays < 100) {
    return "QUARTERLY";
  }
  if (avgIntervalDays < 200) {
    return "SEMI_ANNUAL";
  }
  return "ANNUAL";
}
