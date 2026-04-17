// src/actions/cost-analytics-utils.test.ts
import { describe, expect, it } from "vitest";

import {
  calculateMonthlyCost,
  calculateMonthlyPerSeatPrice,
  calculatePerSeatPrice,
  extractAmount,
  formatPerSeatPrice,
} from "./cost-analytics-utils";

describe("cost-analytics-utils", () => {
  describe("extractAmount", () => {
    it("should extract number from number", () => {
      expect(extractAmount(50000)).toBe(50000);
    });

    it("should extract from Prisma Decimal object", () => {
      expect(extractAmount({ toNumber: () => 12345 })).toBe(12345);
    });

    it("should return 0 for null/undefined", () => {
      expect(extractAmount(null)).toBe(0);
      expect(extractAmount(undefined)).toBe(0);
    });
  });

  describe("calculateMonthlyCost", () => {
    it("should return amount for MONTHLY", () => {
      expect(
        calculateMonthlyCost({ amount: 50000, billingCycle: "MONTHLY" })
      ).toBe(50000);
    });

    it("should divide by 3 for QUARTERLY", () => {
      expect(
        calculateMonthlyCost({ amount: 90000, billingCycle: "QUARTERLY" })
      ).toBe(30000);
    });

    it("should divide by 12 for YEARLY", () => {
      expect(
        calculateMonthlyCost({ amount: 120000, billingCycle: "YEARLY" })
      ).toBe(10000);
    });
  });

  describe("calculatePerSeatPrice", () => {
    it("should calculate seat price for PER_SEAT subscriptions", () => {
      expect(
        calculatePerSeatPrice({
          amount: 500000,
          totalLicenses: 10,
          billingType: "PER_SEAT",
        })
      ).toBe(50000);
    });

    it("should return null for FLAT_RATE subscriptions", () => {
      expect(
        calculatePerSeatPrice({
          amount: 500000,
          totalLicenses: 10,
          billingType: "FLAT_RATE",
        })
      ).toBeNull();
    });

    it("should return null when totalLicenses is null", () => {
      expect(
        calculatePerSeatPrice({
          amount: 500000,
          totalLicenses: null,
          billingType: "PER_SEAT",
        })
      ).toBeNull();
    });
  });

  describe("calculateMonthlyPerSeatPrice", () => {
    it("should calculate monthly per-seat price for YEARLY PER_SEAT", () => {
      expect(
        calculateMonthlyPerSeatPrice({
          amount: 1200000,
          totalLicenses: 10,
          billingType: "PER_SEAT",
          billingCycle: "YEARLY",
        })
      ).toBe(10000);
    });

    it("should return null for FLAT_RATE", () => {
      expect(
        calculateMonthlyPerSeatPrice({
          amount: 1200000,
          totalLicenses: 10,
          billingType: "FLAT_RATE",
          billingCycle: "YEARLY",
        })
      ).toBeNull();
    });
  });

  describe("formatPerSeatPrice", () => {
    it("should format price with /Seat suffix", () => {
      const result = formatPerSeatPrice(50000, "KRW");
      expect(result).toContain("50,000");
      expect(result).toContain("/Seat");
    });

    it("should return empty string for null", () => {
      expect(formatPerSeatPrice(null)).toBe("");
    });
  });
});
