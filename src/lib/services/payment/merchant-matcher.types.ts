// src/lib/services/payment/merchant-matcher.types.ts
import type { MatchSource } from "@prisma/client";

// 카탈로그 패턴 타입
export interface CatalogPattern {
  pattern: string;
  matchType: "EXACT" | "DOMAIN" | "SUBDOMAIN" | "REGEX";
  confidence: number;
}

// 카탈로그와 패턴 타입
export interface CatalogWithPatterns {
  id: string;
  name: string;
  slug: string;
  patterns: CatalogPattern[];
}

// 앱 매칭용 타입
export interface AppMatch {
  id: string;
  name: string;
  catalogId: string | null;
}

// 매칭 결과 타입
export interface MerchantMatchResult {
  merchantName: string;
  normalizedName: string;
  appId: string;
  appName: string;
  catalogId?: string;
  confidence: number;
  matchSource: MatchSource;
}

// 카탈로그 매칭 결과
export interface CatalogMatchResult {
  catalogId: string;
  catalogName: string;
  confidence: number;
}

// 4-Layer 매칭 입력
export interface FourLayerMatchInput {
  merchantName: string;
  memo?: string | null;
  storeBizNo?: string | null;
  amount?: number | null;
  currency?: string;
}

// 4-Layer 매칭 결과
export interface FourLayerMatchResult {
  appId: string | null;
  appName: string | null;
  catalogId?: string;
  confidence: number;
  matchSource: MatchSource | null;
  matchLayer: 1 | 2 | 3 | 4 | null;
  normalized: string;
}
