// src/lib/services/payment/process-payment-records.ts
/**
 * 결제 레코드 처리 공용 함수
 * - Server Action(importPaymentCSV)과 SSE API Route(import-stream) 양쪽에서 사용
 */

import type { PaymentCSVRow } from "@/lib/payment-csv";
import {
  matchMerchant4LayerSync,
  type AppMatch,
  type CatalogWithPatterns,
} from "@/lib/services/payment/merchant-matcher";
import { normalizeMerchantName } from "@/lib/services/payment/merchant-matcher.utils";
import {
  matchMerchantWithLLM,
  saveNonSaaSVendors,
} from "@/lib/services/saas-matcher";
import type { MatchSource } from "@prisma/client";
import { findActiveSubscriptionForApp } from "./subscription-auto-link";

// 각 레코드 처리 시 호출되는 프로그레스 콜백
export interface ProcessProgressEvent {
  index: number; // 0-based
  total: number;
  merchantName: string;
  amount: number;
}

export interface ProcessPaymentRecordsInput {
  newRows: PaymentCSVRow[];
  appMatches: AppMatch[];
  catalogsWithPatterns: CatalogWithPatterns[];
  customPatterns: Array<{
    pattern: string;
    matchType: string;
    appId: string;
  }>;
  organizationId: string;
  teamId?: string;
  userId?: string;
  nonSaaSSet: Set<string>;
  batchId: string;
  onProgress?: (event: ProcessProgressEvent) => void | Promise<void>;
}

export interface ProcessPaymentRecordsOutput {
  paymentRecords: Array<Record<string, unknown>>;
  matchedCount: number;
  newNonSaaSVendors: Array<{
    normalizedName: string;
    originalName: string;
    confidence: number;
  }>;
}

/**
 * CSV 레코드 배열을 순서대로 처리하여 결제 레코드를 생성한다.
 * LLM 폴백이 각 레코드마다 호출될 수 있으므로 처리 중 onProgress 콜백을 제공하면
 * 실시간 진행 상황을 전달할 수 있다.
 */
export async function processPaymentRecords(
  input: ProcessPaymentRecordsInput
): Promise<ProcessPaymentRecordsOutput> {
  const {
    newRows,
    appMatches,
    catalogsWithPatterns,
    customPatterns,
    organizationId,
    teamId,
    userId,
    nonSaaSSet,
    batchId,
    onProgress,
  } = input;

  let matchedCount = 0;
  const paymentRecords: Array<Record<string, unknown>> = [];
  const newNonSaaSVendors: Array<{
    normalizedName: string;
    originalName: string;
    confidence: number;
  }> = [];

  for (let i = 0; i < newRows.length; i++) {
    const row = newRows[i];
    const normalizedMerchant = normalizeMerchantName(row.merchantName);

    // 프로그레스 콜백 호출 (LLM 호출 전에 호출하여 현재 처리 중인 레코드를 알림)
    if (onProgress) {
      await onProgress({
        index: i,
        total: newRows.length,
        merchantName: row.merchantName,
        amount: row.amount,
      });
    }

    // 커스텀 패턴 먼저 확인 (정규화 적용)
    let matchResult = null;
    let matchSource: MatchSource | null = null;
    for (const customPattern of customPatterns) {
      const patternNormalized = normalizeMerchantName(customPattern.pattern);

      let isMatch = false;
      if (customPattern.matchType === "EXACT") {
        isMatch = normalizedMerchant === patternNormalized;
      } else if (customPattern.matchType === "CONTAINS") {
        isMatch = normalizedMerchant.includes(patternNormalized);
      }

      if (isMatch) {
        matchResult = {
          appId: customPattern.appId,
          confidence: 1.0,
          matchSource: "PATTERN" as MatchSource,
        };
        matchSource = "PATTERN" as MatchSource;
        break;
      }
    }

    // 커스텀 패턴에서 찾지 못하면 4-Layer 매칭 (LLM 제외)
    if (!matchResult) {
      const catalogMatch = matchMerchant4LayerSync(
        {
          merchantName: row.merchantName,
          memo: row.memo,
          amount: row.amount,
        },
        appMatches,
        catalogsWithPatterns
      );
      if (
        catalogMatch &&
        (catalogMatch.appId ||
          (catalogMatch.appName && catalogMatch.confidence > 0))
      ) {
        matchResult = {
          appId: catalogMatch.appId,
          confidence: catalogMatch.confidence,
          matchSource: catalogMatch.matchSource,
        };
        matchSource = catalogMatch.matchSource;
      }
    }

    // LLM 폴백 (Non-SaaS 캐시에 있으면 스킵)
    if (!matchResult?.appId && !nonSaaSSet.has(normalizedMerchant)) {
      const llmMatch = await matchMerchantWithLLM({
        organizationId,
        merchantName: row.merchantName,
        memo: row.memo || null,
        storeBizNo: null,
        amount: row.amount,
        currency: "KRW",
        teamId: teamId || undefined,
        userId: userId || undefined,
      });
      matchResult = llmMatch;
      matchSource = llmMatch.matchSource || ("LLM" as MatchSource);

      if (!llmMatch.appId && llmMatch.matchSource === "LLM") {
        newNonSaaSVendors.push({
          normalizedName: normalizedMerchant,
          originalName: row.merchantName,
          confidence: llmMatch.confidence || 0,
        });
      }
    }

    if (matchResult?.appId) {
      matchedCount++;
    }

    // SMP-179: 매칭된 앱의 ACTIVE 구독 자동 연결
    const linkedSubscriptionId = await findActiveSubscriptionForApp(
      matchResult?.appId || null,
      organizationId
    );

    paymentRecords.push({
      organizationId,
      transactionDate: row.transactionDate,
      merchantName: row.merchantName,
      amount: row.amount,
      currency: "KRW",
      cardLast4: row.cardLast4 || null,
      approvalNumber: row.approvalNumber || null,
      category: row.category || null,
      memo: row.memo || null,
      matchedAppId: matchResult?.appId || null,
      matchConfidence: matchResult?.confidence || null,
      matchStatus: matchResult?.appId ? "AUTO_MATCHED" : "UNMATCHED",
      matchSource: matchSource,
      linkedSubscriptionId,
      importBatchId: batchId,
      rawData: row.rawData,
      teamId: teamId || null,
      userId: userId || null,
    });
  }

  // Non-SaaS 벤더 캐시 저장
  if (newNonSaaSVendors.length > 0) {
    await saveNonSaaSVendors(organizationId, newNonSaaSVendors);
  }

  return { paymentRecords, matchedCount, newNonSaaSVendors };
}
