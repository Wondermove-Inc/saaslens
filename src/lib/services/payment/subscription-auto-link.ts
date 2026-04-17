// src/lib/services/payment/subscription-auto-link.ts
/**
 * 결제내역 → 구독 자동 연결 유틸리티
 * matchedAppId가 설정된 결제내역에 대해 해당 앱의 ACTIVE 구독을 자동으로 찾아 연결한다.
 */

import { prisma } from "@/lib/db";

/**
 * 주어진 앱의 활성(ACTIVE) 구독 ID를 반환한다.
 * - appId가 null이면 DB 호출 없이 null 반환
 * - Subscription 모델의 @@unique([appId, organizationId]) 제약으로 앱당 최대 1개 구독
 * - ACTIVE 상태인 경우에만 subscription.id 반환
 */
export async function findActiveSubscriptionForApp(
  appId: string | null,
  organizationId: string
): Promise<string | null> {
  if (!appId) return null;

  const subscription = await prisma.subscription.findUnique({
    where: {
      appId_organizationId: {
        appId,
        organizationId,
      },
    },
    select: { id: true, status: true },
  });

  if (!subscription || subscription.status !== "ACTIVE") return null;

  return subscription.id;
}
