"use server";

import { getCachedSession } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { normalizeMerchantName } from "@/lib/services/payment/merchant-matcher";
import {
  checkNonSaaSCache,
  removeFromNonSaaSCache,
} from "@/lib/services/saas-matcher";
import type { ActionState } from "@/types";
import type { CardTransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ==================== 거래내역 조회 ====================

export type TransactionFilter = "saas" | "unmatched" | "non-saas" | "all";

export interface TransactionQuery {
  cardId?: string;
  startDate?: string;
  endDate?: string;
  matchStatus?: "matched" | "unmatched" | "all"; // deprecated, use filter
  filter?: TransactionFilter;
  page?: number;
  pageSize?: number;
}

export interface TransactionListResult {
  transactions: Array<{
    id: string;
    useDt: string;
    useTm: string | null;
    useStore: string;
    useAmt: number;
    transactionType: CardTransactionType;
    matchedApp: { id: string; name: string } | null;
    matchConfidence: number | null;
    corporateCard: { cardNm: string | null; cardLast4: string | null };
  }>;
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 거래내역 조회
 * filter: saas | non-saas | unmatched | all
 */
export async function getCardTransactions(
  query: TransactionQuery
): Promise<TransactionListResult> {
  const session = await getCachedSession();
  if (!session?.user?.organizationId) {
    return { transactions: [], total: 0, page: 1, pageSize: 20 };
  }

  const organizationId = session.user.organizationId;
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const filter = query.filter || "all";

  // 기본 where 조건
  const baseWhere: {
    organizationId: string;
    corporateCardId?: string;
    useDt?: { gte?: string; lte?: string };
    matchedAppId?: { not: null } | null;
  } = {
    organizationId,
  };

  if (query.cardId) {
    baseWhere.corporateCardId = query.cardId;
  }

  if (query.startDate) {
    baseWhere.useDt = { ...baseWhere.useDt, gte: query.startDate };
  }

  if (query.endDate) {
    baseWhere.useDt = { ...baseWhere.useDt, lte: query.endDate };
  }

  // 레거시 matchStatus 지원 (deprecated)
  if (query.matchStatus === "matched") {
    baseWhere.matchedAppId = { not: null };
  } else if (query.matchStatus === "unmatched") {
    baseWhere.matchedAppId = null;
  }

  // Non-SaaS 또는 Unmatched 필터인 경우 특별 처리 필요
  if (filter === "non-saas" || filter === "unmatched") {
    baseWhere.matchedAppId = null;

    const unmatchedTransactions = await prisma.cardTransaction.findMany({
      where: baseWhere,
      include: {
        matchedApp: { select: { id: true, name: true } },
        corporateCard: { select: { cardNm: true, cardLast4: true } },
      },
      orderBy: [{ useDt: "desc" }, { useTm: "desc" }],
    });

    const normalizedNames = unmatchedTransactions.map((t) =>
      normalizeMerchantName(t.useStore)
    );
    const nonSaaSSet = await checkNonSaaSCache(organizationId, normalizedNames);

    const filteredTransactions = unmatchedTransactions.filter((t) => {
      const normalized = normalizeMerchantName(t.useStore);
      const isNonSaaS = nonSaaSSet.has(normalized);
      return filter === "non-saas" ? isNonSaaS : !isNonSaaS;
    });

    const total = filteredTransactions.length;
    const paginatedTransactions = filteredTransactions.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    return {
      transactions: paginatedTransactions.map((t) => ({
        id: t.id,
        useDt: t.useDt,
        useTm: t.useTm,
        useStore: t.useStore,
        useAmt: Number(t.useAmt),
        transactionType: t.transactionType,
        matchedApp: t.matchedApp,
        matchConfidence: t.matchConfidence,
        corporateCard: t.corporateCard,
      })),
      total,
      page,
      pageSize,
    };
  }

  // SaaS 필터
  if (filter === "saas") {
    baseWhere.matchedAppId = { not: null };
  }

  const [transactions, total] = await Promise.all([
    prisma.cardTransaction.findMany({
      where: baseWhere,
      include: {
        matchedApp: {
          select: { id: true, name: true },
        },
        corporateCard: {
          select: { cardNm: true, cardLast4: true },
        },
      },
      orderBy: [{ useDt: "desc" }, { useTm: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cardTransaction.count({ where: baseWhere }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      useDt: t.useDt,
      useTm: t.useTm,
      useStore: t.useStore,
      useAmt: Number(t.useAmt),
      transactionType: t.transactionType,
      matchedApp: t.matchedApp,
      matchConfidence: t.matchConfidence,
      corporateCard: t.corporateCard,
    })),
    total,
    page,
    pageSize,
  };
}

// ==================== 거래-앱 수동 매칭 ====================

/**
 * 거래내역을 앱에 수동 매칭
 */
async function _matchTransactionToAppManually(
  transactionId: string,
  appId: string | null
): Promise<ActionState> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }

    const organizationId = session.user.organizationId;

    const transaction = await prisma.cardTransaction.findFirst({
      where: {
        id: transactionId,
        organizationId,
      },
    });

    if (!transaction) {
      return { success: false, message: "거래내역을 찾을 수 없습니다" };
    }

    if (appId) {
      const app = await prisma.app.findFirst({
        where: {
          id: appId,
          organizationId,
        },
      });

      if (!app) {
        return { success: false, message: "앱을 찾을 수 없습니다" };
      }

      // 사용자가 수동으로 SaaS로 매칭 시 Non-SaaS 캐시에서 제거
      const normalized = normalizeMerchantName(transaction.useStore);
      await removeFromNonSaaSCache(organizationId, normalized);
    }

    await prisma.cardTransaction.update({
      where: { id: transactionId },
      data: {
        matchedAppId: appId,
        matchConfidence: appId ? 1.0 : null,
        matchSource: appId ? "MANUAL" : null,
      },
    });

    revalidatePath("/transactions");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "거래 매칭 실패");
    return { success: false, message: "거래 매칭에 실패했습니다" };
  }
}
export const matchTransactionToAppManually = withLogging(
  "matchTransactionToAppManually",
  _matchTransactionToAppManually
);
