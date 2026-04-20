/**
 * 결제 → 구독 자동 연동 서비스
 *
 * PRD 요구사항:
 * - 반복 결제 패턴이 있는 경우만 Subscription 생성
 * - 2회+ 반복 패턴 → Subscription upsert
 * - 기존 Subscription 있으면 업데이트 (금액, 갱신일)
 */

import { prisma } from "@/lib/db";
import type { BillingCycle as PrismaBillingCycle } from "@prisma/client";
import {
  analyzePaymentIntervals,
  type BillingCycle,
  type RecurrencePattern,
} from "./recurrence";

interface PaymentTransaction {
  useDt: string;
  useStore: string;
  useAmt: string;
  matchedAppId: string | null;
}

interface SubscriptionSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * BillingCycle 매핑 (recurrence -> Prisma enum)
 * Note: Prisma enum에는 SEMI_ANNUAL, ANNUAL이 없으므로 근사 매핑
 */
function mapBillingCycle(cycle: BillingCycle): PrismaBillingCycle {
  switch (cycle) {
    case "MONTHLY":
      return "MONTHLY";
    case "QUARTERLY":
      return "QUARTERLY";
    case "SEMI_ANNUAL":
      return "QUARTERLY"; // Prisma에 SEMI_ANNUAL 없음, QUARTERLY로 근사
    case "ANNUAL":
      return "YEARLY"; // Prisma에서는 YEARLY 사용
    default:
      return "MONTHLY";
  }
}

/**
 * 결제 내역에서 구독 정보 자동 동기화
 *
 * @param organizationId 조직 ID
 * @param transactions 결제 내역 (matchedAppId가 있는 것만)
 * @returns 동기화 결과
 */
export async function syncSubscriptionsFromPayments(
  organizationId: string,
  transactions: PaymentTransaction[]
): Promise<SubscriptionSyncResult> {
  const result: SubscriptionSyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // 매칭된 앱이 있는 거래만 필터링
  const matchedTransactions = transactions.filter((tx) => tx.matchedAppId);

  if (matchedTransactions.length === 0) {
    return result;
  }

  // 결제 간격 분석
  const patterns = analyzePaymentIntervals(
    matchedTransactions.map((tx) => ({
      useDt: tx.useDt,
      useStore: tx.useStore,
      useAmt: tx.useAmt,
    })),
    { stdDevThreshold: 5, minTransactionCount: 2 }
  );

  // 가맹점 → App 매핑 생성
  const merchantToApp = new Map<string, string>();
  for (const tx of matchedTransactions) {
    if (tx.matchedAppId) {
      const normalizedMerchant = tx.useStore.toLowerCase().trim();
      merchantToApp.set(normalizedMerchant, tx.matchedAppId);
    }
  }

  // 반복 결제로 판정된 패턴에 대해 구독 생성/업데이트
  for (const [merchant, pattern] of patterns) {
    if (!pattern.isRecurring) {
      result.skipped++;
      continue;
    }

    const appId = merchantToApp.get(merchant);
    if (!appId) {
      result.skipped++;
      continue;
    }

    try {
      const syncResult = await syncSubscription(organizationId, appId, pattern);
      if (syncResult === "created") result.created++;
      else if (syncResult === "updated") result.updated++;
      else result.skipped++;
    } catch (error) {
      result.errors.push(
        `Subscription sync failed for ${merchant}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return result;
}

/**
 * 단일 구독 동기화
 */
async function syncSubscription(
  organizationId: string,
  appId: string,
  pattern: RecurrencePattern
): Promise<"created" | "updated" | "skipped"> {
  // 기존 구독 조회
  const existing = await prisma.subscription.findFirst({
    where: {
      organizationId,
      appId,
    },
  });

  const billingCycle = pattern.billingCycle
    ? mapBillingCycle(pattern.billingCycle)
    : "MONTHLY";
  const amount = Math.round(pattern.avgAmount);
  const renewalDate = pattern.nextPaymentDate;
  const startDate = pattern.lastPaymentDate || new Date();

  if (existing) {
    // 기존 구독 업데이트 (금액, 갱신일만)
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        amount,
        billingCycle,
        renewalDate,
        updatedAt: new Date(),
      },
    });
    return "updated";
  }

  // 새 구독 생성
  await prisma.subscription.create({
    data: {
      organizationId,
      appId,
      status: "ACTIVE",
      billingCycle,
      amount,
      currency: "KRW",
      startDate,
      renewalDate,
      autoRenewal: true,
    },
  });

  return "created";
}

/**
 * 특정 앱에 대한 결제 내역으로 구독 동기화
 */
export async function syncAppSubscriptionFromPayments(
  organizationId: string,
  appId: string,
  transactions: { useDt: string; useAmt: string }[]
): Promise<"created" | "updated" | "skipped" | "no_pattern"> {
  if (transactions.length < 2) {
    return "no_pattern";
  }

  // 결제 간격 분석
  const patterns = analyzePaymentIntervals(
    transactions.map((tx) => ({
      useDt: tx.useDt,
      useStore: "dummy", // 단일 앱이므로 가맹점명 불필요
      useAmt: tx.useAmt,
    })),
    { stdDevThreshold: 5, minTransactionCount: 2 }
  );

  // 첫 번째 패턴 사용
  const pattern = patterns.values().next().value as
    | RecurrencePattern
    | undefined;

  if (!pattern || !pattern.isRecurring) {
    return "no_pattern";
  }

  return syncSubscription(organizationId, appId, pattern);
}
