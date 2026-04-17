import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { advanceToFutureDate } from "@/lib/utils/renewal-date";

export interface AutoRenewResult {
  processed: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * autoRenewal=true인 구독 중 renewalDate가 과거인 건을
 * billingCycle에 따라 다음 갱신일로 자동 업데이트합니다.
 */
export async function processAutoRenewals(): Promise<AutoRenewResult> {
  const now = new Date();

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      autoRenewal: true,
      billingCycle: { not: "ONE_TIME" },
      renewalDate: { lt: now },
    },
    select: {
      id: true,
      renewalDate: true,
      billingCycle: true,
      app: { select: { name: true } },
      organizationId: true,
    },
  });

  const result: AutoRenewResult = {
    processed: subscriptions.length,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const sub of subscriptions) {
    try {
      if (!sub.renewalDate) continue;

      const nextRenewalDate = advanceToFutureDate(
        sub.renewalDate,
        sub.billingCycle
      );

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { renewalDate: nextRenewalDate },
      });

      logger.info(
        {
          subscriptionId: sub.id,
          appName: sub.app.name,
          oldDate: sub.renewalDate.toISOString(),
          newDate: nextRenewalDate.toISOString(),
          billingCycle: sub.billingCycle,
        },
        "[AutoRenew] 갱신일 업데이트"
      );

      result.updated++;
    } catch (error) {
      result.failed++;
      const msg = `구독 ${sub.id} (${sub.app.name}) 업데이트 실패: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`;
      result.errors.push(msg);
      logger.error({ err: error, subscriptionId: sub.id }, msg);
    }
  }

  return result;
}
