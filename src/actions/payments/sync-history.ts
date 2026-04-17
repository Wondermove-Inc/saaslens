"use server";

import { getCachedSession } from "@/lib/auth/require-auth";
import { getSyncHistories } from "@/lib/services/payment/sync-history-service";
import type { ActionState } from "@/types";
import type { SyncHistory, SyncType } from "@prisma/client";

export interface GetSyncHistoryFilters {
  corporateCardId?: string;
  type?: SyncType;
  page?: number;
  limit?: number;
}

/**
 * 동기화 이력 조회 Server Action
 * organizationId는 세션에서 자동으로 가져옵니다.
 */
export async function getSyncHistory(
  filters: GetSyncHistoryFilters
): Promise<ActionState<{ data: SyncHistory[]; total: number }>> {
  try {
    const session = await getCachedSession();

    if (!session?.user) {
      return { success: false, error: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, error: "조직 정보가 필요합니다" };
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const result = await getSyncHistories({
      organizationId: session.user.organizationId,
      corporateCardId: filters.corporateCardId,
      type: filters.type,
      limit,
      offset,
    });

    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "동기화 이력 조회에 실패했습니다";
    return { success: false, error: message };
  }
}
