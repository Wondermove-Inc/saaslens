// src/lib/services/payment/rematch-service.helpers.ts
/**
 * rematch-service 내부 헬퍼 함수
 * - 레코드 로딩, DB 업데이트, 매칭 컨텍스트 로드
 */

import { prisma } from "@/lib/db";
import {
  matchMerchant4LayerSync,
  type AppMatch,
  type CatalogWithPatterns,
} from "@/lib/services/payment/merchant-matcher";
import {
  checkNonSaaSCache,
  findNonSaaSKeywordHit,
  matchMerchantWithLLM,
} from "@/lib/services/saas-matcher";
import type { PaymentMatchStatus } from "@prisma/client";

export interface RecordToRematch {
  id: string;
  merchantName: string;
  amount: number | { toNumber(): number };
  memo: string | null;
  matchStatus: string;
  matchedAppId: string | null;
}

export interface MatchOutcome {
  matchedAppId: string | null;
  matchConfidence: number | null;
  matchSource: string | null;
}

/**
 * 조직의 매칭 컨텍스트 로드 (앱 목록, 카탈로그+패턴)
 */
export async function loadMatchingContext(organizationId: string): Promise<{
  apps: AppMatch[];
  catalogs: CatalogWithPatterns[];
}> {
  const [apps, catalogs, patterns] = await Promise.all([
    prisma.app.findMany({
      where: { organizationId },
      select: { id: true, name: true, catalogId: true },
    }),
    prisma.saaSCatalog.findMany({
      select: { id: true, name: true, slug: true },
    }),
    prisma.saaSPattern.findMany({
      select: {
        catalogId: true,
        pattern: true,
        matchType: true,
        confidence: true,
      },
    }),
  ]);

  const patternsByCatalog = new Map<
    string,
    Array<{ pattern: string; matchType: string; confidence: number }>
  >();
  for (const p of patterns) {
    if (!patternsByCatalog.has(p.catalogId)) {
      patternsByCatalog.set(p.catalogId, []);
    }
    patternsByCatalog.get(p.catalogId)!.push({
      pattern: p.pattern,
      matchType: p.matchType,
      confidence: p.confidence,
    });
  }

  const catalogsWithPatterns: CatalogWithPatterns[] = catalogs.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    patterns: (patternsByCatalog.get(c.id) ??
      []) as CatalogWithPatterns["patterns"],
  }));

  return { apps: apps as AppMatch[], catalogs: catalogsWithPatterns };
}

/**
 * recordType에 따른 레코드 로딩
 */
export async function loadRecords(
  recordType: "payment" | "card-transaction",
  recordIds: string[],
  organizationId: string
): Promise<RecordToRematch[]> {
  if (recordType === "payment") {
    return (await prisma.paymentRecord.findMany({
      where: { id: { in: recordIds }, organizationId },
      select: {
        id: true,
        merchantName: true,
        amount: true,
        memo: true,
        matchStatus: true,
        matchedAppId: true,
      },
    })) as RecordToRematch[];
  }

  const rows = await prisma.cardTransaction.findMany({
    where: { id: { in: recordIds }, organizationId },
    select: {
      id: true,
      useStore: true,
      useAmt: true,
      matchStatus: true,
      matchedAppId: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    merchantName: r.useStore,
    amount: r.useAmt,
    memo: null,
    matchStatus: r.matchStatus,
    matchedAppId: r.matchedAppId,
  }));
}

/**
 * 가맹점 매칭 수행 (4-Layer → Non-SaaS 필터 → LLM)
 */
export async function matchRecord(
  record: RecordToRematch,
  organizationId: string,
  userId: string,
  apps: AppMatch[],
  catalogs: CatalogWithPatterns[],
  nonSaaSSet: Set<string>
): Promise<MatchOutcome> {
  const amount =
    typeof record.amount === "number"
      ? record.amount
      : record.amount.toNumber();

  const fourLayerResult = matchMerchant4LayerSync(
    {
      merchantName: record.merchantName,
      memo: record.memo ?? undefined,
      amount,
    },
    apps,
    catalogs
  );

  if (fourLayerResult?.appId) {
    return {
      matchedAppId: fourLayerResult.appId,
      matchConfidence: fourLayerResult.confidence,
      matchSource: fourLayerResult.matchSource,
    };
  }

  const keywordHit = findNonSaaSKeywordHit(record.merchantName, record.memo);
  if (keywordHit || nonSaaSSet.has(record.merchantName)) {
    return { matchedAppId: null, matchConfidence: null, matchSource: null };
  }

  const llmResult = await matchMerchantWithLLM({
    organizationId,
    merchantName: record.merchantName,
    memo: record.memo,
    storeBizNo: null,
    amount,
    currency: "KRW",
    userId,
  });

  if (llmResult.appId) {
    return {
      matchedAppId: llmResult.appId,
      matchConfidence: llmResult.confidence,
      matchSource: "LLM",
    };
  }

  return { matchedAppId: null, matchConfidence: null, matchSource: null };
}

/**
 * 매칭 결과로 레코드 DB 업데이트
 */
export async function persistMatchOutcome(
  recordId: string,
  recordType: "payment" | "card-transaction",
  outcome: MatchOutcome
): Promise<void> {
  const newMatchStatus: PaymentMatchStatus = outcome.matchedAppId
    ? "AUTO_MATCHED"
    : "UNMATCHED";

  const data = {
    matchedAppId: outcome.matchedAppId,
    matchConfidence: outcome.matchConfidence,
    matchSource: outcome.matchSource as never,
    matchStatus: newMatchStatus,
  };

  if (recordType === "payment") {
    await prisma.paymentRecord.update({ where: { id: recordId }, data });
  } else {
    await prisma.cardTransaction.update({ where: { id: recordId }, data });
  }
}

/**
 * Non-SaaS 캐시 로드
 */
export async function loadNonSaaSSet(
  organizationId: string,
  records: RecordToRematch[]
): Promise<Set<string>> {
  const merchantNames = records.map((r) => r.merchantName);
  return checkNonSaaSCache(organizationId, merchantNames);
}
