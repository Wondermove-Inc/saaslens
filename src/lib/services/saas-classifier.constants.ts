// src/lib/services/saas-classifier.constants.ts
/**
 * SaaS Classifier 상수 정의
 * SMP-196: Vercel AI SDK 전환 — ANTHROPIC_API_KEY 단일화
 */

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
// Legacy URL constants kept for reference but no longer used directly
// (Vercel AI SDK handles API routing internally)
export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const BATCH_SIZE = 15;
export const FAILURE_TTL_MS = 5 * 60 * 1000; // 5분 동안 동일 실패는 재시도 생략
export const FAILURE_CACHE_CODES = new Set([
  "context_length_exceeded",
  "timeout",
  "rate_limit_exceeded",
  "rate_limit",
  "overloaded",
]);
