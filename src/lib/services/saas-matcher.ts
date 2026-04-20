// src/lib/services/saas-matcher.ts
/**
 * SaaS 매칭 고도화 유틸
 * - LLM 기반 분류 결과를 SaaS 마스터 DB에 적재하고, 바로 매칭에 사용
 */

import { prisma } from "@/lib/db";
import type { MatchResult } from "@/lib/services/hyphen/matcher";
import { normalizeMerchantName } from "@/lib/services/payment/merchant-matcher";
import {
  classifyMerchantWithLLM,
  classifyMerchantsBatchWithLLM,
  type BatchMerchantInput,
  type SaaSInferencePayload,
} from "@/lib/services/saas-classifier";
import { AppSource, AppStatus, MatchType, Prisma } from "@prisma/client";

import { normalizeCategory } from "./category-normalizer";

import type {
  BatchMatchMerchant,
  BatchMatchResult,
  LlmMatchParams,
  MatchSource,
} from "./saas-matcher.types";

// Re-export types and constants for backwards compatibility
export {
  NON_SAAS_KEYWORDS,
  findNonSaaSKeywordHit,
} from "./saas-matcher.constants";
export type {
  BatchMatchMerchant,
  BatchMatchResult,
  MatchSource,
} from "./saas-matcher.types";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function upsertCatalogFromInference(
  organizationId: string,
  inference: SaaSInferencePayload["inference"]
) {
  if (!inference || !inference.canonicalName) return null;

  const slug = toSlug(inference.canonicalName);

  const existing = await prisma.saaSCatalog.findFirst({
    where: { slug },
  });

  const catalog =
    existing ||
    (await prisma.saaSCatalog.create({
      data: {
        name: inference.canonicalName,
        slug,
        category: normalizeCategory(inference.category) || "Uncategorized",
        description: inference.reasoning || null,
        website: inference.website,
        isVerified: false,
        vendorName: inference.canonicalName,
        pricingModel: inference.pricingModel ?? null,
      },
    }));

  // SMP-160: LLM pricingModel → 미검증 카탈로그 업데이트
  if (
    existing &&
    !existing.isVerified &&
    !existing.pricingModel &&
    inference.pricingModel
  ) {
    await prisma.saaSCatalog.update({
      where: { id: existing.id },
      data: { pricingModel: inference.pricingModel },
    });
  }

  // 제안된 패턴을 패턴 테이블에 반영(중복 방지)
  if (inference.suggestedPatterns?.length) {
    const existingPatterns = await prisma.saaSPattern.findMany({
      where: {
        catalogId: catalog.id,
        pattern: { in: inference.suggestedPatterns },
      },
    });
    const existingSet = new Set(existingPatterns.map((p) => p.pattern));
    const newPatterns = inference.suggestedPatterns.filter(
      (p) => !existingSet.has(p)
    );

    if (newPatterns.length > 0) {
      await prisma.saaSPattern.createMany({
        data: newPatterns.map((pattern) => ({
          catalogId: catalog.id,
          pattern,
          matchType: MatchType.DOMAIN,
          confidence: Math.min(1, Math.max(0.5, inference.confidence || 0.7)),
        })),
      });
    }
  }

  return catalog;
}

/**
 * 신뢰도 기반 앱 상태 결정
 * - 80% 이상 (고신뢰): ACTIVE (자동 확정)
 * - 50~80% (중간신뢰): PENDING_REVIEW (사용자 확인 필요)
 * - 50% 미만 (저신뢰): SaaS로 판정되지 않음 (이 함수 호출되지 않음)
 */
function determineAppStatus(confidence: number): AppStatus {
  if (confidence >= 0.8) {
    return AppStatus.ACTIVE;
  }
  return AppStatus.PENDING_REVIEW;
}

async function upsertAppForOrganization(
  organizationId: string,
  catalogId: string | null,
  appName: string,
  confidence: number = 0.5,
  category?: string | null
) {
  const existing = await prisma.app.findFirst({
    where: {
      organizationId,
      name: appName,
    },
  });

  const normalizedCategory = normalizeCategory(category ?? null);

  if (existing) {
    // SMP-162: 기존 앱의 category가 null이면 카탈로그 category로 업데이트
    if (!existing.category && normalizedCategory) {
      await prisma.app.update({
        where: { id: existing.id },
        data: { category: normalizedCategory },
      });
      return { ...existing, category: normalizedCategory };
    }
    return existing;
  }

  const status = determineAppStatus(confidence);

  return prisma.app.create({
    data: {
      organizationId,
      name: appName,
      catalogId,
      status,
      category: normalizedCategory || null,
      source: AppSource.API_SYNC,
    },
  });
}

/**
 * 앱 생성 후 Team 자동 배정 (SMP-107)
 * - teamId가 있으면 해당 팀에 배정
 * - userId만 있으면 User 소속 팀 조회 후 배정
 * - 둘 다 없으면 배정 안 함
 * - 기존 AppTeam 있으면 중복 생성 안 함 (멱등성)
 */
async function ensureAppTeamOnCreation(
  appId: string,
  teamId: string | undefined,
  userId: string | undefined
): Promise<void> {
  let targetTeamId = teamId;

  // userId만 있으면 User 소속 팀 조회
  if (!targetTeamId && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true },
    });
    targetTeamId = user?.teamId ?? undefined;
  }

  if (!targetTeamId) return;

  // 기존 AppTeam 확인 (중복 방지)
  const existing = await prisma.appTeam.findFirst({
    where: { appId, teamId: targetTeamId },
  });
  if (existing) return;

  // AppTeam 생성
  await prisma.appTeam.create({
    data: {
      appId,
      teamId: targetTeamId,
      assignedBy: userId ?? null,
    },
  });
}

async function logInference(params: {
  organizationId: string;
  merchantName: string;
  normalizedName: string;
  payload: SaaSInferencePayload;
  catalogId?: string | null;
  appId?: string | null;
}) {
  const {
    organizationId,
    merchantName,
    normalizedName,
    payload,
    catalogId,
    appId,
  } = params;
  const inference = payload.inference;

  await prisma.vendorInferenceLog.create({
    data: {
      organizationId,
      merchantName,
      normalizedName,
      llmProvider: "openai",
      model: process.env.OPENAI_FAST_MODEL || "gpt-4o-mini",
      confidence: inference?.confidence ?? 0,
      isSaaS: inference?.isSaaS ?? false,
      suggestedName: inference?.canonicalName,
      category: inference?.category,
      website: inference?.website,
      reasoning: inference?.reasoning ?? payload.errorCode ?? null,
      rawResult: inference
        ? (inference as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      promptTokens: payload.usage?.promptTokens,
      completionTokens: payload.usage?.completionTokens,
      totalTokens: payload.usage?.totalTokens,
      errorCode: payload.errorCode,
      catalogId: catalogId || null,
      appId: appId || null,
    },
  });
}

/**
 * LLM 기반 폴백 매칭
 * - 기존 패턴/앱 매칭 실패 시 호출
 * - SaaS로 판단되면 Catalog/App을 생성/연결
 */
export async function matchMerchantWithLLM(
  params: LlmMatchParams
): Promise<MatchResult & { matchSource: MatchSource }> {
  const normalized = normalizeMerchantName(params.merchantName);

  const payload = await classifyMerchantWithLLM({
    merchantName: params.merchantName,
    memo: params.memo,
    storeBizNo: params.storeBizNo,
    amount: params.amount,
    currency: params.currency,
  });
  const inference = payload.inference;

  if (!inference || !inference.isSaaS) {
    await logInference({
      organizationId: params.organizationId,
      merchantName: params.merchantName,
      normalizedName: normalized,
      payload,
    });
    return {
      appId: null,
      appName: null,
      confidence: inference?.confidence ?? 0,
      matchedBy: null,
      matchSource: "LLM",
    };
  }

  // 카탈로그/앱 생성 또는 연결
  const catalog = await upsertCatalogFromInference(
    params.organizationId,
    inference
  );
  const targetName =
    inference.canonicalName ||
    inference.suggestedPatterns?.[0] ||
    params.merchantName;
  const app = await upsertAppForOrganization(
    params.organizationId,
    catalog?.id || null,
    targetName,
    inference.confidence ?? 0.6,
    inference.category
  );

  // SMP-107: 앱 생성 후 Team 자동 배정
  await ensureAppTeamOnCreation(app.id, params.teamId, params.userId);

  await logInference({
    organizationId: params.organizationId,
    merchantName: params.merchantName,
    normalizedName: normalized,
    payload,
    catalogId: catalog?.id,
    appId: app?.id,
  });

  return {
    appId: app.id,
    appName: app.name,
    confidence: inference.confidence ?? 0.6,
    matchedBy: "pattern",
    matchSource: "LLM",
  };
}

// ==================== Non-SaaS 캐시 함수 ====================

/**
 * Non-SaaS 캐시 조회
 * 이미 Non-SaaS로 판정된 가맹점명 집합 반환
 */
export async function checkNonSaaSCache(
  organizationId: string,
  normalizedNames: string[]
): Promise<Set<string>> {
  if (normalizedNames.length === 0) return new Set();

  const cached = await prisma.nonSaaSVendor.findMany({
    where: {
      organizationId,
      normalizedName: { in: normalizedNames },
    },
    select: { normalizedName: true },
  });

  return new Set(cached.map((v) => v.normalizedName));
}

/**
 * Non-SaaS 벤더 저장 (upsert)
 */
export async function saveNonSaaSVendors(
  organizationId: string,
  vendors: Array<{
    normalizedName: string;
    originalName: string;
    confidence: number;
    reasoning?: string;
  }>
): Promise<void> {
  if (vendors.length === 0) return;

  // Prisma createMany는 upsert 지원 안 함 → 개별 upsert
  await Promise.all(
    vendors.map((v) =>
      prisma.nonSaaSVendor.upsert({
        where: {
          organizationId_normalizedName: {
            organizationId,
            normalizedName: v.normalizedName,
          },
        },
        create: {
          organizationId,
          normalizedName: v.normalizedName,
          originalName: v.originalName,
          confidence: v.confidence,
          reasoning: v.reasoning,
          transactionCount: 1,
        },
        update: {
          transactionCount: { increment: 1 },
          lastSeenAt: new Date(),
        },
      })
    )
  );
}

/**
 * Non-SaaS 캐시에서 제거 (수동 SaaS 지정 시)
 */
export async function removeFromNonSaaSCache(
  organizationId: string,
  normalizedName: string
): Promise<void> {
  await prisma.nonSaaSVendor.deleteMany({
    where: {
      organizationId,
      normalizedName,
    },
  });
}

// ==================== 배치 매칭 함수 ====================

/**
 * 배치 LLM 매칭
 * - 여러 가맹점을 한 번에 LLM 호출
 * - SaaS 판정 시 Catalog/App 생성
 * - Non-SaaS 결과는 캐시에 저장
 */
export async function matchMerchantsBatchWithLLM(
  organizationId: string,
  merchants: BatchMatchMerchant[]
): Promise<BatchMatchResult[]> {
  if (merchants.length === 0) return [];

  // 배치 LLM 호출
  const batchInput: BatchMerchantInput[] = merchants.map((m) => ({
    id: m.id,
    merchantName: m.merchantName,
    memo: m.memo,
    amount: m.amount,
    recurrenceHint: m.recurrenceHint,
  }));

  const batchPayload = await classifyMerchantsBatchWithLLM(batchInput);
  const resultsMap = new Map(batchPayload.results.map((r) => [r.id, r]));

  const results: BatchMatchResult[] = [];
  const nonSaaSToSave: Array<{
    normalizedName: string;
    originalName: string;
    confidence: number;
    reasoning?: string;
  }> = [];

  for (const merchant of merchants) {
    const inferenceResult = resultsMap.get(merchant.id);
    const inference = inferenceResult?.inference;
    const normalized = normalizeMerchantName(merchant.merchantName);

    if (!inference || !inference.isSaaS) {
      // Non-SaaS → 캐시에 저장할 목록에 추가
      nonSaaSToSave.push({
        normalizedName: normalized,
        originalName: merchant.merchantName,
        confidence: inference?.confidence ?? 0,
        reasoning: inference?.reasoning,
      });

      results.push({
        id: merchant.id,
        appId: null,
        appName: null,
        confidence: inference?.confidence ?? 0,
        matchSource: "LLM",
        isSaaS: false,
        inference: inference ?? null,
      });

      // 로그 기록
      await logInference({
        organizationId,
        merchantName: merchant.merchantName,
        normalizedName: normalized,
        payload: { inference: inference ?? null, usage: batchPayload.usage },
      });
    } else {
      // SaaS → Catalog/App 생성
      const catalog = await upsertCatalogFromInference(
        organizationId,
        inference
      );
      const targetName =
        inference.canonicalName ||
        inference.suggestedPatterns?.[0] ||
        merchant.merchantName;
      const app = await upsertAppForOrganization(
        organizationId,
        catalog?.id || null,
        targetName,
        inference.confidence ?? 0.6,
        inference.category
      );

      // SMP-107: 앱 생성 후 Team 자동 배정
      await ensureAppTeamOnCreation(app.id, merchant.teamId, merchant.userId);

      results.push({
        id: merchant.id,
        appId: app.id,
        appName: app.name,
        confidence: inference.confidence ?? 0.6,
        matchSource: "LLM",
        isSaaS: true,
        inference,
      });

      // 로그 기록
      await logInference({
        organizationId,
        merchantName: merchant.merchantName,
        normalizedName: normalized,
        payload: { inference, usage: batchPayload.usage },
        catalogId: catalog?.id,
        appId: app.id,
      });
    }
  }

  // Non-SaaS 벤더 일괄 저장
  if (nonSaaSToSave.length > 0) {
    await saveNonSaaSVendors(organizationId, nonSaaSToSave);
  }

  return results;
}

/**
 * 배치 처리 유틸리티
 * 배열을 chunkSize 크기로 나누어 처리
 */
export async function processMerchantsInBatches<T>(
  items: T[],
  chunkSize: number,
  processor: (batch: T[]) => Promise<BatchMatchResult[]>
): Promise<BatchMatchResult[]> {
  const results: BatchMatchResult[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await processor(chunk);
    results.push(...chunkResults);
  }

  return results;
}
