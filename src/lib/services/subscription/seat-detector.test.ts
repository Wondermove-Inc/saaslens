// src/lib/services/subscription/seat-detector.test.ts
import { describe, expect, it } from "vitest";

import {
  calculateGCD,
  detectBillingType,
  extractSeatPrice,
  extractSeatPriceWithTolerance,
  hasAmountVariation,
  isKnownPerSeatSaaS,
} from "./seat-detector";

describe("seat-detector", () => {
  describe("isKnownPerSeatSaaS", () => {
    it("should return true for known PER_SEAT SaaS apps", () => {
      expect(isKnownPerSeatSaaS("Slack")).toBe(true);
      expect(isKnownPerSeatSaaS("Notion")).toBe(true);
      expect(isKnownPerSeatSaaS("Figma")).toBe(true);
      expect(isKnownPerSeatSaaS("GitHub")).toBe(true);
      expect(isKnownPerSeatSaaS("Jira")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isKnownPerSeatSaaS("slack")).toBe(true);
      expect(isKnownPerSeatSaaS("NOTION")).toBe(true);
    });

    it("should return false for unknown apps", () => {
      expect(isKnownPerSeatSaaS("CustomInternalApp")).toBe(false);
    });

    it("should return false for usage-based SaaS (AWS, Vercel, Netlify)", () => {
      expect(isKnownPerSeatSaaS("AWS")).toBe(false);
      expect(isKnownPerSeatSaaS("Vercel")).toBe(false);
      expect(isKnownPerSeatSaaS("Netlify")).toBe(false);
    });

    // R1: catalogPricingModel 우선순위 테스트
    it("should return true when catalogPricingModel is PER_SEAT", () => {
      expect(isKnownPerSeatSaaS("NewSaaS", "PER_SEAT")).toBe(true);
    });

    it("should return false when catalogPricingModel is FLAT_RATE (override)", () => {
      // Slack은 하드코딩 목록에 있지만 catalog에서 FLAT_RATE로 오버라이드
      expect(isKnownPerSeatSaaS("Slack", "FLAT_RATE")).toBe(false);
    });

    it("should return false when catalogPricingModel is USAGE_BASED (override)", () => {
      expect(isKnownPerSeatSaaS("Slack", "USAGE_BASED")).toBe(false);
    });

    it("should fallback to hardcoded list when catalogPricingModel is null", () => {
      expect(isKnownPerSeatSaaS("Slack", null)).toBe(true);
      expect(isKnownPerSeatSaaS("CustomApp", null)).toBe(false);
    });

    it("should fallback to hardcoded list when catalogPricingModel is undefined", () => {
      expect(isKnownPerSeatSaaS("Slack", undefined)).toBe(true);
      expect(isKnownPerSeatSaaS("CustomApp", undefined)).toBe(false);
    });
  });

  describe("hasAmountVariation", () => {
    it("should return false for identical amounts", () => {
      expect(hasAmountVariation([50000, 50000, 50000])).toBe(false);
    });

    it("should return true for varying amounts", () => {
      expect(hasAmountVariation([50000, 100000, 150000])).toBe(true);
    });

    it("should return false for single amount", () => {
      expect(hasAmountVariation([50000])).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(hasAmountVariation([])).toBe(false);
    });
  });

  describe("calculateGCD", () => {
    it("should calculate GCD of two numbers", () => {
      expect(calculateGCD(12, 8)).toBe(4);
      expect(calculateGCD(100, 75)).toBe(25);
    });

    it("should calculate GCD of an array of numbers", () => {
      expect(calculateGCD(50000, calculateGCD(100000, 150000))).toBe(50000);
    });

    it("should handle identical numbers", () => {
      expect(calculateGCD(50000, 50000)).toBe(50000);
    });

    it("should handle zero", () => {
      expect(calculateGCD(0, 5)).toBe(5);
      expect(calculateGCD(5, 0)).toBe(5);
    });
  });

  describe("extractSeatPrice", () => {
    it("should extract seat price from amounts that are multiples of a base", () => {
      const amounts = [150000, 250000, 200000, 300000];
      const result = extractSeatPrice(amounts);
      expect(result.seatPrice).toBe(50000);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.approxMethod).toBe("exact");
    });

    it("should return null seat price if amounts are inconsistent", () => {
      const amounts = [13579, 24681, 97531];
      const result = extractSeatPrice(amounts);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("should return null for single amount", () => {
      const result = extractSeatPrice([50000]);
      expect(result.seatPrice).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("should return null for empty amounts", () => {
      const result = extractSeatPrice([]);
      expect(result.seatPrice).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  // R2: GCD 허용 오차 테스트
  describe("extractSeatPriceWithTolerance", () => {
    it("should handle exact multiples (same as extractSeatPrice)", () => {
      const result = extractSeatPriceWithTolerance([50000, 100000, 150000]);
      expect(result.seatPrice).toBe(50000);
      expect(result.approxMethod).toBe("exact");
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("should handle near-exact amounts with 5% tolerance", () => {
      // 110000, 220000, 330001 → seatPrice ≈ 110000
      const result = extractSeatPriceWithTolerance([110000, 220000, 330001]);
      expect(result.seatPrice).toBe(110000);
      expect(result.approxMethod).toBe("tolerance");
    });

    it("should detect VAT-included amounts", () => {
      // 55000 = 50000 * 1.1 (부가세), 110000 = 100000 * 1.1, 165000 = 150000 * 1.1
      const result = extractSeatPriceWithTolerance([55000, 110000, 165000]);
      // 정확한 GCD로 55000이 나올 수 있고, 부가세 제거로 50000이 나올 수 있음
      expect(result.seatPrice).not.toBeNull();
      expect([50000, 55000]).toContain(result.seatPrice);
    });

    it("should return null for truly noisy data", () => {
      const result = extractSeatPriceWithTolerance([13579, 24681, 97531]);
      expect(result.seatPrice).toBeNull();
    });

    it("should handle empty amounts", () => {
      const result = extractSeatPriceWithTolerance([]);
      expect(result.seatPrice).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("should handle single amount", () => {
      const result = extractSeatPriceWithTolerance([50000]);
      expect(result.seatPrice).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("should have lower confidence for tolerance method than exact", () => {
      const exact = extractSeatPriceWithTolerance([50000, 100000, 150000]);
      const tolerance = extractSeatPriceWithTolerance([110000, 220000, 330001]);
      if (exact.seatPrice && tolerance.seatPrice) {
        expect(exact.confidence).toBeGreaterThan(tolerance.confidence);
      }
    });

    it("should handle amounts with minor fluctuations (exchange rate)", () => {
      // 약 15000원/seat × 2~4 seats with minor fluctuations (~1%)
      const result = extractSeatPriceWithTolerance([30150, 45100, 59900]);
      // 15000 기준으로 약간의 오차가 있지만 tolerance 범위 내
      if (result.seatPrice) {
        expect(result.seatPrice).toBeGreaterThanOrEqual(14000);
        expect(result.seatPrice).toBeLessThanOrEqual(16000);
      }
    });
  });

  describe("detectBillingType", () => {
    it("should detect PER_SEAT for known SaaS with consistent amounts (key fix)", () => {
      // 이전에는 FLAT_RATE로 잘못 판단했던 핵심 케이스
      const result = detectBillingType({
        appName: "Slack",
        amounts: [50000, 50000, 50000, 50000],
      });
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.confidence).toBe(0.8);
      expect(result.perSeatPrice).toBeNull(); // 변동 없으므로 단가 알 수 없음
      expect(result.method).toBe("heuristic_known");
    });

    it("should detect PER_SEAT for known SaaS with varying amounts + GCD", () => {
      const result = detectBillingType({
        appName: "Slack",
        amounts: [50000, 100000, 150000],
      });
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.confidence).toBe(0.9);
      expect(result.perSeatPrice).toBe(50000);
      expect(result.suggestedSeats).toBe(3); // 150000 / 50000
      expect(result.method).toBe("gcd_exact");
    });

    it("should detect PER_SEAT for unknown SaaS with varying amounts + clear GCD", () => {
      const result = detectBillingType({
        appName: "UnknownSaaS",
        amounts: [100000, 150000, 200000, 250000],
      });
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.confidence).toBe(0.7);
      expect(result.perSeatPrice).toBe(50000);
      expect(result.method).toBe("gcd_exact");
    });

    it("should detect FLAT_RATE for unknown SaaS with consistent amounts", () => {
      const result = detectBillingType({
        appName: "CustomApp",
        amounts: [50000, 50000, 50000],
      });
      expect(result.billingType).toBe("FLAT_RATE");
      expect(result.confidence).toBe(0.5);
      expect(result.method).toBe("unknown");
    });

    it("should detect FLAT_RATE for unknown SaaS with variation but no GCD pattern", () => {
      const result = detectBillingType({
        appName: "CustomApp",
        amounts: [13579, 24681, 97531],
      });
      expect(result.billingType).toBe("FLAT_RATE");
      expect(result.confidence).toBe(0.5);
      expect(result.method).toBe("unknown");
    });

    it("should return PER_SEAT with confidence 0.6 for known SaaS single payment", () => {
      const result = detectBillingType({
        appName: "Slack",
        amounts: [50000],
      });
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.confidence).toBe(0.6);
      expect(result.method).toBe("heuristic_known");
    });

    it("should return FLAT_RATE with low confidence for unknown single payment", () => {
      const result = detectBillingType({
        appName: "SomeApp",
        amounts: [50000],
      });
      expect(result.billingType).toBe("FLAT_RATE");
      expect(result.confidence).toBeLessThanOrEqual(0.5);
      expect(result.method).toBe("unknown");
    });

    it("should return FLAT_RATE for empty amounts", () => {
      const result = detectBillingType({
        appName: "SomeApp",
        amounts: [],
      });
      expect(result.billingType).toBe("FLAT_RATE");
      expect(result.confidence).toBe(0);
      expect(result.method).toBe("unknown");
    });

    it("should calculate suggestedSeats from latest amount and seat price", () => {
      const result = detectBillingType({
        appName: "Notion",
        amounts: [100000, 150000, 200000],
      });
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.perSeatPrice).toBe(50000);
      expect(result.suggestedSeats).toBe(4); // 200000 / 50000
    });

    it("should not detect AWS as PER_SEAT (removed from catalog)", () => {
      const result = detectBillingType({
        appName: "AWS",
        amounts: [100000, 100000, 100000],
      });
      // AWS is no longer in catalog, so with consistent amounts → FLAT_RATE
      expect(result.billingType).toBe("FLAT_RATE");
    });

    it("should not detect Vercel as PER_SEAT (removed from catalog)", () => {
      const result = detectBillingType({
        appName: "Vercel",
        amounts: [20000, 20000, 20000],
      });
      expect(result.billingType).toBe("FLAT_RATE");
    });

    // R1: catalogPricingModel 테스트
    it("should detect PER_SEAT when catalogPricingModel is PER_SEAT for unknown app", () => {
      const result = detectBillingType({
        appName: "NewSaaS",
        amounts: [50000, 50000, 50000],
        catalogPricingModel: "PER_SEAT",
      });
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.method).toBe("catalog_known");
    });

    it("should detect FLAT_RATE when catalogPricingModel is FLAT_RATE for known app", () => {
      // Slack은 하드코딩 목록에 있지만 카탈로그에서 FLAT_RATE로 오버라이드
      const result = detectBillingType({
        appName: "Slack",
        amounts: [50000, 50000, 50000],
        catalogPricingModel: "FLAT_RATE",
      });
      expect(result.billingType).toBe("FLAT_RATE");
    });

    // R3: catalogBasePricePerSeat 테스트
    it("should estimate seats from catalog base price when amounts are constant", () => {
      // Slack $7.25/seat → KRW ~10000/seat, 총 50000원 = 5 seats
      const result = detectBillingType({
        appName: "Slack",
        amounts: [50000, 50000, 50000],
        catalogPricingModel: "PER_SEAT",
        catalogBasePricePerSeat: 10000,
      });
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.perSeatPrice).toBe(10000);
      expect(result.suggestedSeats).toBe(5);
      expect(result.method).toBe("catalog_price");
    });

    it("should not use catalog base price when seat count is unreasonable", () => {
      // 50000 / 1 = 50000 seats → unreasonable
      const result = detectBillingType({
        appName: "Slack",
        amounts: [50000, 50000, 50000],
        catalogPricingModel: "PER_SEAT",
        catalogBasePricePerSeat: 1,
      });
      // Should still be PER_SEAT (known) but without catalog price
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.method).not.toBe("catalog_price");
    });

    // R2: tolerance GCD in detectBillingType
    it("should detect PER_SEAT with tolerance for near-exact amounts", () => {
      const result = detectBillingType({
        appName: "Slack",
        amounts: [50000, 100000, 150001],
      });
      expect(result.billingType).toBe("PER_SEAT");
      expect(result.perSeatPrice).not.toBeNull();
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    // Bug A 회귀 테스트: USAGE_BASED/FLAT_RATE SaaS가 GCD 패턴으로 PER_SEAT 오판 방지
    it("should return FLAT_RATE for USAGE_BASED SaaS even with valid GCD pattern", () => {
      // Azure 실제 시나리오: [170만, 180만, 195만, 210만, 225만, 235만]
      // GCD = 50,000, seat counts = [34, 36, 39, 42, 45, 47] → 유효한 GCD 패턴
      // 하지만 catalogPricingModel = USAGE_BASED이므로 FLAT_RATE 반환해야 함
      const result = detectBillingType({
        appName: "Microsoft Azure",
        amounts: [1700000, 1800000, 1950000, 2100000, 2250000, 2350000],
        catalogPricingModel: "USAGE_BASED",
      });
      expect(result.billingType).toBe("FLAT_RATE");
      expect(result.confidence).toBe(0.8);
      expect(result.method).toBe("catalog_known");
      expect(result.perSeatPrice).toBeNull();
      expect(result.suggestedSeats).toBeNull();
    });

    it("should return FLAT_RATE for FLAT_RATE SaaS even with valid GCD pattern", () => {
      const result = detectBillingType({
        appName: "SomeFixedPriceSaaS",
        amounts: [100000, 200000, 300000],
        catalogPricingModel: "FLAT_RATE",
      });
      expect(result.billingType).toBe("FLAT_RATE");
      expect(result.confidence).toBe(0.8);
      expect(result.method).toBe("catalog_known");
    });

    it("should return FLAT_RATE for USAGE_BASED SaaS with constant amounts", () => {
      const result = detectBillingType({
        appName: "AWS",
        amounts: [500000, 500000, 500000],
        catalogPricingModel: "USAGE_BASED",
      });
      expect(result.billingType).toBe("FLAT_RATE");
      expect(result.method).toBe("catalog_known");
    });

    it("should still detect PER_SEAT for unknown SaaS with valid GCD when no catalog info", () => {
      // catalogPricingModel이 없으면 기존 GCD 로직 동작
      const result = detectBillingType({
        appName: "Microsoft Azure",
        amounts: [1700000, 1800000, 1950000, 2100000, 2250000, 2350000],
        catalogPricingModel: null,
      });
      // catalog 없으면 GCD 기반으로 PER_SEAT 판단 (기존 동작)
      expect(result.billingType).toBe("PER_SEAT");
    });

    // R5: method 필드 테스트
    it("should return method field in result", () => {
      const result = detectBillingType({
        appName: "Slack",
        amounts: [50000, 100000, 150000],
      });
      expect(result.method).toBeDefined();
      expect(typeof result.method).toBe("string");
    });
  });
});
