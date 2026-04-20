// src/lib/erp-merchant-extractor.ts
// 다중 필드 SaaS명 추출 엔진
// ERP 데이터에서 실제 SaaS/서비스 이름을 지능적으로 추출

import type { MerchantExtractConfig } from "./erp-format-presets";

/** 기본 skipPatterns - 무의미한 거래처명/적요 */
const DEFAULT_SKIP_PATTERNS: string[] = [
  // 한국어 일반
  "카드결제",
  "법인카드",
  "미지급금",
  "보통예금",
  "현금",
  "당좌예금",
  "외상매입금",
  "선급금",
  "가지급금",
  "미수금",
  "예수금",
  "부가세",
  "매입세액",
  "원천징수",
  // 영문 일반
  "CLEARING",
  "PAYMENT",
  "BANK TRANSFER",
  "CASH",
  "PREPAYMENT",
  "ACCRUAL",
  "REVERSAL",
  "OPENING BALANCE",
  "CLOSING BALANCE",
  // 패턴
  "계좌이체",
  "자동이체",
  "급여",
  "상여",
  "퇴직",
];

/**
 * 값이 skipPattern에 매칭되는지 확인
 * 대소문자 무시, 부분 매칭
 */
function shouldSkip(value: string, skipPatterns: string[]): boolean {
  if (!value || !value.trim()) return true;

  const lower = value.toLowerCase().trim();

  // 너무 짧은 값 skip (1글자 이하)
  if (lower.length <= 1) return true;

  // 숫자만으로 구성된 값 skip
  if (/^\d+$/.test(lower)) return true;

  for (const pattern of skipPatterns) {
    if (lower === pattern.toLowerCase()) return true;
    if (lower.includes(pattern.toLowerCase())) return true;
  }

  return false;
}

/**
 * 적요(memo)에서 SaaS명을 추출하는 고급 로직
 *
 * 패턴 예시:
 * - "3월 Slack 구독료" → "Slack"
 * - "Notion 팀플랜 결제" → "Notion"
 * - "AWS 서버 비용 4월분" → "AWS"
 * - "GitHub Enterprise 라이선스" → "GitHub Enterprise"
 */
function extractFromMemo(memo: string): string | null {
  if (!memo || !memo.trim()) return null;

  const cleaned = memo.trim();

  // 패턴 1: "N월 {SaaS명} {설명}" 형태
  const monthPattern = cleaned.match(
    /\d{1,2}월\s+([A-Za-z][A-Za-z0-9\s.]+?)(?:\s+(?:구독|결제|라이[선센]스|비용|사용|이용|요금|플랜))/
  );
  if (monthPattern) return monthPattern[1].trim();

  // 패턴 2: "{SaaS명} {설명}" 형태 (영문 시작)
  const englishStartPattern = cleaned.match(
    /^([A-Za-z][A-Za-z0-9\s.]{1,30}?)(?:\s+(?:구독|결제|라이[선센]스|비용|사용|이용|요금|플랜|서비스|월|년|연))/
  );
  if (englishStartPattern) return englishStartPattern[1].trim();

  // 패턴 3: 적요 전체가 영문 (SaaS명 자체일 가능성)
  if (/^[A-Za-z][A-Za-z0-9\s.]+$/.test(cleaned) && cleaned.length <= 50) {
    return cleaned;
  }

  return null;
}

/**
 * CSV 행에서 merchantName (SaaS명)을 추출
 *
 * @param row - CSV 행 데이터
 * @param config - MerchantExtractConfig (프리셋에서 가져옴)
 * @returns 추출된 SaaS명 또는 null
 */
export function extractMerchantName(
  row: Record<string, string>,
  config: MerchantExtractConfig
): string | null {
  const allSkipPatterns = [...config.skipPatterns, ...DEFAULT_SKIP_PATTERNS];
  // 중복 제거
  const uniqueSkipPatterns = [...new Set(allSkipPatterns)];

  // 우선순위 순서대로 필드를 시도
  for (const fieldName of config.fieldPriority) {
    // 대소문자 무시하여 필드 매칭
    const matchedKey = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === fieldName.toLowerCase().trim()
    );

    if (!matchedKey) continue;

    const value = row[matchedKey];
    if (!value || !value.trim()) continue;

    // skip 패턴에 매칭되면 다음 필드로
    if (shouldSkip(value, uniqueSkipPatterns)) continue;

    // 적요 필드인 경우 고급 추출 시도
    const isMemoField = [
      "적요",
      "메모",
      "비고",
      "memo",
      "description",
      "documentitemtext",
    ].includes(fieldName.toLowerCase());

    if (isMemoField) {
      const extracted = extractFromMemo(value);
      if (extracted && !shouldSkip(extracted, uniqueSkipPatterns)) {
        return extracted;
      }
      // 적요에서 추출 실패 시 다음 필드로
      continue;
    }

    // 일반 필드: 값 그대로 반환
    return value.trim();
  }

  // 모든 필드에서 추출 실패 시, fallback으로 첫 번째 비-skip 값 반환
  for (const fieldName of config.fieldPriority) {
    const matchedKey = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === fieldName.toLowerCase().trim()
    );
    if (!matchedKey) continue;
    const value = row[matchedKey]?.trim();
    if (value && value.length > 1) {
      return value;
    }
  }

  return null;
}

/**
 * 배치 추출: 여러 행에서 merchantName을 일괄 추출
 */
export function extractMerchantNames(
  rows: Record<string, string>[],
  config: MerchantExtractConfig
): (string | null)[] {
  return rows.map((row) => extractMerchantName(row, config));
}
