// src/lib/erp-double-entry.test.ts
import { describe, expect, it } from "vitest";
import { convertDoubleEntry, type DoubleEntryRow } from "./erp-double-entry";
import type { DoubleEntryConfig } from "./erp-format-presets";

// 더존 iCUBE 샘플 데이터 (Confluence 계획서 기반)
const DUZON_SAMPLE: DoubleEntryRow[] = [
  {
    date: "20260401",
    amount: "150000",
    debitAccount: "81100",
    debitAccountName: "복리후생비",
    creditAccount: "25300",
    creditAccountName: "미지급금",
    memo: "3월 Slack 구독료",
    merchant: "Slack Technologies",
    rawData: {},
  },
  {
    date: "20260401",
    amount: "89000",
    debitAccount: "81200",
    debitAccountName: "여비교통비",
    creditAccount: "25300",
    creditAccountName: "미지급금",
    memo: "3월 Notion 팀플랜",
    merchant: "Notion Labs",
    rawData: {},
  },
  {
    date: "20260401",
    amount: "15000",
    debitAccount: "13500",
    debitAccountName: "매입세액",
    creditAccount: "",
    creditAccountName: "부가세",
    memo: "부가세(Slack)",
    merchant: "",
    rawData: {},
  },
  {
    date: "20260402",
    amount: "450000",
    debitAccount: "81100",
    debitAccountName: "복리후생비",
    creditAccount: "25300",
    creditAccountName: "미지급금",
    memo: "3월 GitHub Enterprise",
    merchant: "GitHub Inc",
    rawData: {},
  },
];

const DUZON_CONFIG: DoubleEntryConfig = {
  mode: "DEBIT_EXPENSE_ONLY",
  debitAccountField: "차변계정코드",
  creditAccountField: "대변계정코드",
  expenseAccountPrefixes: ["8"],
  vatAccountPrefixes: ["135"],
};

describe("erp-double-entry", () => {
  describe("DEBIT_EXPENSE_ONLY", () => {
    it("비용 계정(8xxx)만 추출", () => {
      const result = convertDoubleEntry(DUZON_SAMPLE, DUZON_CONFIG);
      // 81100 × 2 + 81200 × 1 = 3건 (13500 매입세액 제외)
      expect(result.length).toBe(3);
      expect(
        result.every(
          (r) =>
            r.category?.startsWith("8") ||
            r.category?.startsWith("복") ||
            r.category?.startsWith("여")
        )
      ).toBe(true);
    });

    it("부가세(매입세액)를 비용에 합산", () => {
      const result = convertDoubleEntry(DUZON_SAMPLE, DUZON_CONFIG);
      // 20260401 비용 2건, 부가세 15000 → 각 7500씩 배분
      const apr1Items = result.filter((r) => r.date === "20260401");
      expect(apr1Items.length).toBe(2);

      const slackItem = apr1Items.find((r) => r.memo === "3월 Slack 구독료");
      expect(slackItem).toBeDefined();
      expect(slackItem!.amount).toBe(150000 + 7500); // 본 비용 + VAT 배분

      const notionItem = apr1Items.find((r) => r.memo === "3월 Notion 팀플랜");
      expect(notionItem).toBeDefined();
      expect(notionItem!.amount).toBe(89000 + 7500);
    });

    it("다른 날짜 비용은 VAT 합산 없음", () => {
      const result = convertDoubleEntry(DUZON_SAMPLE, DUZON_CONFIG);
      const apr2Items = result.filter((r) => r.date === "20260402");
      expect(apr2Items.length).toBe(1);
      expect(apr2Items[0].amount).toBe(450000); // VAT 없음
    });
  });

  describe("DEBIT_ALL", () => {
    it("모든 차변 추출 (VAT 행 제외)", () => {
      const config: DoubleEntryConfig = {
        mode: "DEBIT_ALL",
        expenseAccountPrefixes: [],
        vatAccountPrefixes: ["135"],
      };
      const result = convertDoubleEntry(DUZON_SAMPLE, config);
      expect(result.length).toBe(3); // 81100, 81200, 81100 (13500 VAT 제외)
    });
  });

  describe("NET_AMOUNT", () => {
    it("차변 - 대변 순액 계산 (양수만 반환)", () => {
      const config: DoubleEntryConfig = {
        mode: "NET_AMOUNT",
        expenseAccountPrefixes: [],
        vatAccountPrefixes: [],
      };
      const result = convertDoubleEntry(DUZON_SAMPLE, config);
      // 날짜별 그룹핑, netAmount > 0인 건만 반환
      // 0401: debit(81100+81200+13500) - credit(25300+25300) 순액은 데이터에 따라 다름
      // 0402: debit(81100) - credit(25300) > 0
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((r) => r.amount > 0)).toBe(true);
    });
  });

  describe("NONE", () => {
    it("변환 없이 그대로 반환", () => {
      const config: DoubleEntryConfig = {
        mode: "NONE",
        expenseAccountPrefixes: [],
        vatAccountPrefixes: [],
      };
      const result = convertDoubleEntry(DUZON_SAMPLE, config);
      expect(result.length).toBe(4);
    });
  });
});
