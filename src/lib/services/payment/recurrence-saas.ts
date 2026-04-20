// src/lib/services/payment/recurrence-saas.ts
/**
 * SaaS 구독 패턴 분석
 */
import { normalizeMerchantName } from "./merchant-matcher";
import type {
  MinimalPurchase,
  MonthlyTransaction,
  SaaSHeuristicOptions,
  SaaSSubscriptionHint,
} from "./recurrence.types";
import {
  calculateDayVariation,
  calculateVariation,
  parseDayOfMonth,
  parseMonthKey,
} from "./recurrence.utils";

/**
 * 가맹점별 SaaS 구독 가능성을 분석
 * - 월 반복 거래 빈도 분석
 * - 금액 유사성 검사 (±10% 범위)
 * - 일자 패턴 분석 (±3일 범위)
 *
 * @param purchases 거래 목록
 * @param options 휴리스틱 옵션
 * @returns 가맹점별 SaaS 구독 힌트
 */
export function analyzeSaaSSubscriptionPatterns(
  purchases: MinimalPurchase[],
  options: SaaSHeuristicOptions = {}
): Map<string, SaaSSubscriptionHint> {
  const {
    amountTolerance = 0.1,
    minMonthCount = 2,
    dayTolerance = 3,
  } = options;

  // 가맹점별 월별 거래 그룹화
  const merchantTxMap = new Map<string, MonthlyTransaction[]>();

  for (const p of purchases) {
    const month = parseMonthKey(p.useDt);
    const day = parseDayOfMonth(p.useDt);
    if (!month || day === null) continue;

    const normalized = normalizeMerchantName(p.useStore);
    const amount = Number.parseFloat(p.useAmt) || 0;
    if (amount <= 0) continue;

    const existing = merchantTxMap.get(normalized) || [];
    existing.push({ month, day, amount });
    merchantTxMap.set(normalized, existing);
  }

  const result = new Map<string, SaaSSubscriptionHint>();

  for (const [merchant, transactions] of merchantTxMap) {
    const hint = analyzeTransactions(
      transactions,
      amountTolerance,
      minMonthCount,
      dayTolerance
    );
    if (hint) {
      result.set(merchant, hint);
    }
  }

  return result;
}

function analyzeTransactions(
  transactions: MonthlyTransaction[],
  amountTolerance: number,
  minMonthCount: number,
  dayTolerance: number
): SaaSSubscriptionHint | null {
  // 월별로 그룹화 (같은 월에 여러 거래가 있을 수 있음)
  const monthlyGroups = new Map<string, MonthlyTransaction[]>();
  for (const tx of transactions) {
    const existing = monthlyGroups.get(tx.month) || [];
    existing.push(tx);
    monthlyGroups.set(tx.month, existing);
  }

  // 월별 대표 거래 선택 (가장 높은 금액)
  const monthlyRepresentatives: MonthlyTransaction[] = [];
  for (const txs of monthlyGroups.values()) {
    const maxTx = txs.reduce(
      (max, tx) => (tx.amount > max.amount ? tx : max),
      txs[0]
    );
    monthlyRepresentatives.push(maxTx);
  }

  const monthCount = monthlyRepresentatives.length;
  if (monthCount < minMonthCount) {
    return null;
  }

  const reasons: string[] = [];
  let score = 0;

  // 1. 월 빈도 점수 (최대 30점)
  if (monthCount >= 6) {
    score += 30;
    reasons.push(`6개월 이상 연속 결제 (${monthCount}개월)`);
  } else if (monthCount >= 3) {
    score += 20;
    reasons.push(`3개월 이상 연속 결제 (${monthCount}개월)`);
  } else if (monthCount >= 2) {
    score += 10;
    reasons.push(`2개월 연속 결제`);
  }

  // 2. 금액 일관성 점수 (최대 40점)
  const amounts = monthlyRepresentatives.map((tx) => tx.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const amountVariation = calculateVariation(amounts, avgAmount);

  if (amountVariation <= amountTolerance) {
    score += 40;
    reasons.push(
      `금액 일관성 높음 (편차 ${(amountVariation * 100).toFixed(1)}%)`
    );
  } else if (amountVariation <= amountTolerance * 2) {
    score += 25;
    reasons.push(
      `금액 일관성 보통 (편차 ${(amountVariation * 100).toFixed(1)}%)`
    );
  } else if (amountVariation <= amountTolerance * 3) {
    score += 10;
    reasons.push(
      `금액 편차 있음 (편차 ${(amountVariation * 100).toFixed(1)}%)`
    );
  }

  // 3. 일자 일관성 점수 (최대 30점)
  const days = monthlyRepresentatives.map((tx) => tx.day);
  const dayVariation = calculateDayVariation(days);

  if (dayVariation <= dayTolerance) {
    score += 30;
    reasons.push(`결제일 일관성 높음 (±${dayVariation.toFixed(1)}일)`);
  } else if (dayVariation <= dayTolerance * 2) {
    score += 15;
    reasons.push(`결제일 편차 있음 (±${dayVariation.toFixed(1)}일)`);
  }

  // 최소 점수 기준 미달시 null 반환
  if (score < 20) {
    return null;
  }

  return {
    score,
    reasons,
    monthCount,
    avgAmount,
    amountVariation,
  };
}

/**
 * 휴리스틱 결과를 recurrenceHint 문자열로 변환
 */
export function formatSaaSHintForLLM(hint: SaaSSubscriptionHint): string {
  const parts = [
    `saas_score=${hint.score}`,
    `months=${hint.monthCount}`,
    `avg_amount=${hint.avgAmount.toFixed(0)}`,
    `amount_var=${(hint.amountVariation * 100).toFixed(1)}%`,
  ];

  if (hint.reasons.length > 0) {
    parts.push(`patterns=[${hint.reasons.join("; ")}]`);
  }

  return parts.join(", ");
}
