// src/lib/services/saas-classifier.ts
/**
 * LLM 기반 SaaS 여부 판별기
 * - Vercel AI SDK generateObject()로 Anthropic 모델 호출
 * - zod 스키마 기반 타입 안전 응답 파싱
 * - 네트워크 장애 시 null을 반환해 폴백 로직이 돌도록 처리
 */

// Re-export types for backwards compatibility
export type {
  BatchInferencePayload,
  BatchInferenceResult,
  BatchMerchantInput,
  SaaSInferenceInput,
  SaaSInferencePayload,
  SaaSInferenceResult,
  SaaSInferenceUsage,
} from "./saas-classifier.types";

import type {
  BatchInferencePayload,
  BatchMerchantInput,
  SaaSInferenceInput,
  SaaSInferencePayload,
  SaaSInferenceResult,
} from "./saas-classifier.types";

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import {
  BATCH_SIZE,
  DEFAULT_MODEL,
  FAILURE_CACHE_CODES,
  FAILURE_TTL_MS,
} from "./saas-classifier.constants";

import {
  buildBatchPrompt,
  buildCacheKey,
  buildPrompt,
  parseErrorCode,
  sanitizeText,
  truncate,
} from "./saas-classifier.utils";

// ==================== Zod Schemas ====================

const SaaSInferenceResultSchema = z.object({
  isSaaS: z.boolean(),
  canonicalName: z.string().nullable(),
  website: z.string().nullable(),
  category: z.string().nullable(),
  confidence: z.number(), // min/max 제거 — Anthropic API가 JSON Schema minimum/maximum 미지원
  suggestedPatterns: z.array(z.string()),
  reasoning: z.string().optional(),
  pricingModel: z
    .enum(["PER_SEAT", "FLAT_RATE", "USAGE_BASED"])
    .nullable()
    .optional(),
});

const BatchInferenceResultSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      inference: SaaSInferenceResultSchema.nullable(),
    })
  ),
});

// ==================== Cache ====================

// 간단한 메모리 캐시 (동일 요청 반복 방지)
const inferenceCache = new Map<string, SaaSInferenceResult>();
const failureCache = new Map<
  string,
  { errorCode: string; timestamp: number }
>();

// ==================== Batch Classification ====================

/**
 * 배치 LLM 분류 함수
 * 최대 50건을 한 번에 처리하여 API 호출 횟수를 줄임
 */
export async function classifyMerchantsBatchWithLLM(
  merchants: BatchMerchantInput[],
  options?: { signal?: AbortSignal }
): Promise<BatchInferencePayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[LLM Batch] ANTHROPIC_API_KEY가 설정되지 않아 판별을 건너뜁니다."
    );
    return {
      results: merchants.map((m) => ({ id: m.id, inference: null })),
      errorCode: "missing_api_key",
    };
  }

  if (merchants.length === 0) {
    return { results: [] };
  }

  // 배치 크기 제한
  const batch = merchants.slice(0, BATCH_SIZE);

  // 입력 정제
  const sanitizedBatch = batch.map((m) => ({
    id: m.id,
    merchantName: truncate(sanitizeText(m.merchantName), 200) || "",
    memo: truncate(sanitizeText(m.memo), 200),
    amount: typeof m.amount === "number" && m.amount > 0 ? m.amount : undefined,
    recurrenceHint: truncate(sanitizeText(m.recurrenceHint), 200),
  }));

  // 캐시 체크 - 이미 처리된 항목 필터링
  const cachedResults: { id: string; inference: SaaSInferenceResult | null }[] =
    [];
  const uncached: typeof sanitizedBatch = [];

  for (const m of sanitizedBatch) {
    const cacheKey = buildCacheKey({
      merchantName: m.merchantName,
      memo: m.memo,
    });
    const cached = inferenceCache.get(cacheKey);
    if (cached) {
      cachedResults.push({ id: m.id, inference: cached });
    } else {
      uncached.push(m);
    }
  }

  // 모두 캐시 히트면 바로 반환
  if (uncached.length === 0) {
    return { results: cachedResults };
  }

  const prompt = buildBatchPrompt(uncached);

  try {
    const { object, usage: sdkUsage } = await generateObject({
      model: anthropic(DEFAULT_MODEL),
      schema: BatchInferenceResultSchema,
      system:
        "You are a SaaS payment classifier. Classify merchants as SaaS products using your knowledge. Mark isSaaS=true for cloud software, subscription services, developer tools, AI APIs, and cloud infrastructure.",
      prompt,
      temperature: 0.1,
      maxOutputTokens: 2048,
      abortSignal: options?.signal,
    });

    const usage = sdkUsage
      ? {
          promptTokens: sdkUsage.inputTokens,
          completionTokens: sdkUsage.outputTokens,
          totalTokens:
            (sdkUsage.inputTokens ?? 0) + (sdkUsage.outputTokens ?? 0),
        }
      : undefined;

    const parsedResults = object.results;

    // 결과를 ID로 매핑 및 캐시 저장
    const resultMap = new Map<string, SaaSInferenceResult | null>();
    for (const r of parsedResults) {
      resultMap.set(r.id, r.inference);
      const original = uncached.find((m) => m.id === r.id);
      if (original && r.inference) {
        const cacheKey = buildCacheKey({
          merchantName: original.merchantName,
          memo: original.memo,
        });
        inferenceCache.set(cacheKey, r.inference);
      }
    }

    // 모든 입력에 대한 결과 구성
    const allResults = sanitizedBatch.map((m) => {
      const cached = cachedResults.find((c) => c.id === m.id);
      if (cached) return cached;
      return { id: m.id, inference: resultMap.get(m.id) ?? null };
    });

    // 배치 분류 성공 로그
    const saasCount = parsedResults.filter((r) => r.inference?.isSaaS).length;
    console.log(
      `[LLM Batch] 분류 완료 - 모델: ${DEFAULT_MODEL}, ` +
        `처리: ${parsedResults.length}건, SaaS: ${saasCount}건` +
        (usage ? `, 토큰: ${usage.totalTokens ?? "N/A"}` : "")
    );

    return { results: allResults, usage };
  } catch (error) {
    const code =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "exception";
    console.error("[LLM Batch] 판별 중 오류:", error);
    return {
      results: merchants.map((m) => ({ id: m.id, inference: null })),
      errorCode: code,
    };
  }
}

// ==================== Single Classification ====================

export async function classifyMerchantWithLLM(
  input: SaaSInferenceInput,
  options?: { signal?: AbortSignal }
): Promise<SaaSInferencePayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[LLM] ANTHROPIC_API_KEY가 설정되지 않아 판별을 건너뜁니다.");
    return { inference: null, errorCode: "missing_api_key" };
  }

  const sanitized = {
    merchantName: truncate(sanitizeText(input.merchantName), 200) || "",
    memo: truncate(sanitizeText(input.memo), 400),
    storeBizNo: truncate(sanitizeText(input.storeBizNo), 50),
    amount:
      typeof input.amount === "number" && input.amount > 0
        ? input.amount
        : undefined,
    currency:
      input.currency && /^[A-Za-z]{2,5}$/.test(input.currency)
        ? input.currency.toUpperCase()
        : undefined,
  };

  const cacheKey = buildCacheKey(sanitized);
  if (inferenceCache.has(cacheKey)) {
    return { inference: inferenceCache.get(cacheKey)! };
  }

  const lastFailure = failureCache.get(cacheKey);
  if (lastFailure && Date.now() - lastFailure.timestamp < FAILURE_TTL_MS) {
    return { inference: null, errorCode: lastFailure.errorCode };
  }

  const prompt = buildPrompt(sanitized);

  try {
    const { object, usage: sdkUsage } = await generateObject({
      model: anthropic(DEFAULT_MODEL),
      schema: SaaSInferenceResultSchema,
      system:
        "You are a SaaS payment classifier. Classify merchants as SaaS products using your knowledge. Mark isSaaS=true for cloud software, subscription services, developer tools, AI APIs, and cloud infrastructure.",
      prompt,
      temperature: 0.1,
      maxOutputTokens: 300,
      abortSignal: options?.signal,
    });

    const usage = sdkUsage
      ? {
          promptTokens: sdkUsage.inputTokens,
          completionTokens: sdkUsage.outputTokens,
          totalTokens:
            (sdkUsage.inputTokens ?? 0) + (sdkUsage.outputTokens ?? 0),
        }
      : undefined;

    const parsed = object;
    inferenceCache.set(cacheKey, parsed);
    console.log(
      `[LLM] 분류 완료 - 모델: ${DEFAULT_MODEL}, 가맹점: "${sanitized.merchantName}", ` +
        `결과: isSaaS=${parsed.isSaaS}, confidence=${parsed.confidence?.toFixed(2) ?? "N/A"}` +
        (usage ? `, 토큰: ${usage.totalTokens ?? "N/A"}` : "")
    );

    return { inference: parsed, usage };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const isAPIError =
      error instanceof Error &&
      (error.message.includes("rate_limit") ||
        error.message.includes("overloaded") ||
        error.message.includes("context_length"));

    let code = "exception";
    if (isAbort) {
      code = "timeout";
    } else if (isAPIError) {
      // Vercel AI SDK wraps API errors — extract from message
      const msg = error instanceof Error ? error.message : "";
      if (/context[_ ]?length/i.test(msg)) code = "context_length_exceeded";
      else if (/rate.?limit/i.test(msg)) code = "rate_limit";
      else if (/overloaded/i.test(msg)) code = "overloaded";
      else code = parseErrorCode(null, 0);
    }

    console.error("[LLM] 판별 중 오류:", error);
    if (FAILURE_CACHE_CODES.has(code)) {
      failureCache.set(cacheKey, { errorCode: code, timestamp: Date.now() });
    }
    return { inference: null, errorCode: code };
  }
}
