import { describe, expect, it } from "vitest";

import { normalizeMerchantName } from "./merchant-matcher";
import {
  analyzePaymentIntervals,
  analyzeSaaSSubscriptionPatterns,
  detectMonthlyRecurrence,
  formatSaaSHintForLLM,
} from "./recurrence";

describe("detectMonthlyRecurrence", () => {
  it("flags merchants with same day/time across two months", () => {
    const key = normalizeMerchantName("Acme Cloud");
    const result = detectMonthlyRecurrence([
      {
        useDt: "20250115",
        useTm: "120000",
        useStore: "Acme Cloud",
        useAmt: "10000",
      },
      {
        useDt: "20250215",
        useTm: "120100",
        useStore: "Acme Cloud",
        useAmt: "12000",
      },
    ]);

    const meta = result.get(key);
    expect(meta).toBeDefined();
    expect(meta?.count).toBe(2);
    expect(meta?.minAmount).toBe(10000);
    expect(meta?.maxAmount).toBe(12000);
  });

  it("handles +/- 1 minute tolerance", () => {
    const key = normalizeMerchantName("Beta SaaS");
    const result = detectMonthlyRecurrence([
      {
        useDt: "20250120",
        useTm: "095900",
        useStore: "Beta SaaS",
        useAmt: "5000",
      },
      {
        useDt: "20250220",
        useTm: "100000",
        useStore: "Beta SaaS",
        useAmt: "7000",
      },
    ]);

    expect(result.has(key)).toBe(true);
  });

  it("ignores merchants without repeated months", () => {
    const result = detectMonthlyRecurrence([
      {
        useDt: "20250110",
        useTm: "080000",
        useStore: "One Time",
        useAmt: "3000",
      },
    ]);

    expect(result.size).toBe(0);
  });
});

describe("analyzeSaaSSubscriptionPatterns", () => {
  it("detects high-confidence SaaS pattern with consistent amount and date", () => {
    const key = normalizeMerchantName("Notion Inc");
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "20250115", useStore: "Notion Inc", useAmt: "10000" },
      { useDt: "20250215", useStore: "Notion Inc", useAmt: "10000" },
      { useDt: "20250315", useStore: "Notion Inc", useAmt: "10000" },
    ]);

    const hint = result.get(key);
    expect(hint).toBeDefined();
    expect(hint!.score).toBeGreaterThanOrEqual(70);
    expect(hint!.monthCount).toBe(3);
    expect(hint!.avgAmount).toBe(10000);
    expect(hint!.amountVariation).toBe(0);
    expect(hint!.reasons.length).toBeGreaterThan(0);
  });

  it("detects pattern with slight amount variation (within 10%)", () => {
    const key = normalizeMerchantName("Slack Corp");
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "20250110", useStore: "Slack Corp", useAmt: "9500" },
      { useDt: "20250210", useStore: "Slack Corp", useAmt: "10000" },
      { useDt: "20250310", useStore: "Slack Corp", useAmt: "10500" },
    ]);

    const hint = result.get(key);
    expect(hint).toBeDefined();
    expect(hint!.amountVariation).toBeLessThan(0.1);
    expect(hint!.score).toBeGreaterThanOrEqual(50);
  });

  it("handles 6+ months of consistent payments", () => {
    const key = normalizeMerchantName("GitHub Pro");
    const purchases = [];
    for (let month = 1; month <= 6; month++) {
      purchases.push({
        useDt: `2025${String(month).padStart(2, "0")}05`,
        useStore: "GitHub Pro",
        useAmt: "15000",
      });
    }

    const result = analyzeSaaSSubscriptionPatterns(purchases);
    const hint = result.get(key);

    expect(hint).toBeDefined();
    expect(hint!.monthCount).toBe(6);
    expect(hint!.score).toBeGreaterThanOrEqual(80);
    expect(hint!.reasons.some((r) => r.includes("6개월 이상"))).toBe(true);
  });

  it("ignores merchants with only one month of transactions", () => {
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "20250115", useStore: "One Time Purchase", useAmt: "50000" },
    ]);

    expect(result.size).toBe(0);
  });

  it("returns null for low-confidence patterns", () => {
    const key = normalizeMerchantName("Irregular Vendor");
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "20250105", useStore: "Irregular Vendor", useAmt: "10000" },
      { useDt: "20250225", useStore: "Irregular Vendor", useAmt: "50000" },
    ]);

    // 금액 편차가 너무 크고 일자 편차도 크면 낮은 점수
    const hint = result.get(key);
    // 점수가 20 미만이면 null 반환됨
    expect(hint === undefined || hint.score < 50).toBe(true);
  });

  it("handles month-end normalization (28+ days treated as month-end)", () => {
    const key = normalizeMerchantName("Month End Corp");
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "20250128", useStore: "Month End Corp", useAmt: "20000" },
      { useDt: "20250228", useStore: "Month End Corp", useAmt: "20000" },
      { useDt: "20250331", useStore: "Month End Corp", useAmt: "20000" },
    ]);

    const hint = result.get(key);
    expect(hint).toBeDefined();
    expect(hint!.score).toBeGreaterThanOrEqual(70);
  });

  it("selects highest amount when multiple transactions in same month", () => {
    const key = normalizeMerchantName("Multi Transaction");
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "20250105", useStore: "Multi Transaction", useAmt: "5000" },
      { useDt: "20250110", useStore: "Multi Transaction", useAmt: "10000" },
      { useDt: "20250205", useStore: "Multi Transaction", useAmt: "10000" },
    ]);

    const hint = result.get(key);
    expect(hint).toBeDefined();
    expect(hint!.avgAmount).toBe(10000);
  });

  it("respects custom options", () => {
    const key = normalizeMerchantName("Custom Options Test");
    const result = analyzeSaaSSubscriptionPatterns(
      [
        { useDt: "20250115", useStore: "Custom Options Test", useAmt: "10000" },
        { useDt: "20250215", useStore: "Custom Options Test", useAmt: "12000" },
        { useDt: "20250315", useStore: "Custom Options Test", useAmt: "14000" },
      ],
      {
        amountTolerance: 0.05, // 더 엄격한 5% 허용
        minMonthCount: 3,
        dayTolerance: 2,
      }
    );

    const hint = result.get(key);
    expect(hint).toBeDefined();
    // 금액 편차가 5%를 초과하므로 최고 점수 아님
    expect(hint!.score).toBeLessThan(100);
  });

  it("handles empty purchases array", () => {
    const result = analyzeSaaSSubscriptionPatterns([]);
    expect(result.size).toBe(0);
  });

  it("ignores invalid date formats", () => {
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "invalid", useStore: "Bad Date", useAmt: "10000" },
      { useDt: "2025", useStore: "Bad Date", useAmt: "10000" },
    ]);

    expect(result.size).toBe(0);
  });

  it("ignores zero or negative amounts", () => {
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "20250115", useStore: "Zero Amount", useAmt: "0" },
      { useDt: "20250215", useStore: "Zero Amount", useAmt: "-100" },
    ]);

    expect(result.size).toBe(0);
  });

  it("processes multiple merchants independently", () => {
    const result = analyzeSaaSSubscriptionPatterns([
      { useDt: "20250115", useStore: "Vendor A", useAmt: "10000" },
      { useDt: "20250215", useStore: "Vendor A", useAmt: "10000" },
      { useDt: "20250110", useStore: "Vendor B", useAmt: "5000" },
      { useDt: "20250210", useStore: "Vendor B", useAmt: "5000" },
    ]);

    expect(result.size).toBe(2);
    expect(result.has(normalizeMerchantName("Vendor A"))).toBe(true);
    expect(result.has(normalizeMerchantName("Vendor B"))).toBe(true);
  });
});

describe("formatSaaSHintForLLM", () => {
  it("formats hint with all fields", () => {
    const hint = {
      score: 85,
      reasons: ["6개월 이상 연속 결제", "금액 일관성 높음"],
      monthCount: 6,
      avgAmount: 10000,
      amountVariation: 0.05,
    };

    const formatted = formatSaaSHintForLLM(hint);

    expect(formatted).toContain("saas_score=85");
    expect(formatted).toContain("months=6");
    expect(formatted).toContain("avg_amount=10000");
    expect(formatted).toContain("amount_var=5.0%");
    expect(formatted).toContain("patterns=");
    expect(formatted).toContain("6개월 이상 연속 결제");
  });

  it("handles empty reasons array", () => {
    const hint = {
      score: 50,
      reasons: [],
      monthCount: 2,
      avgAmount: 5000,
      amountVariation: 0.1,
    };

    const formatted = formatSaaSHintForLLM(hint);

    expect(formatted).toContain("saas_score=50");
    expect(formatted).not.toContain("patterns=");
  });
});

describe("analyzePaymentIntervals", () => {
  it("detects monthly recurring payment with low stdDev", () => {
    const key = normalizeMerchantName("Monthly SaaS");
    const result = analyzePaymentIntervals([
      { useDt: "20250115", useStore: "Monthly SaaS", useAmt: "10000" },
      { useDt: "20250215", useStore: "Monthly SaaS", useAmt: "10000" },
      { useDt: "20250315", useStore: "Monthly SaaS", useAmt: "10000" },
    ]);

    const pattern = result.get(key);
    expect(pattern).toBeDefined();
    expect(pattern!.isRecurring).toBe(true);
    expect(pattern!.billingCycle).toBe("MONTHLY");
    expect(pattern!.avgIntervalDays).toBeGreaterThanOrEqual(28);
    expect(pattern!.avgIntervalDays).toBeLessThanOrEqual(31); // ~30일 간격
    expect(pattern!.intervalStdDev).toBeLessThan(5);
    expect(pattern!.nextPaymentDate).toBeDefined();
    expect(pattern!.transactionCount).toBe(3);
  });

  it("detects quarterly recurring payment", () => {
    const key = normalizeMerchantName("Quarterly Service");
    const result = analyzePaymentIntervals([
      { useDt: "20250115", useStore: "Quarterly Service", useAmt: "30000" },
      { useDt: "20250415", useStore: "Quarterly Service", useAmt: "30000" },
      { useDt: "20250715", useStore: "Quarterly Service", useAmt: "30000" },
    ]);

    const pattern = result.get(key);
    expect(pattern).toBeDefined();
    expect(pattern!.isRecurring).toBe(true);
    expect(pattern!.billingCycle).toBe("QUARTERLY");
    expect(pattern!.avgIntervalDays).toBeGreaterThan(85);
    expect(pattern!.avgIntervalDays).toBeLessThan(95);
  });

  it("detects annual recurring payment", () => {
    const key = normalizeMerchantName("Annual License");
    const result = analyzePaymentIntervals([
      { useDt: "20240115", useStore: "Annual License", useAmt: "100000" },
      { useDt: "20250115", useStore: "Annual License", useAmt: "100000" },
    ]);

    const pattern = result.get(key);
    expect(pattern).toBeDefined();
    expect(pattern!.isRecurring).toBe(true);
    expect(pattern!.billingCycle).toBe("ANNUAL");
    expect(pattern!.avgIntervalDays).toBeGreaterThan(360);
  });

  it("does not mark irregular payments as recurring", () => {
    const key = normalizeMerchantName("Irregular Vendor");
    const result = analyzePaymentIntervals([
      { useDt: "20250101", useStore: "Irregular Vendor", useAmt: "5000" },
      { useDt: "20250115", useStore: "Irregular Vendor", useAmt: "5000" }, // 14일 간격
      { useDt: "20250301", useStore: "Irregular Vendor", useAmt: "5000" }, // 44일 간격
    ]);

    const pattern = result.get(key);
    expect(pattern).toBeDefined();
    expect(pattern!.isRecurring).toBe(false);
    expect(pattern!.billingCycle).toBeNull();
    expect(pattern!.nextPaymentDate).toBeNull();
    expect(pattern!.intervalStdDev).toBeGreaterThan(5);
  });

  it("predicts next payment date correctly", () => {
    const key = normalizeMerchantName("Predictable SaaS");
    const result = analyzePaymentIntervals([
      { useDt: "20250115", useStore: "Predictable SaaS", useAmt: "10000" },
      { useDt: "20250214", useStore: "Predictable SaaS", useAmt: "10000" },
      { useDt: "20250316", useStore: "Predictable SaaS", useAmt: "10000" },
    ]);

    const pattern = result.get(key);
    expect(pattern).toBeDefined();
    expect(pattern!.nextPaymentDate).toBeDefined();

    // 마지막 결제일 2025-03-16에서 약 30일 후
    const nextDate = pattern!.nextPaymentDate!;
    expect(nextDate.getMonth()).toBeGreaterThanOrEqual(3); // 4월(3) 또는 그 이후
  });

  it("handles single transaction (no interval possible)", () => {
    const result = analyzePaymentIntervals([
      { useDt: "20250115", useStore: "Single Payment", useAmt: "10000" },
    ]);

    // 단일 거래는 minTransactionCount 미달로 제외
    expect(result.size).toBe(0);
  });

  it("ignores invalid dates", () => {
    const result = analyzePaymentIntervals([
      { useDt: "invalid", useStore: "Bad Data", useAmt: "10000" },
      { useDt: "20251", useStore: "Bad Data", useAmt: "10000" },
    ]);

    expect(result.size).toBe(0);
  });

  it("uses custom stdDev threshold", () => {
    const key = normalizeMerchantName("Custom Threshold");
    // 표준편차가 ~10일인 결제
    const result = analyzePaymentIntervals(
      [
        { useDt: "20250110", useStore: "Custom Threshold", useAmt: "10000" },
        { useDt: "20250215", useStore: "Custom Threshold", useAmt: "10000" }, // 36일
        { useDt: "20250310", useStore: "Custom Threshold", useAmt: "10000" }, // 23일
      ],
      { stdDevThreshold: 15 } // 더 관대한 임계값
    );

    const pattern = result.get(key);
    expect(pattern).toBeDefined();
    expect(pattern!.isRecurring).toBe(true); // 15일 임계값에서는 recurring
  });
});
