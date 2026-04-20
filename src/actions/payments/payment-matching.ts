"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type { MatchSource, PaymentMatchStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * 통합 ID에서 실제 ID와 소스 추출
 * - 'card_xxx' → { source: 'card', id: 'xxx' }
 * - 'csv_xxx' → { source: 'csv', id: 'xxx' }
 * - 'xxx' → { source: null, id: 'xxx' } (레거시 지원)
 */
function parseUnifiedId(unifiedId: string): {
  source: "card" | "csv" | null;
  id: string;
} {
  if (unifiedId.startsWith("card_")) {
    return { source: "card", id: unifiedId.substring(5) };
  }
  if (unifiedId.startsWith("csv_")) {
    return { source: "csv", id: unifiedId.substring(4) };
  }
  // prefix가 없으면 레거시 ID로 간주
  return { source: null, id: unifiedId };
}

/**
 * 결제 내역 매칭 업데이트
 * - PaymentRecord와 CardTransaction 모두 지원
 * - 통합 ID 형식 (card_xxx, csv_xxx) 지원
 */
async function _updatePaymentMatch(
  paymentId: string,
  appId: string | null
): Promise<ActionState> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 매칭을 수정할 수 있습니다",
      };
    }

    // 통합 ID 파싱
    const { source, id: actualId } = parseUnifiedId(paymentId);

    if (source === "csv") {
      // PaymentRecord 업데이트
      const paymentRecord = await prisma.paymentRecord.findFirst({
        where: { id: actualId, organizationId: session.user.organizationId },
      });

      if (!paymentRecord) {
        return {
          success: false,
          message: "결제 내역을 찾을 수 없습니다",
        };
      }

      await prisma.paymentRecord.update({
        where: { id: actualId },
        data: {
          matchedAppId: appId,
          matchStatus: appId ? "MANUAL" : "UNMATCHED",
          matchSource: appId ? ("MANUAL" as MatchSource) : null,
          matchConfidence: appId ? 1.0 : null,
        },
      });
    } else if (source === "card") {
      // CardTransaction 업데이트
      const cardTransaction = await prisma.cardTransaction.findFirst({
        where: { id: actualId, organizationId: session.user.organizationId },
      });

      if (!cardTransaction) {
        return {
          success: false,
          message: "결제 내역을 찾을 수 없습니다",
        };
      }

      await prisma.cardTransaction.update({
        where: { id: actualId },
        data: {
          matchedAppId: appId,
          matchStatus: appId ? "MANUAL" : "UNMATCHED",
          matchSource: appId ? ("MANUAL" as MatchSource) : null,
          matchConfidence: appId ? 1.0 : null,
        },
      });
    } else {
      // 레거시 ID: 순차적으로 찾기
      const paymentRecord = await prisma.paymentRecord.findFirst({
        where: { id: actualId, organizationId: session.user.organizationId },
      });

      if (paymentRecord) {
        await prisma.paymentRecord.update({
          where: { id: actualId },
          data: {
            matchedAppId: appId,
            matchStatus: appId ? "MANUAL" : "UNMATCHED",
            matchSource: appId ? ("MANUAL" as MatchSource) : null,
            matchConfidence: appId ? 1.0 : null,
          },
        });
      } else {
        const cardTransaction = await prisma.cardTransaction.findFirst({
          where: { id: actualId, organizationId: session.user.organizationId },
        });

        if (cardTransaction) {
          await prisma.cardTransaction.update({
            where: { id: actualId },
            data: {
              matchedAppId: appId,
              matchStatus: appId ? "MANUAL" : "UNMATCHED",
              matchSource: appId ? ("MANUAL" as MatchSource) : null,
              matchConfidence: appId ? 1.0 : null,
            },
          });
        } else {
          return {
            success: false,
            message: "결제 내역을 찾을 수 없습니다",
          };
        }
      }
    }

    revalidatePath("/payments");
    revalidatePath("/payments");

    return {
      success: true,
      message: appId
        ? "앱 매칭이 업데이트되었습니다"
        : "앱 매칭이 해제되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "매칭 업데이트 오류");
    return {
      success: false,
      message: "매칭 업데이트 중 오류가 발생했습니다",
    };
  }
}
export const updatePaymentMatch = withLogging(
  "updatePaymentMatch",
  _updatePaymentMatch
);

/**
 * 결제 내역을 구독에 연결
 * - PaymentRecord와 CardTransaction 모두 지원
 * - 통합 ID 형식 (card_xxx, csv_xxx) 지원
 */
async function _linkPaymentToSubscription(
  paymentId: string,
  subscriptionId: string
): Promise<ActionState> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    // 권한 검증: ADMIN만 결제 내역 연결 가능
    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 결제 내역을 연결할 수 있습니다",
      };
    }

    // 구독이 해당 조직에 속하는지 확인
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        organizationId: session.user.organizationId,
      },
    });

    if (!subscription) {
      return {
        success: false,
        message: "해당 구독을 찾을 수 없습니다",
      };
    }

    // 통합 ID 파싱
    const { source, id: actualId } = parseUnifiedId(paymentId);

    if (source === "csv") {
      // PaymentRecord 업데이트
      const paymentRecord = await prisma.paymentRecord.findFirst({
        where: { id: actualId, organizationId: session.user.organizationId },
      });

      if (!paymentRecord) {
        return {
          success: false,
          message: "결제 내역을 찾을 수 없습니다",
        };
      }

      await prisma.paymentRecord.update({
        where: { id: actualId },
        data: { linkedSubscriptionId: subscriptionId },
      });
    } else if (source === "card") {
      // CardTransaction 업데이트
      const cardTransaction = await prisma.cardTransaction.findFirst({
        where: { id: actualId, organizationId: session.user.organizationId },
      });

      if (!cardTransaction) {
        return {
          success: false,
          message: "결제 내역을 찾을 수 없습니다",
        };
      }

      await prisma.cardTransaction.update({
        where: { id: actualId },
        data: { linkedSubscriptionId: subscriptionId },
      });
    } else {
      // 레거시 ID: 순차적으로 찾기
      const paymentRecord = await prisma.paymentRecord.findFirst({
        where: { id: actualId, organizationId: session.user.organizationId },
      });

      if (paymentRecord) {
        await prisma.paymentRecord.update({
          where: { id: actualId },
          data: { linkedSubscriptionId: subscriptionId },
        });
      } else {
        const cardTransaction = await prisma.cardTransaction.findFirst({
          where: { id: actualId, organizationId: session.user.organizationId },
        });

        if (cardTransaction) {
          await prisma.cardTransaction.update({
            where: { id: actualId },
            data: { linkedSubscriptionId: subscriptionId },
          });
        } else {
          return {
            success: false,
            message: "결제 내역을 찾을 수 없습니다",
          };
        }
      }
    }

    revalidatePath("/payments");
    revalidatePath("/subscriptions");

    return {
      success: true,
      message: "결제 내역이 구독에 연결되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "구독 연결 오류");
    return {
      success: false,
      message: "구독 연결 중 오류가 발생했습니다",
    };
  }
}
export const linkPaymentToSubscription = withLogging(
  "linkPaymentToSubscription",
  _linkPaymentToSubscription
);

interface UpdatePaymentRecordInput {
  notes?: string;
  linkedSubscriptionId?: string | null;
  linkedAppId?: string | null;
  matchStatus?: PaymentMatchStatus;
}

/**
 * 결제 기록 수정
 */
async function _updatePaymentRecord(
  id: string,
  input: UpdatePaymentRecordInput
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "인증이 필요합니다" };
    }
    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const organizationId = session.user.organizationId;

    // 결제 기록 존재 확인
    const existingRecord = await prisma.paymentRecord.findFirst({
      where: { id, organizationId },
    });

    if (!existingRecord) {
      return { success: false, message: "결제 기록을 찾을 수 없습니다" };
    }

    await prisma.paymentRecord.update({
      where: { id },
      data: {
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.linkedSubscriptionId !== undefined && {
          linkedSubscriptionId: input.linkedSubscriptionId,
        }),
        ...(input.linkedAppId !== undefined && {
          linkedAppId: input.linkedAppId,
        }),
        ...(input.matchStatus && { matchStatus: input.matchStatus }),
      },
    });

    revalidatePath("/payments");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "결제 기록 수정 오류");
    return {
      success: false,
      message: "결제 기록 수정 중 오류가 발생했습니다",
    };
  }
}
export const updatePaymentRecord = withLogging(
  "updatePaymentRecord",
  _updatePaymentRecord
);

/**
 * 결제 기록 삭제
 */
async function _deletePaymentRecord(id: string): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "인증이 필요합니다" };
    }
    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const organizationId = session.user.organizationId;

    // 결제 기록 존재 확인
    const existingRecord = await prisma.paymentRecord.findFirst({
      where: { id, organizationId },
    });

    if (!existingRecord) {
      return { success: false, message: "결제 기록을 찾을 수 없습니다" };
    }

    await prisma.paymentRecord.delete({ where: { id } });

    revalidatePath("/payments");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "결제 기록 삭제 오류");
    return {
      success: false,
      message: "결제 기록 삭제 중 오류가 발생했습니다",
    };
  }
}
export const deletePaymentRecord = withLogging(
  "deletePaymentRecord",
  _deletePaymentRecord
);
