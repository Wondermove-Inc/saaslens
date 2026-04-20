import { Prisma, SyncHistory, SyncStatus, SyncType } from "@prisma/client";

import { prisma } from "@/lib/db";

// SyncHistory 생성 입력 타입
interface CreateSyncHistoryInput {
  organizationId: string;
  type: SyncType;
  triggeredBy: "USER" | "CRON" | "RETRY";
  userId?: string;
  corporateCardId?: string;
  fileName?: string;
}

// SyncHistory 완료 결과 타입
interface CompleteSyncHistoryResult {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  totalRecords: number;
  successCount: number;
  failedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
}

// getSyncHistories 필터 타입
interface GetSyncHistoriesFilters {
  organizationId: string;
  corporateCardId?: string;
  type?: SyncType;
  limit?: number;
  offset?: number;
}

/**
 * 새 SyncHistory 레코드를 RUNNING 상태로 생성합니다.
 */
export async function createSyncHistory(
  input: CreateSyncHistoryInput
): Promise<SyncHistory> {
  return prisma.syncHistory.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      status: SyncStatus.RUNNING,
      triggeredBy: input.triggeredBy,
      userId: input.userId,
      corporateCardId: input.corporateCardId,
      fileName: input.fileName,
    },
  });
}

/**
 * SyncHistory를 완료 상태로 업데이트합니다.
 * completedAt은 항상 현재 시각으로 설정됩니다.
 */
export async function completeSyncHistory(
  syncHistoryId: string,
  result: CompleteSyncHistoryResult
): Promise<SyncHistory> {
  return prisma.syncHistory.update({
    where: { id: syncHistoryId },
    data: {
      status: result.status as SyncStatus,
      totalRecords: result.totalRecords,
      successCount: result.successCount,
      failedCount: result.failedCount,
      matchedCount: result.matchedCount,
      unmatchedCount: result.unmatchedCount,
      errorMessage: result.errorMessage,
      errorDetails: result.errorDetails
        ? (result.errorDetails as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      completedAt: new Date(),
    },
  });
}

/**
 * 법인카드의 consecutiveFailCount를 업데이트합니다.
 * success=true: 0으로 초기화
 * success=false: 1 증가
 */
export async function updateCardFailCount(
  cardId: string,
  success: boolean
): Promise<{ consecutiveFailCount: number }> {
  return prisma.corporateCard.update({
    where: { id: cardId },
    data: {
      consecutiveFailCount: success ? 0 : { increment: 1 },
    },
    select: { consecutiveFailCount: true },
  });
}

/**
 * SyncHistory 목록을 페이지네이션하여 조회합니다.
 * 기본값: limit=20, offset=0, startedAt 내림차순 정렬
 */
export async function getSyncHistories(
  filters: GetSyncHistoriesFilters
): Promise<{ data: SyncHistory[]; total: number }> {
  const {
    organizationId,
    corporateCardId,
    type,
    limit = 20,
    offset = 0,
  } = filters;

  const where = {
    organizationId,
    ...(corporateCardId !== undefined && { corporateCardId }),
    ...(type !== undefined && { type }),
  };

  const [data, total] = await Promise.all([
    prisma.syncHistory.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { startedAt: "desc" },
    }),
    prisma.syncHistory.count({ where }),
  ]);

  return { data, total };
}
