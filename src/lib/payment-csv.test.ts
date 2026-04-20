// src/lib/payment-csv.test.ts
import { describe, expect, it } from "vitest";
import {
  detectCSVFormat,
  normalizePaymentData,
  parsePaymentAmount,
  parsePaymentCSV,
  parsePaymentDate,
} from "./payment-csv";

describe("payment-csv", () => {
  describe("parsePaymentAmount", () => {
    it("쉼표가 포함된 금액을 파싱해야 한다", () => {
      expect(parsePaymentAmount("1,000,000")).toBe(1000000);
      expect(parsePaymentAmount("100,000")).toBe(100000);
      expect(parsePaymentAmount("1,234,567")).toBe(1234567);
    });

    it("통화 기호가 포함된 금액을 파싱해야 한다", () => {
      expect(parsePaymentAmount("₩1,000,000")).toBe(1000000);
      expect(parsePaymentAmount("\\1,000,000")).toBe(1000000);
      expect(parsePaymentAmount("$100.00")).toBe(100);
      expect(parsePaymentAmount("USD 100.00")).toBe(100);
    });

    it("원 단위 표기를 파싱해야 한다", () => {
      expect(parsePaymentAmount("1,000,000원")).toBe(1000000);
      expect(parsePaymentAmount("50,000 원")).toBe(50000);
    });

    it("숫자만 있는 금액을 파싱해야 한다", () => {
      expect(parsePaymentAmount("1000000")).toBe(1000000);
      expect(parsePaymentAmount("100")).toBe(100);
    });

    it("빈 값은 0을 반환해야 한다", () => {
      expect(parsePaymentAmount("")).toBe(0);
      expect(parsePaymentAmount("   ")).toBe(0);
    });

    it("음수 금액을 파싱해야 한다", () => {
      expect(parsePaymentAmount("-100,000")).toBe(-100000);
      expect(parsePaymentAmount("(100,000)")).toBe(-100000); // 회계 표기
    });

    it("소수점 금액을 파싱해야 한다", () => {
      expect(parsePaymentAmount("100.50")).toBe(100.5);
      expect(parsePaymentAmount("1,234.56")).toBe(1234.56);
    });
  });

  describe("parsePaymentDate", () => {
    it("YYYY-MM-DD 형식을 파싱해야 한다", () => {
      const result = parsePaymentDate("2024-01-15");
      expect(result?.toISOString().split("T")[0]).toBe("2024-01-15");
    });

    it("YYYY/MM/DD 형식을 파싱해야 한다", () => {
      const result = parsePaymentDate("2024/01/15");
      expect(result?.toISOString().split("T")[0]).toBe("2024-01-15");
    });

    it("YYYYMMDD 형식을 파싱해야 한다", () => {
      const result = parsePaymentDate("20240115");
      expect(result?.toISOString().split("T")[0]).toBe("2024-01-15");
    });

    it("YY.MM.DD 형식을 파싱해야 한다", () => {
      const result = parsePaymentDate("24.01.15");
      expect(result?.toISOString().split("T")[0]).toBe("2024-01-15");
    });

    it("YYYY.MM.DD 형식을 파싱해야 한다", () => {
      const result = parsePaymentDate("2024.01.15");
      expect(result?.toISOString().split("T")[0]).toBe("2024-01-15");
    });

    it("빈 값은 null을 반환해야 한다", () => {
      expect(parsePaymentDate("")).toBeNull();
      expect(parsePaymentDate("   ")).toBeNull();
    });

    it("유효하지 않은 날짜는 null을 반환해야 한다", () => {
      expect(parsePaymentDate("invalid")).toBeNull();
      expect(parsePaymentDate("abc123")).toBeNull();
    });
  });

  describe("detectCSVFormat", () => {
    it("카드사 형식을 감지해야 한다", () => {
      const headers = [
        "결제일",
        "가맹점명",
        "결제금액",
        "카드번호",
        "승인번호",
      ];
      expect(detectCSVFormat(headers)).toBe("CARD_COMPANY");
    });

    it("ERP 형식을 감지해야 한다 (계정과목 포함 시 이카운트 우선)", () => {
      const headers = ["거래일자", "거래처명", "출금액", "계정과목", "비고"];
      // DA-83: 이카운트 헤더 매칭이 범용 ERP보다 우선
      expect(detectCSVFormat(headers)).toBe("ERP_ECOUNT");
    });

    it("영문 카드사 형식을 감지해야 한다", () => {
      const headers = [
        "Transaction Date",
        "Merchant",
        "Amount",
        "Card Number",
        "Approval",
      ];
      expect(detectCSVFormat(headers)).toBe("CARD_COMPANY_EN");
    });

    it("알 수 없는 형식은 UNKNOWN을 반환해야 한다", () => {
      const headers = ["col1", "col2", "col3"];
      expect(detectCSVFormat(headers)).toBe("UNKNOWN");
    });

    it("부분적으로 일치하는 헤더도 감지해야 한다", () => {
      const headers = ["거래일자", "상호명", "결제금액"]; // 상호명은 가맹점명과 유사
      expect(detectCSVFormat(headers)).toBe("CARD_COMPANY");
    });
  });

  describe("normalizePaymentData", () => {
    it("카드사 CSV 데이터를 정규화해야 한다", () => {
      const row = {
        결제일: "2024-01-15",
        가맹점명: "SLACK TECHNOLOGIES",
        결제금액: "100,000",
        카드번호: "1234-****-****-5678",
        승인번호: "12345678",
      };

      const result = normalizePaymentData(row, "CARD_COMPANY");

      expect(result).toEqual({
        transactionDate: expect.any(Date),
        merchantName: "SLACK TECHNOLOGIES",
        amount: 100000,
        cardLast4: "5678",
        approvalNumber: "12345678",
        rawData: row,
      });
    });

    it("ERP CSV 데이터를 정규화해야 한다", () => {
      const row = {
        거래일자: "2024-01-15",
        거래처명: "슬랙 테크놀로지스",
        출금액: "100,000",
        계정과목: "소프트웨어비",
        비고: "1월분",
      };

      const result = normalizePaymentData(row, "ERP");

      expect(result).toEqual({
        transactionDate: expect.any(Date),
        merchantName: "슬랙 테크놀로지스",
        amount: 100000,
        category: "소프트웨어비",
        memo: "1월분",
        rawData: row,
      });
    });

    it("영문 카드사 데이터를 정규화해야 한다", () => {
      const row = {
        "Transaction Date": "2024-01-15",
        Merchant: "NOTION LABS INC",
        Amount: "$100.00",
        "Card Number": "**** 9876",
      };

      const result = normalizePaymentData(row, "CARD_COMPANY_EN");

      expect(result).toEqual({
        transactionDate: expect.any(Date),
        merchantName: "NOTION LABS INC",
        amount: 100,
        cardLast4: "9876",
        rawData: row,
      });
    });
  });

  describe("parsePaymentDate - datetime format", () => {
    it("YYYY-MM-DD HH:MM:SS 형식에서 날짜 부분만 추출해야 한다", () => {
      const result = parsePaymentDate("2025-09-01 12:06:02");
      expect(result?.toISOString().split("T")[0]).toBe("2025-09-01");
    });

    it("YYYY-MM-DD HH:MM 형식도 처리해야 한다", () => {
      const result = parsePaymentDate("2025-12-25 09:30");
      expect(result?.toISOString().split("T")[0]).toBe("2025-12-25");
    });

    it("기존 YYYY-MM-DD 형식은 영향 없이 파싱해야 한다", () => {
      const result = parsePaymentDate("2025-09-01");
      expect(result?.toISOString().split("T")[0]).toBe("2025-09-01");
    });
  });

  describe("parsePaymentCSV", () => {
    it("카드사 CSV를 파싱해야 한다", () => {
      const csv = `결제일,가맹점명,결제금액,카드번호,승인번호
2024-01-15,SLACK TECHNOLOGIES,100000,1234-****-****-5678,12345678
2024-01-16,NOTION LABS,50000,1234-****-****-5678,12345679`;

      const result = parsePaymentCSV(csv);

      expect(result.success).toBe(true);
      expect(result.format).toBe("CARD_COMPANY");
      expect(result.data).toHaveLength(2);
      expect(result.data![0].merchantName).toBe("SLACK TECHNOLOGIES");
      expect(result.data![0].amount).toBe(100000);
      expect(result.data![1].merchantName).toBe("NOTION LABS");
    });

    it("ERP CSV를 파싱해야 한다", () => {
      const csv = `거래일자,거래처명,출금액,계정과목,비고
2024-01-15,슬랙,100000,소프트웨어비,1월분
2024-01-16,노션,50000,소프트웨어비,1월분`;

      const result = parsePaymentCSV(csv);

      expect(result.success).toBe(true);
      // DA-83: 거래처명+계정과목 조합이 이카운트로 감지
      expect(result.format).toBe("ERP_ECOUNT");
      expect(result.data).toHaveLength(2);
    });

    it("빈 CSV는 에러를 반환해야 한다", () => {
      const result = parsePaymentCSV("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("빈 CSV 파일입니다");
    });

    it("헤더만 있는 CSV는 에러를 반환해야 한다", () => {
      const result = parsePaymentCSV("결제일,가맹점명,결제금액");

      expect(result.success).toBe(false);
      expect(result.error).toBe("데이터가 없습니다");
    });

    it("알 수 없는 형식은 에러를 반환해야 한다", () => {
      const csv = `col1,col2,col3
val1,val2,val3`;

      const result = parsePaymentCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBe("지원하지 않는 CSV 형식입니다");
    });

    it("유효성 검증 오류를 수집해야 한다", () => {
      const csv = `결제일,가맹점명,결제금액,카드번호,승인번호
invalid-date,SLACK,100000,1234,12345678
2024-01-16,,50000,5678,12345679`;

      const result = parsePaymentCSV(csv);

      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("쉼표가 포함된 가맹점명을 올바르게 파싱해야 한다", () => {
      const csv = `결제일,가맹점명,결제금액,카드번호,승인번호
2024-01-15,"SLACK, INC.",100000,1234,12345678`;

      const result = parsePaymentCSV(csv);

      expect(result.success).toBe(true);
      expect(result.data![0].merchantName).toBe("SLACK, INC.");
    });

    it("UTF-8 BOM을 제거해야 한다", () => {
      const csvWithBOM = `\uFEFF결제일,가맹점명,결제금액
2024-01-15,SLACK,100000`;

      const result = parsePaymentCSV(csvWithBOM);

      expect(result.success).toBe(true);
      expect(result.format).toBe("CARD_COMPANY");
    });

    it("상단 요약 행이 있는 은행 명세서 CSV를 파싱해야 한다", () => {
      const bankCSV = `인쇄및파일저장,,,,,,,,,,,,,,,,,,,,,
"일시불 합계(원화):20,562,437",,,,,,,,,,,,,,,,,,,,,
 ,승인구분,이용구분,승인일시,카드번호,카드별명,이용가맹점명,승인금액,현지외화금액,제휴카드명,할부개월,승인금액(USD),적용환율,이용수수료,승인번호,컵보증금,할인금액,취소금액,취소일자,매출표접수일자,결제예정일자,가맹점사업자번호
143,원화,국내체크일시불,2025-09-01 12:06:02,4198-****-****-6969,동반성공카드(체크),이조,"59,000",,동반성공카드(체크),일시불,0,0,,70089704,0,0,0,,2025-09-02,2025-10-05,107-07-29331
142,원화,국내체크일시불,2025-09-01 23:16:01,4198-****-****-6969,동반성공카드(체크),엔에이치엔케이씨피(,"71,000",,동반성공카드(체크),일시불,0,0,,45915932,0,0,0,,2025-09-02,2025-10-05,113-85-21083`;

      const result = parsePaymentCSV(bankCSV);

      expect(result.success).toBe(true);
      expect(result.format).toBe("CARD_COMPANY");
      expect(result.data).toHaveLength(2);
      expect(result.data![0].merchantName).toBe("이조");
      expect(result.data![0].amount).toBe(59000);
      expect(result.data![0].transactionDate.toISOString().split("T")[0]).toBe(
        "2025-09-01"
      );
      expect(result.data![1].merchantName).toBe("엔에이치엔케이씨피(");
    });

    it("헤더 행이 1행인 일반 CSV는 기존대로 파싱해야 한다", () => {
      const normalCSV = `결제일,가맹점명,결제금액
2024-01-15,SLACK,100000`;

      const result = parsePaymentCSV(normalCSV);

      expect(result.success).toBe(true);
      expect(result.format).toBe("CARD_COMPANY");
      expect(result.data).toHaveLength(1);
    });

    it("헤더를 찾지 못하면 기존 동작을 유지해야 한다", () => {
      const unknownCSV = `title row,,,
col1,col2,col3
val1,val2,val3`;

      const result = parsePaymentCSV(unknownCSV);

      expect(result.success).toBe(false);
      expect(result.error).toBe("지원하지 않는 CSV 형식입니다");
    });
  });
});
