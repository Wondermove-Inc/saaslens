// src/lib/services/payment/rematch-service.ts
/**
 * 벌크 재매칭 서비스
 * - PaymentRecord / CardTransaction의 UNMATCHED/PENDING 레코드를 재매칭
 * - 동시 실행 방지를 위한 SyncHistory 기반 잠금 사용
 */

import { prisma } from "@/lib/db";
import {
  completeSyncHistory,
  createSyncHistory,
} from "@/lib/services/payment/sync-history-service";
import {
  loadMatchingContext,
  loadNonSaaSSet,
  loadRecords,
  matchRecord,
  persistMatchOutcome,
} from "./rematch-service.helpers";

export interface RematchOptions {
  organizationId: string;
  userId: string;
  recordType: "payment" | "card-transaction";
  recordIds: string[];
  batchSize?: number;
}

export interface RematchResult {
  syncHistoryId: string;
  totalProcessed: number;
  matchedCount: number;
  unmatchedCount: number;
  skippedCount: number;
  errors: Array<{ recordId: string; error: string }>;
}

const STALE_LOCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * 동시 실행 잠금 확인
 * 최근 10분 이내의 RUNNING 항목이 있으면 에러
 */
async function checkConcurrencyLock(organizationId: string): Promise<void> {
  const running = await prisma.syncHistory.findFirst({
    where: {
      organizationId,
      type: "REMATCH",
      status: "RUNNING",
    },
    orderBy: { startedAt: "desc" },
  });

  if (!running) return;

  const age = Date.now() - running.startedAt.getTime();
  if (age < STALE_LOCK_THRESHOLD_MS) {
    throw new Error("재매칭이 이미 진행 중입니다");
  }
  // Stale lock (>10 min) → override and continue
}

/**
 * 벌크 재매칭 실행
 */
export async function rematchRecords(
  options: RematchOptions
): Promise<RematchResult> {
  const {
    organizationId,
    userId,
    recordType,
    recordIds,
    batchSize = 50,
  } = options;

  // Concurrency check
  await checkConcurrencyLock(organizationId);

  // Create SyncHistory (RUNNING)
  const syncHistory = await createSyncHistory({
    organizationId,
    type: "REMATCH" as never,
    triggeredBy: "USER",
    userId,
  });

  const result: RematchResult = {
    syncHistoryId: syncHistory.id,
    totalProcessed: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  try {
    // Load records and matching context
    const records = await loadRecords(recordType, recordIds, organizationId);
    result.totalProcessed = records.length;

    const { apps, catalogs } = await loadMatchingContext(organizationId);
    const nonSaaSSet = await loadNonSaaSSet(organizationId, records);

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        // Skip MANUAL and AUTO_MATCHED (idempotent)
        if (
          record.matchStatus === "MANUAL" ||
          record.matchStatus === "AUTO_MATCHED"
        ) {
          result.skippedCount++;
          continue;
        }

        try {
          const outcome = await matchRecord(
            record,
            organizationId,
            userId,
            apps,
            catalogs,
            nonSaaSSet
          );

          await persistMatchOutcome(record.id, recordType, outcome);

          if (outcome.matchedAppId) {
            result.matchedCount++;
          } else {
            result.unmatchedCount++;
          }
        } catch (err) {
          result.errors.push({
            recordId: record.id,
            error: err instanceof Error ? err.message : String(err),
          });
          result.unmatchedCount++;
        }
      }
    }

    const processedActive = result.totalProcessed - result.skippedCount;
    const finalStatus =
      result.errors.length > 0 && result.errors.length === processedActive
        ? "FAILED"
        : result.errors.length > 0
          ? "PARTIAL"
          : "SUCCESS";

    await completeSyncHistory(syncHistory.id, {
      status: finalStatus,
      totalRecords: result.totalProcessed,
      matchedCount: result.matchedCount,
      unmatchedCount: result.unmatchedCount,
      successCount: result.matchedCount,
      failedCount: result.errors.length,
    });

    return result;
  } catch (err) {
    await completeSyncHistory(syncHistory.id, {
      status: "FAILED",
      totalRecords: result.totalProcessed,
      matchedCount: result.matchedCount,
      unmatchedCount: result.unmatchedCount,
      successCount: result.matchedCount,
      failedCount: result.errors.length,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
