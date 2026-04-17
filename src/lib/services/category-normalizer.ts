// src/lib/services/category-normalizer.ts
/**
 * LLM 카테고리 → UI 드롭다운 표준 카테고리 정규화
 * - 표준 카테고리 상수 및 타입
 * - 앨리어스 매핑 테이블
 * - 정규화 함수 (순수 함수, 부수효과 없음)
 */

/** UI 드롭다운에 표시되는 10개 표준 카테고리 */
export const APP_CATEGORIES = [
  "collaboration",
  "design",
  "ai",
  "productivity",
  "development",
  "marketing",
  "analytics",
  "security",
  "finance",
  "hr",
] as const;

export type AppCategoryValue = (typeof APP_CATEGORIES)[number];

/**
 * LLM 출력 앨리어스 → 표준 카테고리 매핑 (키는 소문자)
 * 키 조회 시 입력값도 소문자로 변환하여 비교
 */
export const CATEGORY_ALIAS_MAP: Record<string, AppCategoryValue> = {
  // collaboration
  communication: "collaboration",
  messaging: "collaboration",
  "team chat": "collaboration",
  "video conferencing": "collaboration",
  email: "collaboration",
  workspace: "collaboration",

  // design
  "design tools": "design",
  "ui/ux": "design",
  "graphic design": "design",
  "creative tools": "design",
  prototyping: "design",

  // ai
  "ai/ml": "ai",
  "artificial intelligence": "ai",
  "machine learning": "ai",
  "generative ai": "ai",
  llm: "ai",

  // productivity
  "productivity tools": "productivity",
  "project management": "productivity",
  "task management": "productivity",
  "note-taking": "productivity",
  documentation: "productivity",
  office: "productivity",

  // development
  "developer tools": "development",
  devops: "development",
  engineering: "development",
  ide: "development",
  "cloud infrastructure": "development",
  "ci/cd": "development",
  hosting: "development",
  monitoring: "development",

  // marketing
  "marketing tools": "marketing",
  crm: "marketing",
  advertising: "marketing",
  seo: "marketing",
  "social media": "marketing",
  sales: "marketing",

  // analytics
  "data analytics": "analytics",
  "business intelligence": "analytics",
  bi: "analytics",
  reporting: "analytics",
  "data visualization": "analytics",

  // security
  cybersecurity: "security",
  "identity management": "security",
  iam: "security",
  authentication: "security",
  "password manager": "security",
  vpn: "security",
  compliance: "security",

  // finance
  fintech: "finance",
  accounting: "finance",
  billing: "finance",
  payments: "finance",
  invoicing: "finance",
  "expense management": "finance",
  payroll: "finance",

  // hr
  "human resources": "hr",
  recruitment: "hr",
  hiring: "hr",
  "talent management": "hr",
  onboarding: "hr",
  hris: "hr",
};

const STANDARD_SET = new Set<string>(APP_CATEGORIES);

/**
 * LLM 카테고리 값을 UI 표준 카테고리로 정규화
 *
 * 1. null/빈 문자열 → null
 * 2. 이미 표준 카테고리 → 그대로 반환
 * 3. 앨리어스 매핑 히트 → 표준 카테고리 반환
 * 4. 매핑 실패 → 원본 값 그대로 반환 (커스텀 카테고리 허용)
 */
export function normalizeCategory(raw: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // 이미 표준 카테고리인 경우
  if (STANDARD_SET.has(lower)) return lower;

  // 앨리어스 매핑 조회
  const mapped = CATEGORY_ALIAS_MAP[lower];
  if (mapped) return mapped;

  // 매핑 없는 경우 원본 값 반환
  return trimmed;
}
