// src/lib/erp-format-presets.test.ts
import { describe, expect, it } from "vitest";
import { detectPreset, getAllPresets, getPreset } from "./erp-format-presets";

describe("erp-format-presets", () => {
  describe("getPreset", () => {
    it("더존 iCUBE 프리셋 반환", () => {
      const preset = getPreset("ERP_DUZON_ICUBE");
      expect(preset).toBeDefined();
      expect(preset!.name).toBe("더존 iCUBE");
      expect(preset!.doubleEntry.mode).toBe("DEBIT_EXPENSE_ONLY");
    });

    it("SAP FI 프리셋 반환", () => {
      const preset = getPreset("ERP_SAP_FI");
      expect(preset).toBeDefined();
      expect(preset!.name).toBe("SAP S/4HANA FI");
      expect(preset!.doubleEntry.expenseAccountPrefixes).toContain("6");
    });

    it("Oracle Journal 프리셋 반환", () => {
      const preset = getPreset("ERP_ORACLE_JOURNAL");
      expect(preset).toBeDefined();
      expect(preset!.doubleEntry.expenseAccountPrefixes).toContain("EXPENSE");
    });

    it("존재하지 않는 포맷은 undefined 반환", () => {
      expect(getPreset("CARD_COMPANY")).toBeUndefined();
      expect(getPreset("UNKNOWN")).toBeUndefined();
    });
  });

  describe("detectPreset", () => {
    it("더존 iCUBE 헤더로 감지 (관리번호 포함)", () => {
      const headers = [
        "전표일자",
        "차변계정코드",
        "차변계정명",
        "대변계정코드",
        "대변계정명",
        "적요",
        "금액",
        "거래처명",
        "관리번호",
      ];
      const preset = detectPreset(headers);
      expect(preset).toBeDefined();
      expect(preset!.format).toBe("ERP_DUZON_ICUBE");
    });

    it("더존 WEHAGO 헤더로 감지 (관리번호 없음 → iCUBE required와 동일 → iCUBE 매칭)", () => {
      // detectPreset은 required만으로도 iCUBE 매칭 (distinctive는 우선순위용)
      // payment-csv.ts의 detectCSVFormat()이 관리번호 유무로 구분
      const headers = [
        "전표일자",
        "차변계정코드",
        "대변계정코드",
        "적요",
        "금액",
        "거래처명",
      ];
      const preset = detectPreset(headers);
      expect(preset).toBeDefined();
      // detectPreset은 required 매칭으로 iCUBE 반환 (관리번호 없으면 2단계에서 매칭)
      expect(preset!.format).toBe("ERP_DUZON_ICUBE");
    });

    it("SAP FI 헤더로 감지", () => {
      const headers = [
        "PostingDate",
        "GLAccount",
        "GLAccountName",
        "AmountInCompanyCodeCurrency",
        "SupplierName",
      ];
      const preset = detectPreset(headers);
      expect(preset).toBeDefined();
      expect(preset!.format).toBe("ERP_SAP_FI");
    });

    it("Oracle Journal 헤더로 감지", () => {
      const headers = [
        "AccountingDate",
        "EnteredDebit",
        "EnteredCredit",
        "AccountClass",
        "Description",
      ];
      const preset = detectPreset(headers);
      expect(preset).toBeDefined();
      expect(preset!.format).toBe("ERP_ORACLE_JOURNAL");
    });

    it("매칭되지 않는 헤더는 undefined", () => {
      const headers = ["column1", "column2", "column3"];
      expect(detectPreset(headers)).toBeUndefined();
    });
  });

  describe("getAllPresets", () => {
    it("6개 프리셋 반환", () => {
      const presets = getAllPresets();
      expect(presets.length).toBe(6);
    });
  });
});
