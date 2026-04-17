/**
 * 법인카드 거래내역 자동 동기화 Cron Job
 *
 * - 매일 새벽 3시 실행 (Vercel Cron)
 * - 모든 활성 카드의 최근 30일 승인내역 수집
 * - SaaS 매칭 자동 실행 (승인건 대상, 취소 거래 제외)
 * - Vercel 60초 한도 대비 55초에서 조기 종료
 */

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
import type { AppForMatching } from "@/lib/services/hyphen/matcher";
import {
  matchMerchant4LayerSync,
  type AppMatch,
  type CatalogWithPatterns,
} from "@/lib/services/payment/merchant-matcher";
import {
  completeSyncHistory,
  createSyncHistory,
  updateCardFailCount,
} from "@/lib/services/payment/sync-history-service";
import {
  findNonSaaSKeywordHit,
  matchMerchantWithLLM,
  type MatchSource,
} from "@/lib/services/saas-matcher";
import type { CardTransactionType, CorporateCard } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Vercel 함수 한도(60s) 대비 안전 마진
const MAX_DURATION_MS = 55_000;

/** 동기화 결과 */
interface SyncResult {
  cardId: string;
  cardLast4: string | null;
  organizationId: string;
  created: number;
  updated: number;
  error?: string;
}

/**
 * 카탈로그 조회 (조직과 무관하게 전역 카탈로그 사용)
 */
async function getCatalogsWithPatterns(): Promise<CatalogWithPatterns[]> {
  const catalogs = await prisma.saaSCatalog.findMany({
    include: {
      patterns: true,
    },
  });

  return catalogs.map((catalog) => ({
    id: catalog.id,
    name: catalog.name,
    slug: catalog.slug,
    patterns: catalog.patterns.map((p) => ({
      pattern: p.pattern,
      matchType: p.matchType as "EXACT" | "DOMAIN" | "SUBDOMAIN" | "REGEX",
      confidence: p.confidence,
    })),
  }));
}

/**
 * 카드별 거래내역 동기화
 */
async function syncCardTransactions(
  card: CorporateCard,
  apps: AppForMatching[],
  catalogs: CatalogWithPatterns[]
): Promise<SyncResult> {
  const result: SyncResult = {
    cardId: card.id,
    cardLast4: card.cardLast4,
    organizationId: card.organizationId,
    created: 0,
    updated: 0,
  };

  // SyncHistory ID: 에러 핸들러에서도 접근 가능해야 하므로 외부에 선언
  let syncHistoryId: string | undefined;

  try {
    // SyncHistory 생성 (보조 기능, 실패해도 메인 흐름에 영향 없음)
    try {
      const syncHistory = await createSyncHistory({
        organizationId: card.organizationId,
        type: "CARD_SYNC",
        triggeredBy: "CRON",
        corporateCardId: card.id,
      });
      syncHistoryId = syncHistory.id;
    } catch (syncHistoryError) {
      logger.warn(
        { err: syncHistoryError, cardLast4: card.cardLast4 },
        "[Cron] SyncHistory 생성 실패 (무시)"
      );
    }

    // 인증 정보 복호화
    const credentials = decryptJson<CardCredentials>(card.encryptedCredentials);

    // 조회 기간 (최근 30일)
    const { sdate, edate } = getLastNDaysRange(30);

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
        const saveResult = await saveTransaction(
          card,
          item,
          "APPROVAL",
          apps,
          catalogs
        );
        if (saveResult === "created") result.created++;
        else if (saveResult === "updated") result.updated++;
      }
    } catch (error) {
      logger.error(
        { err: error, cardLast4: card.cardLast4 },
        "[Cron] 승인내역 조회 실패"
      );
    }

    // 동기화 시간 업데이트
    await prisma.corporateCard.update({
      where: { id: card.id },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
      },
    });

    // SyncHistory 완료 처리 (보조 기능)
    try {
      if (syncHistoryId) {
        const totalRecords = result.created + result.updated;
        await completeSyncHistory(syncHistoryId, {
          status: "SUCCESS",
          totalRecords,
          successCount: totalRecords,
          failedCount: 0,
          matchedCount: result.created + result.updated,
          unmatchedCount: 0,
        });
      }
      await updateCardFailCount(card.id, true);
    } catch (syncHistoryError) {
      logger.warn(
        { err: syncHistoryError, cardLast4: card.cardLast4 },
        "[Cron] SyncHistory 완료 처리 실패 (무시)"
      );
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : "알 수 없는 오류";

    // 에러 기록
    await prisma.corporateCard.update({
      where: { id: card.id },
      data: {
        lastError: result.error,
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
          errorMessage: result.error,
        });
      }
      await updateCardFailCount(card.id, false);
    } catch (syncHistoryError) {
      logger.warn(
        { err: syncHistoryError, cardLast4: card.cardLast4 },
        "[Cron] SyncHistory 실패 처리 오류 (무시)"
      );
    }
  }

  return result;
}

/**
 * 거래내역 저장 (4-Layer 매칭 파이프라인 적용)
 */
async function saveTransaction(
  card: CorporateCard,
  item: ApprovalItem,
  transactionType: CardTransactionType,
  apps: AppForMatching[],
  catalogs: CatalogWithPatterns[]
): Promise<"created" | "updated" | "skipped"> {
  const merchantName = item.useStore;

  // 취소 거래는 매칭 없이 저장만 수행
  if (item.useDiv && item.useDiv.includes("취소")) {
    const transactionData = buildTransactionData(
      item,
      null,
      null,
      null,
      transactionType
    );
    return await upsertTransaction(card, item, transactionData);
  }

  // 0. Non-SaaS 키워드 필터 (카카오T, 우아한형제들 등)
  const nonSaaSHit = findNonSaaSKeywordHit(merchantName, item.useDiv);
  if (nonSaaSHit) {
    // Non-SaaS로 확정 → 매칭 스킵, UNMATCHED로 표시 (거래는 저장)
    const transactionData = buildTransactionData(
      item,
      null,
      0,
      null,
      transactionType,
      "UNMATCHED"
    );
    return await upsertTransaction(card, item, transactionData);
  }

  // AppMatch 형식으로 변환 (catalogId 포함)
  const appsWithCatalog: AppMatch[] = apps.map((app) => ({
    id: app.id,
    name: app.name,
    catalogId: (app as AppMatch).catalogId || null,
  }));

  // 1~3차: 4-Layer 동기 매칭 (패턴/부분/퍼지)
  const fourLayerResult = matchMerchant4LayerSync(
    { merchantName, memo: item.useDiv },
    appsWithCatalog,
    catalogs,
    0.8 // 퍼지 매칭 임계값
  );

  let matchedAppId = fourLayerResult?.appId || null;
  let matchConfidence = fourLayerResult?.confidence || 0;
  let matchSource: MatchSource = fourLayerResult?.matchSource || null;

  // 4차: LLM 폴백 (appId가 없으면 항상 실행)
  // Note: Layer 1-3에서 SaaS로 인식되었지만 기존 앱이 없는 경우도 LLM 폴백 실행
  if (!matchedAppId) {
    const llmMatch = await matchMerchantWithLLM({
      organizationId: card.organizationId,
      merchantName,
      memo: item.useDiv || null,
      storeBizNo: item.storeBizNo || null,
      amount: parseFloat(item.useAmt) || null,
      currency: "KRW",
    });
    matchedAppId = llmMatch.appId;
    matchConfidence = llmMatch.confidence;
    matchSource = llmMatch.matchSource;
  }

  // 파이프라인 완료 후 appId가 없으면 UNMATCHED (Non-SaaS 또는 LLM 미매칭)
  const finalMatchStatus = matchedAppId ? "AUTO_MATCHED" : "UNMATCHED";
  const transactionData = buildTransactionData(
    item,
    matchedAppId,
    matchConfidence,
    matchSource,
    transactionType,
    finalMatchStatus
  );

  return await upsertTransaction(card, item, transactionData);
}

/**
 * 거래 데이터 빌드
 */
function buildTransactionData(
  item: ApprovalItem,
  matchedAppId: string | null,
  matchConfidence: number | null,
  matchSource: MatchSource | null,
  transactionType: CardTransactionType,
  matchStatusOverride?: "PENDING" | "AUTO_MATCHED" | "UNMATCHED"
) {
  // matchStatus 결정: override가 있으면 사용, 없으면 appId 기반 자동 결정
  const matchStatus =
    matchStatusOverride ?? (matchedAppId ? "AUTO_MATCHED" : "PENDING");

  return {
    useDt: item.useDt,
    useTm: item.useTm || null,
    apprNo: item.apprNo,
    useStore: item.useStore,
    useAmt: parseFloat(item.useAmt) || 0,
    pchDt: null,
    pchNo: null,
    settleDt: item.settleDt || null,
    storeBizNo: item.storeBizNo || null,
    storeType: item.storeType || null,
    storeAddr: item.storeAddr || null,
    useDiv: item.useDiv || null,
    instMon: item.instMon || null,
    addTax: item.addTax ? parseFloat(item.addTax) : null,
    matchedAppId,
    matchConfidence: matchConfidence || null,
    matchSource: matchSource || null,
    matchStatus,
    transactionType,
  };
}

/**
 * 거래내역 upsert
 */
async function upsertTransaction(
  card: CorporateCard,
  item: ApprovalItem,
  transactionData: ReturnType<typeof buildTransactionData>
): Promise<"created" | "updated" | "skipped"> {
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
    await prisma.cardTransaction.update({
      where: { id: existing.id },
      data: transactionData,
    });
    return "updated";
  } else {
    await prisma.cardTransaction.create({
      data: {
        corporateCardId: card.id,
        organizationId: card.organizationId,
        ...transactionData,
      },
    });
    return "created";
  }
}

import { withCronAuth } from "@/lib/middleware";

/**
 * Cron Job Handler
 */
export const GET = withCronAuth(
  withLogging("cron:sync-cards", async (request: NextRequest) => {
    logger.info("[Cron] 법인카드 거래내역 동기화 시작");
    const startedAt = Date.now();

    try {
      // 모든 활성 카드 조회
      const cards = await prisma.corporateCard.findMany({
        where: { isActive: true },
      });

      logger.info(`[Cron] 동기화 대상 카드: ${cards.length}개`);

      if (cards.length === 0) {
        return NextResponse.json({
          success: true,
          message: "동기화할 카드가 없습니다",
          results: [],
        });
      }

      // 카탈로그 조회 (전역, 한 번만)
      const catalogs = await getCatalogsWithPatterns();
      logger.info(`[Cron] SaaS 카탈로그 로드: ${catalogs.length}개`);

      // 조직별로 앱 목록 캐시
      const appsByOrg = new Map<string, AppForMatching[]>();

      const results: SyncResult[] = [];

      for (const card of cards) {
        // 남은 시간 체크: 55초를 넘기면 조기 종료
        if (Date.now() - startedAt >= MAX_DURATION_MS) {
          logger.warn(
            "[Cron] 시간 한도에 도달하여 동기화를 중단합니다 (부분 완료)"
          );
          break;
        }

        // 조직의 앱 목록 조회 (캐시, catalogId 포함)
        if (!appsByOrg.has(card.organizationId)) {
          const apps = await prisma.app.findMany({
            where: { organizationId: card.organizationId },
            select: { id: true, name: true, catalogId: true },
          });
          appsByOrg.set(card.organizationId, apps);
        }

        const apps = appsByOrg.get(card.organizationId) || [];

        // 동기화 실행 (4-Layer 파이프라인 적용)
        const result = await syncCardTransactions(card, apps, catalogs);
        results.push(result);

        logger.info(
          `[Cron] 카드 ${card.cardLast4} 동기화 완료: +${result.created}, ~${result.updated}${result.error ? `, 에러: ${result.error}` : ""}`
        );

        // Rate limiting (카드 간 500ms 대기)
        await delay(500);
      }

      // 집계
      const summary = {
        totalCards: cards.length,
        successCards: results.filter((r) => !r.error).length,
        failedCards: results.filter((r) => r.error).length,
        totalCreated: results.reduce((sum, r) => sum + r.created, 0),
        totalUpdated: results.reduce((sum, r) => sum + r.updated, 0),
      };

      logger.info({ summary }, "[Cron] 법인카드 거래내역 동기화 완료");

      return NextResponse.json({
        success: true,
        summary,
        results,
      });
    } catch (error) {
      logger.error({ err: error }, "[Cron] 법인카드 거래내역 동기화 오류");

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        },
        { status: 500 }
      );
    }
  })
);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
