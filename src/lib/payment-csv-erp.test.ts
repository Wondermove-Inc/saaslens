// src/lib/payment-csv-erp.test.ts
// DA-83: detectCSVFormat ERP 세분화 + 기존 포맷 회귀 테스트
import { describe, expect, it } from "vitest";
import {
  detectCSVFormat,
  isERPFormat,
  parsePaymentAmount,
  parsePaymentDate,
} from "./payment-csv";

describe("payment-csv - DA-83 ERP 포맷 세분화", () => {
  describe("isERPFormat", () => {
    it("ERP 계열 포맷 true", () => {
      expect(isERPFormat("ERP")).toBe(true);
      expect(isERPFormat("ERP_DUZON_ICUBE")).toBe(true);
      expect(isERPFormat("ERP_SAP_FI")).toBe(true);
      expect(isERPFormat("ERP_ORACLE_JOURNAL")).toBe(true);
      expect(isERPFormat("ERP_GENERIC")).toBe(true);
      expect(isERPFormat("CUSTOM")).toBe(true);
    });

    it("비-ERP 포맷 false", () => {
      expect(isERPFormat("CARD_COMPANY")).toBe(false);
      expect(isERPFormat("CARD_COMPANY_EN")).toBe(false);
      expect(isERPFormat("UNKNOWN")).toBe(false);
    });
  });

  describe("detectCSVFormat - 기존 포맷 회귀", () => {
    it("카드사 한글 포맷 감지", () => {
      const headers = [
        "결제일",
        "가맹점명",
        "결제금액",
        "카드번호",
        "승인번호",
      ];
      expect(detectCSVFormat(headers)).toBe("CARD_COMPANY");
    });

    it("카드사 영문 포맷 감지", () => {
      const headers = ["Transaction Date", "Merchant", "Amount", "Card Number"];
      expect(detectCSVFormat(headers)).toBe("CARD_COMPANY_EN");
    });

    it("범용 ERP 포맷 감지 (계정과목 포함 시 이카운트 우선 매칭)", () => {
      // 거래처명 + 계정과목 조합이 이카운트 감지 조건과 매칭
      const headers = ["거래일자", "거래처명", "출금액", "계정과목", "비고"];
      expect(detectCSVFormat(headers)).toBe("ERP_ECOUNT");
    });

    it("범용 ERP 포맷 감지 (계정과목 없으면 ERP)", () => {
      const headers = ["거래일자", "거래처명", "출금액", "비고"];
      expect(detectCSVFormat(headers)).toBe("ERP");
    });
  });

  describe("detectCSVFormat - ERP 벤더 세분화", () => {
    it("더존 iCUBE 감지 (관리번호 포함)", () => {
      const headers = [
        "전표일자",
        "차변계정코드",
        "대변계정코드",
        "적요",
        "금액",
        "거래처명",
        "관리번호",
      ];
      expect(detectCSVFormat(headers)).toBe("ERP_DUZON_ICUBE");
    });

    it("더존 WEHAGO 감지 (관리번호 없음)", () => {
      const headers = [
        "전표일자",
        "차변계정코드",
        "대변계정코드",
        "적요",
        "금액",
      ];
      expect(detectCSVFormat(headers)).toBe("ERP_DUZON_WEHAGO");
    });

    it("SAP FI 감지", () => {
      const headers = [
        "PostingDate",
        "GLAccount",
        "AmountInCompanyCodeCurrency",
        "SupplierName",
      ];
      expect(detectCSVFormat(headers)).toBe("ERP_SAP_FI");
    });

    it("Oracle Journal 감지", () => {
      const headers = [
        "AccountingDate",
        "EnteredDebit",
        "EnteredCredit",
        "AccountClass",
      ];
      expect(detectCSVFormat(headers)).toBe("ERP_ORACLE_JOURNAL");
    });

    it("인식 불가 포맷은 UNKNOWN", () => {
      const headers = ["col1", "col2", "col3"];
      expect(detectCSVFormat(headers)).toBe("UNKNOWN");
    });
  });

  describe("parsePaymentAmount - 기존 회귀", () => {
    it("한국어 금액 파싱", () => {
      expect(parsePaymentAmount("150,000")).toBe(150000);
      expect(parsePaymentAmount("₩89,000")).toBe(89000);
    });

    it("영문 금액 파싱", () => {
      expect(parsePaymentAmount("$1,234.56")).toBe(1234.56);
    });

    it("회계 괄호 표기 (음수)", () => {
      expect(parsePaymentAmount("(1,000)")).toBe(-1000);
    });

    it("빈 값은 0", () => {
      expect(parsePaymentAmount("")).toBe(0);
      expect(parsePaymentAmount("  ")).toBe(0);
    });
  });

  describe("parsePaymentDate - 기존 회귀", () => {
    it("YYYY-MM-DD", () => {
      const d = parsePaymentDate("2026-04-01");
      expect(d).not.toBeNull();
      expect(d!.getUTCFullYear()).toBe(2026);
      expect(d!.getUTCMonth()).toBe(3);
    });

    it("YYYYMMDD", () => {
      const d = parsePaymentDate("20260401");
      expect(d).not.toBeNull();
      expect(d!.getUTCDate()).toBe(1);
    });

    it("한글 날짜", () => {
      const d = parsePaymentDate("2026년 4월 1일");
      expect(d).not.toBeNull();
    });
  });
});
