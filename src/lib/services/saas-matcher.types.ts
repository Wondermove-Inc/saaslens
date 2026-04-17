// src/lib/services/saas-matcher.types.ts
import { MatchSource as PrismaMatchSource } from "@prisma/client";
import type {
  SaaSInferenceInput,
  SaaSInferenceResult,
} from "./saas-classifier";

export interface LlmMatchParams extends SaaSInferenceInput {
  organizationId: string;
  teamId?: string;
  userId?: string;
}

// Prisma MatchSource enum을 그대로 사용 (PATTERN, CATALOG, LLM, MANUAL, IMPORT)
export type MatchSource = PrismaMatchSource | null;

export interface BatchMatchMerchant {
  id: string; // 트랜잭션 식별자
  merchantName: string;
  memo?: string | null;
  storeBizNo?: string | null;
  amount?: number | null;
  recurrenceHint?: string | null;
  teamId?: string;
  userId?: string;
}

export interface BatchMatchResult {
  id: string;
  appId: string | null;
  appName: string | null;
  confidence: number;
  matchSource: MatchSource;
  isSaaS: boolean;
  inference?: SaaSInferenceResult | null;
}
