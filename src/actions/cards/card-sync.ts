"use server";

import { getCachedSession } from "@/lib/auth/require-auth";
import { decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import {
  getCardApprovals,
  getLastNDaysRange,
  withRetry,
  type ApprovalItem,
  type CardCompanyCode,
  type CardCredentials,
} from "@/lib/services/hyphen";
import {
  matchMerchant4LayerSync,
  normalizeMerchantName,
  type AppMatch,
  type CatalogWithPatterns,
} from "@/lib/services/payment/merchant-matcher";
import { findActiveSubscriptionForApp } from "@/lib/services/payment/subscription-auto-link";
import {
  completeSyncHistory,
  createSyncHistory,
  updateCardFailCount,
} from "@/lib/services/payment/sync-history-service";
import {
  checkNonSaaSCache,
  findNonSaaSKeywordHit,
  matchMerchantWithLLM,
  saveNonSaaSVendors,
  type MatchSource,
} from "@/lib/services/saas-matcher";
import type { ActionState } from "@/types";
import type { CardTransactionType, CorporateCard } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ==================== 거래내역 동기화 ====================

/**
 * 카드 거래내역 동기화 (수동) - 4-Layer 매칭 파이프라인
 * 1. 4-Layer 매칭 (카탈로그/정확/부분/퍼지) - CSV/cron과 동일
 * 2. Non-SaaS 캐시 필터링
 * 3. 개별 LLM 호출 (1건씩) - CSV/cron과 동일
 */
async function _syncCardTransactions(
  cardId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    triggeredBy?: "USER" | "CRON" | "RETRY";
  }
): Promise<
  ActionState<{ created: number; updated: number; syncHistoryId?: string }>
> {
  // syncHistoryId는 에러 핸들러에서도 접근 가능해야 하므로 외부에 선언
  let syncHistoryId: string | undefined;

  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }

    const organizationId = session.user.organizationId;

    // SyncHistory 생성 (보조 기능, 실패해도 메인 흐름에 영향 없음)
    try {
      const syncHistory = await createSyncHistory({
        organizationId,
        type: "CARD_SYNC",
        triggeredBy: options?.triggeredBy ?? "USER",
        userId: session.user.id,
        corporateCardId: cardId,
      });
      syncHistoryId = syncHistory.id;
    } catch (syncHistoryError) {
      logger.warn({ err: syncHistoryError }, "SyncHistory 생성 실패 (무시)");
    }

    // 카드 정보 조회
    const card = await prisma.corporateCard.findFirst({
      where: {
        id: cardId,
        organizationId,
        isActive: true,
      },
    });

    if (!card) {
      return { success: false, message: "카드를 찾을 수 없습니다" };
    }

    // 인증 정보 복호화
    const credentials = decryptJson<CardCredentials>(card.encryptedCredentials);

    // 조회 기간 설정 (기본: 최근 30일)
    const { sdate, edate } =
      options?.startDate && options?.endDate
        ? { sdate: options.startDate, edate: options.endDate }
        : getLastNDaysRange(30);

    // 앱 목록 조회 (매칭용, catalogId 포함)
    const apps: AppMatch[] = await prisma.app.findMany({
      where: { organizationId },
      select: { id: true, name: true, catalogId: true },
    });

    // SaaS 카탈로그 데이터 로딩 (4-layer 매칭용)
    const catalogsRaw = await prisma.saaSCatalog.findMany({
      include: { patterns: true },
    });
    const catalogs: CatalogWithPatterns[] = catalogsRaw.map((catalog) => ({
      id: catalog.id,
      name: catalog.name,
      slug: catalog.slug,
      patterns: catalog.patterns.map((p) => ({
        pattern: p.pattern,
        matchType: p.matchType as "EXACT" | "DOMAIN" | "SUBDOMAIN" | "REGEX",
        confidence: p.confidence,
      })),
    }));

    // 커스텀 매칭 패턴 조회
    const merchantPatterns = await prisma.merchantPattern.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        pattern: true,
        appId: true,
      },
    });

    const customPatterns = merchantPatterns.map((p) => ({
      pattern: p.pattern,
      appId: p.appId,
    }));

    let created = 0;
    let updated = 0;

    // 승인내역 수집
    const approvalTransactions: Array<{
      item: ApprovalItem;
      transactionType: CardTransactionType;
    }> = [];

    // 승인내역 조회
    try {
      const approvalResponse = await withRetry(() =>
        getCardApprovals(
          {
            cardCd: card.cardCd as CardCompanyCode,
            cardNo: credentials.cardNo,
            sdate,
            edate,
            useArea: "D",
          },
          credentials
        )
      );
      for (const item of approvalResponse.data.list) {
        approvalTransactions.push({ item, transactionType: "APPROVAL" });
      }
    } catch (error) {
      logger.error({ err: error }, "승인내역 조회 실패");
    }

    // 취소 거래 분리 (매칭 없이 저장)
    const cancelledTransactions: typeof approvalTransactions = [];
    const activeTransactions: typeof approvalTransactions = [];

    for (const tx of approvalTransactions) {
      if (tx.item.useDiv && tx.item.useDiv.includes("취소")) {
        cancelledTransactions.push(tx);
      } else {
        activeTransactions.push(tx);
      }
    }

    // Phase 1: 4-Layer 매칭 (카탈로그/정확/부분/퍼지) - CSV/cron과 동일
    const matched: Array<{
      item: ApprovalItem;
      transactionType: CardTransactionType;
      matchResult: { appId: string | null; confidence: number };
      matchSource: MatchSource;
    }> = [];

    const unmatched: Array<{
      item: ApprovalItem;
      transactionType: CardTransactionType;
    }> = [];

    for (const tx of activeTransactions) {
      // 커스텀 패턴 우선 체크 (조직별 사용자 정의 패턴)
      const customHit = customPatterns.find((p) =>
        tx.item.useStore.toLowerCase().includes(p.pattern.toLowerCase())
      );
      if (customHit) {
        matched.push({
          ...tx,
          matchResult: { appId: customHit.appId, confidence: 1 },
          matchSource: "PATTERN",
        });
        continue;
      }

      // 4-Layer 동기 매칭 (패턴/부분/퍼지)
      const fourLayerResult = matchMerchant4LayerSync(
        { merchantName: tx.item.useStore, memo: tx.item.useDiv },
        apps,
        catalogs,
        0.8
      );

      if (fourLayerResult?.appId) {
        matched.push({
          ...tx,
          matchResult: {
            appId: fourLayerResult.appId,
            confidence: fourLayerResult.confidence,
          },
          matchSource: fourLayerResult.matchSource,
        });
      } else {
        unmatched.push(tx);
      }
    }

    // Phase 2: Non-SaaS 캐시 필터링
    const normalizedNames = unmatched.map((tx) =>
      normalizeMerchantName(tx.item.useStore)
    );
    const nonSaaSCache = await checkNonSaaSCache(
      organizationId,
      normalizedNames
    );

    const needsLLM: typeof unmatched = [];
    const cachedNonSaaS: typeof unmatched = [];
    const keywordNonSaaS: typeof unmatched = [];
    const keywordNonSaaSVendors: Array<{
      normalizedName: string;
      originalName: string;
      confidence: number;
      reasoning?: string;
    }> = [];

    for (const tx of unmatched) {
      const normalized = normalizeMerchantName(tx.item.useStore);
      if (nonSaaSCache.has(normalized)) {
        cachedNonSaaS.push(tx);
        continue;
      }

      const keywordHit = findNonSaaSKeywordHit(
        tx.item.useStore,
        tx.item.useDiv || null
      );
      if (keywordHit) {
        keywordNonSaaS.push(tx);
        keywordNonSaaSVendors.push({
          normalizedName: normalized,
          originalName: tx.item.useStore,
          confidence: 1,
          reasoning: `키워드 제외: ${keywordHit}`,
        });
      } else {
        needsLLM.push(tx);
      }
    }

    if (keywordNonSaaSVendors.length > 0) {
      await saveNonSaaSVendors(organizationId, keywordNonSaaSVendors);
    }

    console.log(
      `[Sync] 승인 ${approvalTransactions.length}건 (활성 ${activeTransactions.length}건, 취소 ${cancelledTransactions.length}건) - 4-Layer매칭 ${matched.length}건, NonSaaS캐시 ${cachedNonSaaS.length}건, 키워드제외 ${keywordNonSaaS.length}건, LLM필요 ${needsLLM.length}건`
    );

    // Phase 3: 개별 LLM 호출 (1건씩) - CSV/cron과 동일
    const llmResultsMap = new Map<
      string,
      { appId: string | null; confidence: number; matchSource: MatchSource }
    >();

    for (const tx of needsLLM) {
      const key = `${tx.item.apprNo}_${tx.item.useDt}`;
      const llmMatch = await matchMerchantWithLLM({
        organizationId,
        merchantName: tx.item.useStore,
        memo: tx.item.useDiv || null,
        storeBizNo: tx.item.storeBizNo || null,
        amount: parseFloat(tx.item.useAmt) || null,
        currency: "KRW",
      });
      llmResultsMap.set(key, {
        appId: llmMatch.appId,
        confidence: llmMatch.confidence,
        matchSource: llmMatch.matchSource,
      });
    }

    // Phase 4: 모든 트랜잭션 저장
    for (const tx of matched) {
      const result = await saveTransactionDirect(
        card,
        tx.item,
        tx.transactionType,
        organizationId,
        tx.matchResult.appId,
        tx.matchResult.confidence,
        tx.matchSource
      );
      if (result === "created") created++;
      else if (result === "updated") updated++;
    }

    const nonSaaSResolved = [...cachedNonSaaS, ...keywordNonSaaS];
    for (const tx of nonSaaSResolved) {
      const result = await saveTransactionDirect(
        card,
        tx.item,
        tx.transactionType,
        organizationId,
        null,
        0,
        null,
        "UNMATCHED"
      );
      if (result === "created") created++;
      else if (result === "updated") updated++;
    }

    for (const tx of needsLLM) {
      const key = `${tx.item.apprNo}_${tx.item.useDt}`;
      const llmResult = llmResultsMap.get(key);
      const llmAppId = llmResult?.appId || null;
      // 파이프라인 완료 후 appId가 없으면 UNMATCHED
      const llmMatchStatus = llmAppId ? "AUTO_MATCHED" : "UNMATCHED";
      const result = await saveTransactionDirect(
        card,
        tx.item,
        tx.transactionType,
        organizationId,
        llmAppId,
        llmResult?.confidence || 0,
        llmResult?.matchSource || "LLM",
        llmMatchStatus
      );
      if (result === "created") created++;
      else if (result === "updated") updated++;
    }

    // 취소 거래 저장 (매칭 없이)
    for (const tx of cancelledTransactions) {
      const result = await saveTransactionDirect(
        card,
        tx.item,
        tx.transactionType,
        organizationId,
        null,
        0,
        null
      );
      if (result === "created") created++;
      else if (result === "updated") updated++;
    }

    // 카드 동기화 시간 업데이트
    await prisma.corporateCard.update({
      where: { id: cardId },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
      },
    });

    // SMP-123: 동기화 감사 로그 기록
    if (created > 0 || updated > 0) {
      await prisma.auditLog.create({
        data: {
          action: "SYNC_CARD_TRANSACTIONS",
          entityType: "CorporateCard",
          entityId: cardId,
          userId: session.user.id,
          organizationId,
          metadata: {
            cardNo: card.cardNo,
            cardNm: card.cardNm,
            created,
            updated,
            matchedCount: matched.length,
            unmatchedCount: needsLLM.length + nonSaaSResolved.length,
            dateRange: { sdate, edate },
          },
        },
      });
    }

    revalidatePath("/payments/cards");
    revalidatePath(`/payments/cards/${cardId}`);
    revalidatePath("/payments"); // SMP-123: 결제 내역 페이지도 갱신

    const totalRecords = created + updated;
    const matchedCount = matched.length;
    const unmatchedCount =
      needsLLM.length + nonSaaSResolved.length + cancelledTransactions.length;
    const failedCount = 0;

    // SyncHistory 완료 처리 (보조 기능)
    try {
      if (syncHistoryId) {
        await completeSyncHistory(syncHistoryId, {
          status: failedCount > 0 ? "PARTIAL" : "SUCCESS",
          totalRecords,
          successCount: totalRecords,
          failedCount,
          matchedCount,
          unmatchedCount,
        });
      }
      await updateCardFailCount(cardId, true);
    } catch (syncHistoryError) {
      logger.warn(
        { err: syncHistoryError },
        "SyncHistory 완료 처리 실패 (무시)"
      );
    }

    return { success: true, data: { created, updated, syncHistoryId } };
  } catch (error) {
    logger.error({ err: error }, "거래내역 동기화 실패");

    await prisma.corporateCard.update({
      where: { id: cardId },
      data: {
        lastError: error instanceof Error ? error.message : "알 수 없는 오류",
      },
    });

    // SyncHistory 실패 처리 (보조 기능)
    try {
      if (syncHistoryId) {
        await completeSyncHistory(syncHistoryId, {
          status: "FAILED",
          totalRecords: 0,
          successCount: 0,
          failedCount: 0,
          matchedCount: 0,
          unmatchedCount: 0,
          errorMessage:
            error instanceof Error ? error.message : "알 수 없는 오류",
        });
      }
      await updateCardFailCount(cardId, false);
    } catch (syncHistoryError) {
      logger.warn(
        { err: syncHistoryError },
        "SyncHistory 실패 처리 오류 (무시)"
      );
    }

    return { success: false, message: "거래내역 동기화에 실패했습니다" };
  }
}
export const syncCardTransactions = withLogging(
  "syncCardTransactions",
  _syncCardTransactions
);

/**
 * 거래내역 직접 저장 헬퍼
 * SMP-123: matchStatus, teamId, userId 필드 추가
 */
async function saveTransactionDirect(
  card: CorporateCard,
  item: ApprovalItem,
  transactionType: CardTransactionType,
  organizationId: string,
  matchedAppId: string | null,
  matchConfidence: number | null,
  matchSource: MatchSource | null,
  matchStatusOverride?: "PENDING" | "AUTO_MATCHED" | "UNMATCHED"
): Promise<"created" | "updated"> {
  // matchStatus 결정: override가 있으면 사용, 없으면 appId 기반 자동 결정
  const matchStatus: "PENDING" | "AUTO_MATCHED" | "UNMATCHED" =
    matchStatusOverride ?? (matchedAppId ? "AUTO_MATCHED" : "PENDING");

  // SMP-179: 매칭된 앱의 ACTIVE 구독 자동 연결
  const linkedSubscriptionId = await findActiveSubscriptionForApp(
    matchedAppId,
    organizationId
  );

  const transactionData: Prisma.CardTransactionUncheckedCreateInput = {
    corporateCardId: card.id,
    organizationId,
    apprNo: item.apprNo,
    useDt: item.useDt,
    useTm: item.useTm || null,
    useStore: item.useStore,
    useAmt: new Prisma.Decimal(parseFloat(item.useAmt) || 0),
    pchDt: null,
    pchNo: null,
    settleDt: item.settleDt || null,
    storeBizNo: item.storeBizNo || null,
    storeType: item.storeType || null,
    storeAddr: item.storeAddr || null,
    useDiv: item.useDiv || null,
    instMon: item.instMon || null,
    addTax: item.addTax ? new Prisma.Decimal(parseFloat(item.addTax)) : null,
    matchedAppId,
    matchConfidence: matchConfidence || null,
    matchSource: matchSource || null,
    matchStatus, // SMP-123: matchStatus 필드 추가
    linkedSubscriptionId, // SMP-179: 구독 자동 연결
    // SMP-123: CorporateCard에서 Team/User 배정 상속
    teamId: card.teamId || null,
    userId: card.assignedUserId || null,
    transactionType,
  };

  const existing = await prisma.cardTransaction.findUnique({
    where: {
      corporateCardId_apprNo_useDt: {
        corporateCardId: card.id,
        apprNo: item.apprNo,
        useDt: item.useDt,
      },
    },
  });

  if (existing) {
    // SMP-123: 기존 레코드의 matchStatus가 AUTO_MATCHED/MANUAL이면 matchStatus 유지
    const shouldPreserveMatchStatus =
      existing.matchStatus === "AUTO_MATCHED" ||
      existing.matchStatus === "MANUAL";

    await prisma.cardTransaction.update({
      where: { id: existing.id },
      data: {
        ...transactionData,
        // 기존에 자동/수동 매칭된 상태면 matchStatus 유지
        matchStatus: shouldPreserveMatchStatus
          ? existing.matchStatus
          : transactionData.matchStatus,
        // 기존에 수동 확인된 매칭이면 matchedAppId 유지
        matchedAppId: shouldPreserveMatchStatus
          ? existing.matchedAppId
          : transactionData.matchedAppId,
        // SMP-179: 기존에 자동/수동 매칭된 상태면 linkedSubscriptionId 보존
        linkedSubscriptionId: shouldPreserveMatchStatus
          ? existing.linkedSubscriptionId
          : transactionData.linkedSubscriptionId,
      },
    });
    return "updated";
  }

  await prisma.cardTransaction.create({
    data: transactionData,
  });
  return "created";
}
