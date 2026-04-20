// src/lib/services/payment/recurrence-detection.ts
/**
 * 월 단위 반복 결제 감지
 */
import { normalizeMerchantName } from "./merchant-matcher";
import type { MinimalPurchase, MonthlyRecurrence } from "./recurrence.types";
import {
  parseDayOfMonth,
  parseMinutes,
  parseMonthKey,
} from "./recurrence.utils";

/**
 * 월 단위 반복 결제 감지
 * - 동일 가맹점이 매월 동일 일자·시각(±1분)으로 2회 이상 발생하면 recurrence로 간주
 */
export function detectMonthlyRecurrence(
  purchases: MinimalPurchase[]
): Map<string, MonthlyRecurrence> {
  // key: normalized|day|minuteSlot (minuteSlot는 ±1분 오차 허용을 위해 세 개의 슬롯에 모두 적재)
  const bucketMap = new Map<
    string,
    {
      months: Set<string>;
      minAmount: number;
      maxAmount: number;
      normalized: string;
    }
  >();

  for (const p of purchases) {
    const day = parseDayOfMonth(p.useDt);
    const minutes = parseMinutes(p.useTm);
    const monthKey = parseMonthKey(p.useDt);
    if (day === null || minutes === null || !monthKey) continue;

    const normalized = normalizeMerchantName(p.useStore);
    const amount = Number.parseFloat(p.useAmt) || 0;

    for (let delta = -1; delta <= 1; delta += 1) {
      const minuteSlot = minutes + delta;
      if (minuteSlot < 0 || minuteSlot >= 24 * 60) continue;
      const key = `${normalized}|${day}|${minuteSlot}`;
      const existing = bucketMap.get(key);
      if (existing) {
        existing.months.add(monthKey);
        existing.minAmount = Math.min(existing.minAmount, amount);
        existing.maxAmount = Math.max(existing.maxAmount, amount);
      } else {
        bucketMap.set(key, {
          months: new Set([monthKey]),
          minAmount: amount,
          maxAmount: amount,
          normalized,
        });
      }
    }
  }

  // bucket별 월 중복을 기준으로 상위 결과만 남김
  const result = new Map<string, MonthlyRecurrence>();

  for (const bucket of bucketMap.values()) {
    const monthCount = bucket.months.size;
    if (monthCount < 2) continue;

    const existing = result.get(bucket.normalized);
    if (!existing || monthCount > existing.count) {
      result.set(bucket.normalized, {
        count: monthCount,
        minAmount: bucket.minAmount,
        maxAmount: bucket.maxAmount,
      });
    } else if (existing && monthCount === existing.count) {
      result.set(bucket.normalized, {
        count: existing.count,
        minAmount: Math.min(existing.minAmount, bucket.minAmount),
        maxAmount: Math.max(existing.maxAmount, bucket.maxAmount),
      });
    }
  }

  return result;
}
