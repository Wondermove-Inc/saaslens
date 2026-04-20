"use server";

import { getCachedSession } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { ActionState } from "@/types";

interface MigrationResult {
  cardTransactionsUpdated: number;
  paymentRecordsUpdated: number;
}

/**
 * 기존 Non-SaaS 결제 데이터의 matchStatus를 PENDING → UNMATCHED로 마이그레이션
 *
 * 대상: matchStatus=PENDING AND matchedAppId IS NULL (파이프라인 처리 완료인데 PENDING으로 남은 항목)
 * - 취소 거래(useDiv에 '취소' 포함)는 제외 (PENDING 유지)
 *
 * 한 번 실행 후 삭제 가능한 임시 Server Action
 */
export async function migrateNonSaaSMatchStatus(): Promise<
  ActionState<MigrationResult>
> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (session.user.role !== "ADMIN") {
      return { success: false, message: "관리자만 실행할 수 있습니다" };
    }

    const organizationId = session.user.organizationId;

    // CardTransaction: PENDING + matchedAppId=null + 취소 거래 제외
    const cardResult = await prisma.cardTransaction.updateMany({
      where: {
        organizationId,
        matchStatus: "PENDING",
        matchedAppId: null,
        NOT: {
          useDiv: { contains: "취소" },
        },
      },
      data: {
        matchStatus: "UNMATCHED",
      },
    });

    // PaymentRecord: PENDING + matchedAppId=null
    const csvResult = await prisma.paymentRecord.updateMany({
      where: {
        organizationId,
        matchStatus: "PENDING",
        matchedAppId: null,
      },
      data: {
        matchStatus: "UNMATCHED",
      },
    });

    logger.info(
      {
        organizationId,
        cardTransactionsUpdated: cardResult.count,
        paymentRecordsUpdated: csvResult.count,
      },
      "[Migration] Non-SaaS matchStatus PENDING → UNMATCHED 마이그레이션 완료"
    );

    return {
      success: true,
      data: {
        cardTransactionsUpdated: cardResult.count,
        paymentRecordsUpdated: csvResult.count,
      },
    };
  } catch (error) {
    logger.error({ err: error }, "[Migration] Non-SaaS 마이그레이션 실패");
    return {
      success: false,
      message: "마이그레이션 실행 중 오류가 발생했습니다",
    };
  }
}
