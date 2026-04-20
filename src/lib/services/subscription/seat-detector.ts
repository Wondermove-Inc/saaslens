// src/lib/services/subscription/seat-detector.ts
/**
 * Seat 구독제 자동 판단 서비스
 *
 * 결제 금액 패턴을 분석하여 FLAT_RATE vs PER_SEAT 구독 유형을 판단합니다.
 * - Step 1: SaaS 카탈로그 조회 (DB pricingModel → 하드코딩 폴백)
 * - Step 2: 금액 변동 여부 확인
 * - Step 3: GCD 기반 Seat 단가 추출 (허용 오차 포함)
 * - Step 4: 카탈로그 기준 단가 참조 (금액 일정 시)
 */

import type { BillingType } from "@prisma/client";

/**
 * @deprecated R1: DB SaaSCatalog.pricingModel로 대체 예정. 폴백 전용으로 유지.
 * 알려진 PER_SEAT 구독 모델 SaaS 목록 (usage-based 제외)
 */
const KNOWN_PER_SEAT_SAAS = new Set(
  [
    "Slack",
    "Notion",
    "Figma",
    "GitHub",
    "GitLab",
    "Jira",
    "Confluence",
    "Asana",
    "Monday.com",
    "Linear",
    "Zoom",
    "Microsoft 365",
    "Google Workspace",
    "Dropbox Business",
    "1Password",
    "LastPass",
    "Salesforce",
    "HubSpot",
    "Zendesk",
    "Intercom",
    "Datadog",
    "New Relic",
    "PagerDuty",
    "Okta",
    "Auth0",
    // Vercel, AWS, Netlify 제거 (usage-based)
    "Atlassian",
    "Trello",
    "Miro",
    "Loom",
    "Canva",
    "Adobe Creative Cloud",
    "InVision",
    "Postman",
    "Sentry",
  ].map((n) => n.toLowerCase())
);

/** GCD 결과의 최소 신뢰도 임계값 */
const MIN_GCD_CONFIDENCE = 0.5;

/** R2: 허용 오차 비율 (5%) */
const TOLERANCE_RATIO = 0.05;

/** R3: 카탈로그 기준 단가로 역산 시 최대 Seat 수 */
const MAX_CATALOG_SEATS = 500;

/** R5: Seat 판단 방법 */
export type DetectionMethod =
  | "catalog_known" // DB 카탈로그에서 PER_SEAT로 확인
  | "gcd_exact" // 정확한 GCD 기반 단가 추출
  | "gcd_tolerance" // 허용 오차 GCD 기반 단가 추출
  | "gcd_vat_adjusted" // 부가세 제거 후 GCD 추출
  | "catalog_price" // 카탈로그 기준 단가로 역산
  | "heuristic_known" // 하드코딩 목록 기반 (폴백)
  | "unknown"; // 판단 불가

export interface DetectBillingTypeInput {
  appName: string;
  amounts: number[];
  /** R1: DB SaaSCatalog.pricingModel 값 */
  catalogPricingModel?: string | null;
  /** R3: DB SaaSCatalog.basePricePerSeat 값 (KRW 환산) */
  catalogBasePricePerSeat?: number | null;
}

export interface DetectBillingTypeResult {
  billingType: BillingType;
  confidence: number;
  perSeatPrice: number | null;
  suggestedSeats: number | null;
  /** R5: 판단 방법 */
  method: DetectionMethod;
}

export interface SeatPriceResult {
  seatPrice: number | null;
  confidence: number;
  /** R2: 근사 방법 */
  approxMethod: "exact" | "vat_adjusted" | "tolerance";
}

/**
 * 알려진 PER_SEAT SaaS인지 확인
 * R1: catalogPricingModel 우선순위 적용
 * 1. catalogPricingModel === "PER_SEAT" → true
 * 2. catalogPricingModel === "FLAT_RATE" | "USAGE_BASED" → false
 * 3. catalogPricingModel === null/undefined → 하드코딩 폴백
 */
export function isKnownPerSeatSaaS(
  appName: string,
  catalogPricingModel?: string | null
): boolean {
  // R1: DB 카탈로그 우선
  if (catalogPricingModel === "PER_SEAT") return true;
  if (
    catalogPricingModel === "FLAT_RATE" ||
    catalogPricingModel === "USAGE_BASED"
  ) {
    return false;
  }
  // 폴백: 하드코딩 목록
  return KNOWN_PER_SEAT_SAAS.has(appName.toLowerCase());
}

/**
 * 금액에 변동이 있는지 확인 (모든 금액이 동일하면 false)
 */
export function hasAmountVariation(amounts: number[]): boolean {
  if (amounts.length <= 1) return false;
  const first = amounts[0];
  return amounts.some((a) => a !== first);
}

/**
 * 두 수의 최대공약수 (유클리드 알고리즘)
 */
export function calculateGCD(a: number, b: number): number {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * 결제 금액 배열에서 GCD 기반 Seat 단가 추출 (정확한 GCD)
 * 모든 금액이 특정 단가의 배수인지 확인
 */
export function extractSeatPrice(amounts: number[]): SeatPriceResult {
  if (amounts.length < 2) {
    return { seatPrice: null, confidence: 0, approxMethod: "exact" };
  }

  // 모든 금액의 GCD 계산
  let gcd = Math.round(amounts[0]);
  for (let i = 1; i < amounts.length; i++) {
    gcd = calculateGCD(gcd, Math.round(amounts[i]));
  }

  // GCD가 너무 작으면 (1원 등) 의미 없음
  if (gcd < 100) {
    return { seatPrice: null, confidence: 0.1, approxMethod: "exact" };
  }

  // 모든 금액이 GCD의 배수인지 검증 (합리적인 Seat 수 범위: 1~1000)
  const seatCounts = amounts.map((a) => Math.round(a / gcd));
  const allReasonable = seatCounts.every((s) => s >= 1 && s <= 1000);

  if (!allReasonable) {
    return { seatPrice: null, confidence: 0.2, approxMethod: "exact" };
  }

  // Seat 수가 변동하는지 확인 (변동이 있어야 PER_SEAT 패턴)
  const uniqueSeatCounts = new Set(seatCounts);
  const hasVariation = uniqueSeatCounts.size > 1;

  const confidence = hasVariation ? 0.8 : 0.4;

  return {
    seatPrice: gcd,
    confidence,
    approxMethod: "exact",
  };
}

/**
 * R2: 후보 단가가 모든 금액에 대해 유효한지 검증 (허용 오차 포함)
 */
function validateCandidatePrice(
  amounts: number[],
  candidatePrice: number,
  tolerance: number = TOLERANCE_RATIO
): { valid: boolean; maxError: number; seatCounts: number[] } {
  if (candidatePrice < 100) {
    return { valid: false, maxError: 1, seatCounts: [] };
  }

  const seatCounts: number[] = [];
  let maxError = 0;

  for (const amount of amounts) {
    const estimatedSeats = Math.round(amount / candidatePrice);
    if (estimatedSeats < 1 || estimatedSeats > 1000) {
      return { valid: false, maxError: 1, seatCounts: [] };
    }
    const error = Math.abs(amount - estimatedSeats * candidatePrice) / amount;
    maxError = Math.max(maxError, error);
    if (error > tolerance) {
      return { valid: false, maxError, seatCounts: [] };
    }
    seatCounts.push(estimatedSeats);
  }

  return { valid: true, maxError, seatCounts };
}

/**
 * R2: 부가세(10%) 제거 시도
 * 모든 금액이 1.1의 배수에 가까우면 부가세 제거한 금액 반환
 */
function tryRemoveVAT(amounts: number[]): number[] | null {
  const vatRate = 1.1;
  const adjusted = amounts.map((a) => Math.round(a / vatRate));

  // 모든 조정 금액이 원래 금액의 ~90.9%인지 확인
  const allValid = amounts.every((original, i) => {
    const reconstructed = Math.round(adjusted[i] * vatRate);
    const error = Math.abs(original - reconstructed) / original;
    return error < 0.01; // 1% 오차 이내
  });

  return allValid ? adjusted : null;
}

/**
 * R2: 허용 오차 기반 Seat 단가 추출
 * 정확한 GCD → 부가세 제거 → 허용 오차 순으로 시도
 */
export function extractSeatPriceWithTolerance(
  amounts: number[]
): SeatPriceResult {
  if (amounts.length < 2) {
    return { seatPrice: null, confidence: 0, approxMethod: "exact" };
  }

  // Step 1: 정확한 GCD 시도
  const exactResult = extractSeatPrice(amounts);
  if (exactResult.seatPrice && exactResult.confidence >= MIN_GCD_CONFIDENCE) {
    return exactResult;
  }

  // Step 2: 부가세 제거 후 재시도
  const vatAdjusted = tryRemoveVAT(amounts);
  if (vatAdjusted) {
    const vatResult = extractSeatPrice(vatAdjusted);
    if (vatResult.seatPrice && vatResult.confidence >= MIN_GCD_CONFIDENCE) {
      return {
        seatPrice: vatResult.seatPrice,
        confidence: vatResult.confidence - 0.05,
        approxMethod: "vat_adjusted",
      };
    }
  }

  // Step 3: 허용 오차 기반 후보 단가 검증
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const minAmount = sortedAmounts[0];

  // 후보 단가: GCD, 최솟값, 최솟값/2, 최솟값/3, ..., 최솟값/10
  const candidates = new Set<number>();
  // GCD 자체도 후보
  let gcd = Math.round(amounts[0]);
  for (let i = 1; i < amounts.length; i++) {
    gcd = calculateGCD(gcd, Math.round(amounts[i]));
  }
  if (gcd >= 100) candidates.add(gcd);
  // 최솟값을 1~10으로 나눈 것도 후보
  for (let div = 1; div <= 10; div++) {
    const c = Math.round(minAmount / div);
    if (c >= 100) candidates.add(c);
  }
  // 인접 금액 차이도 후보
  for (let i = 1; i < sortedAmounts.length; i++) {
    const diff = Math.round(sortedAmounts[i] - sortedAmounts[i - 1]);
    if (diff >= 100) candidates.add(diff);
  }

  let bestResult: SeatPriceResult | null = null;
  let bestError = 1;

  for (const candidate of candidates) {
    const validation = validateCandidatePrice(amounts, candidate);
    if (validation.valid) {
      const hasVariation = new Set(validation.seatCounts).size > 1;
      const maxSeats = Math.max(...validation.seatCounts);
      const minSeats = Math.min(...validation.seatCounts);
      // 단가가 최솟값 금액의 20% 미만이면 너무 작은 단가 → 스킵
      if (candidate < minAmount * 0.2) continue;
      // Seat 수의 범위가 너무 넓으면 (5배 이상 차이) 무효 처리
      if (maxSeats > minSeats * 5) continue;

      const baseConfidence = hasVariation ? 0.75 : 0.35;
      const adjustedConfidence = baseConfidence - validation.maxError * 0.5;

      if (
        !bestResult ||
        adjustedConfidence > bestResult.confidence ||
        (adjustedConfidence === bestResult.confidence &&
          validation.maxError < bestError)
      ) {
        bestResult = {
          seatPrice: candidate,
          confidence: adjustedConfidence,
          approxMethod: "tolerance",
        };
        bestError = validation.maxError;
      }
    }
  }

  if (bestResult && bestResult.confidence >= MIN_GCD_CONFIDENCE) {
    return bestResult;
  }

  // 부가세 조정한 금액으로도 tolerance 시도
  if (vatAdjusted) {
    const vatSortedAmounts = [...vatAdjusted].sort((a, b) => a - b);
    const vatMinAmount = vatSortedAmounts[0];
    const vatCandidates = new Set<number>();

    let vatGcd = Math.round(vatAdjusted[0]);
    for (let i = 1; i < vatAdjusted.length; i++) {
      vatGcd = calculateGCD(vatGcd, Math.round(vatAdjusted[i]));
    }
    if (vatGcd >= 100) vatCandidates.add(vatGcd);
    for (let div = 1; div <= 10; div++) {
      const c = Math.round(vatMinAmount / div);
      if (c >= 100) vatCandidates.add(c);
    }

    for (const candidate of vatCandidates) {
      // 단가가 최솟값 금액의 20% 미만이면 너무 작은 단가 → 스킵
      if (candidate < vatMinAmount * 0.2) continue;
      const validation = validateCandidatePrice(vatAdjusted, candidate);
      if (validation.valid) {
        const hasVariation = new Set(validation.seatCounts).size > 1;
        const maxSeats = Math.max(...validation.seatCounts);
        const minSeats = Math.min(...validation.seatCounts);
        if (maxSeats > minSeats * 5) continue;

        const baseConfidence = hasVariation ? 0.7 : 0.3;
        const adjustedConfidence = baseConfidence - validation.maxError * 0.5;

        if (
          (!bestResult || adjustedConfidence > bestResult.confidence) &&
          adjustedConfidence >= MIN_GCD_CONFIDENCE
        ) {
          bestResult = {
            seatPrice: candidate,
            confidence: adjustedConfidence,
            approxMethod: "vat_adjusted",
          };
        }
      }
    }
  }

  return (
    bestResult || {
      seatPrice: null,
      confidence: exactResult.confidence,
      approxMethod: "exact",
    }
  );
}

/**
 * 결제 패턴 분석 기반 billingType 자동 판단
 *
 * 판단 기준:
 * 1. catalogPricingModel 우선 (DB 카탈로그)
 * 2. 알려진 PER_SEAT SaaS + 금액 변동 + GCD 유효 → PER_SEAT (0.9)
 * 3. 알려진 PER_SEAT SaaS + 금액 일정 + catalog base price → PER_SEAT (0.85)
 * 4. 알려진 PER_SEAT SaaS + 금액 일정 → PER_SEAT (0.8), perSeatPrice=null
 * 5. 모르는 SaaS + 금액 변동 + GCD 유효 → PER_SEAT (0.7)
 * 6. 그 외 → FLAT_RATE (0.5)
 */
export function detectBillingType(
  input: DetectBillingTypeInput
): DetectBillingTypeResult {
  const { appName, amounts, catalogPricingModel, catalogBasePricePerSeat } =
    input;

  // 결제 데이터 없음
  if (amounts.length === 0) {
    return {
      billingType: "FLAT_RATE",
      confidence: 0,
      perSeatPrice: null,
      suggestedSeats: null,
      method: "unknown",
    };
  }

  const isKnown = isKnownPerSeatSaaS(appName, catalogPricingModel);
  const isCatalogKnown = catalogPricingModel === "PER_SEAT";

  // 판단 소스 결정
  const knownMethod: DetectionMethod = isCatalogKnown
    ? "catalog_known"
    : "heuristic_known";

  // 단일 결제만 있는 경우
  if (amounts.length === 1) {
    if (isKnown) {
      // R3: 카탈로그 기준 단가로 역산 시도
      if (catalogBasePricePerSeat && catalogBasePricePerSeat >= 100) {
        const estimatedSeats = Math.round(amounts[0] / catalogBasePricePerSeat);
        if (estimatedSeats >= 1 && estimatedSeats <= MAX_CATALOG_SEATS) {
          return {
            billingType: "PER_SEAT",
            confidence: 0.7,
            perSeatPrice: catalogBasePricePerSeat,
            suggestedSeats: estimatedSeats,
            method: "catalog_price",
          };
        }
      }
      return {
        billingType: "PER_SEAT",
        confidence: 0.6,
        perSeatPrice: null,
        suggestedSeats: null,
        method: knownMethod,
      };
    }
    return {
      billingType: "FLAT_RATE",
      confidence: 0.3,
      perSeatPrice: null,
      suggestedSeats: null,
      method: "unknown",
    };
  }

  // Step 2: 금액 변동 여부 확인
  const hasVariation = hasAmountVariation(amounts);

  // Step 3: R2 - 허용 오차 포함 GCD 기반 Seat 단가 추출
  const seatPriceResult = hasVariation
    ? extractSeatPriceWithTolerance(amounts)
    : { seatPrice: null, confidence: 0, approxMethod: "exact" as const };

  const gcdValid = seatPriceResult.confidence >= MIN_GCD_CONFIDENCE;

  if (isKnown) {
    if (hasVariation && gcdValid) {
      // 알려진 SaaS + 금액 변동 + GCD 유효
      const latestAmount = amounts[amounts.length - 1];
      const suggestedSeats = seatPriceResult.seatPrice
        ? Math.round(latestAmount / seatPriceResult.seatPrice)
        : null;

      // R2: tolerance 방법이면 confidence 약간 감소
      const baseConfidence = 0.9;
      const confidence =
        seatPriceResult.approxMethod === "exact"
          ? baseConfidence
          : baseConfidence - 0.05;

      // R5: method 결정
      let method: DetectionMethod;
      if (seatPriceResult.approxMethod === "exact") {
        method = "gcd_exact";
      } else if (seatPriceResult.approxMethod === "vat_adjusted") {
        method = "gcd_vat_adjusted";
      } else {
        method = "gcd_tolerance";
      }

      return {
        billingType: "PER_SEAT",
        confidence,
        perSeatPrice: seatPriceResult.seatPrice,
        suggestedSeats,
        method,
      };
    }

    // R3: 알려진 SaaS + 금액 일정 → catalog base price로 역산 시도
    if (
      !hasVariation &&
      catalogBasePricePerSeat &&
      catalogBasePricePerSeat >= 100
    ) {
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const estimatedSeats = Math.round(avgAmount / catalogBasePricePerSeat);
      if (estimatedSeats >= 1 && estimatedSeats <= MAX_CATALOG_SEATS) {
        return {
          billingType: "PER_SEAT",
          confidence: 0.85,
          perSeatPrice: catalogBasePricePerSeat,
          suggestedSeats: estimatedSeats,
          method: "catalog_price",
        };
      }
    }

    // 알려진 SaaS + 금액 일정 → PER_SEAT (0.8), perSeatPrice 알 수 없음
    return {
      billingType: "PER_SEAT",
      confidence: 0.8,
      perSeatPrice: null,
      suggestedSeats: null,
      method: knownMethod,
    };
  }

  // R1: catalogPricingModel이 USAGE_BASED 또는 FLAT_RATE로 명시된 경우
  // GCD 패턴과 무관하게 PER_SEAT 판정하지 않음
  if (
    catalogPricingModel === "USAGE_BASED" ||
    catalogPricingModel === "FLAT_RATE"
  ) {
    return {
      billingType: "FLAT_RATE",
      confidence: 0.8,
      perSeatPrice: null,
      suggestedSeats: null,
      method: "catalog_known",
    };
  }

  // 모르는 SaaS + 금액 변동 + GCD 유효 → PER_SEAT (0.7)
  if (hasVariation && gcdValid) {
    const latestAmount = amounts[amounts.length - 1];
    const suggestedSeats = seatPriceResult.seatPrice
      ? Math.round(latestAmount / seatPriceResult.seatPrice)
      : null;

    let method: DetectionMethod;
    if (seatPriceResult.approxMethod === "exact") {
      method = "gcd_exact";
    } else if (seatPriceResult.approxMethod === "vat_adjusted") {
      method = "gcd_vat_adjusted";
    } else {
      method = "gcd_tolerance";
    }

    return {
      billingType: "PER_SEAT",
      confidence: 0.7,
      perSeatPrice: seatPriceResult.seatPrice,
      suggestedSeats,
      method,
    };
  }

  // 그 외 → FLAT_RATE (0.5)
  return {
    billingType: "FLAT_RATE",
    confidence: 0.5,
    perSeatPrice: null,
    suggestedSeats: null,
    method: "unknown",
  };
}
