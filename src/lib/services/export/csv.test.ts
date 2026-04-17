// src/lib/services/export/csv.test.ts
import { describe, expect, it } from "vitest";
import {
  escapeCSVValue,
  formatCurrency,
  formatDate,
  generateCSV,
  type CSVColumn,
} from "./csv";

describe("CSV Export Service", () => {
  describe("escapeCSVValue", () => {
    it("일반 문자열은 그대로 반환해야 한다", () => {
      expect(escapeCSVValue("hello")).toBe("hello");
    });

    it("쉼표가 포함된 문자열은 따옴표로 감싸야 한다", () => {
      expect(escapeCSVValue("hello, world")).toBe('"hello, world"');
    });

    it("따옴표가 포함된 문자열은 이스케이프해야 한다", () => {
      expect(escapeCSVValue('say "hello"')).toBe('"say ""hello"""');
    });

    it("줄바꿈이 포함된 문자열은 따옴표로 감싸야 한다", () => {
      expect(escapeCSVValue("line1\nline2")).toBe('"line1\nline2"');
    });

    it("null 값은 빈 문자열로 반환해야 한다", () => {
      expect(escapeCSVValue(null)).toBe("");
    });

    it("undefined 값은 빈 문자열로 반환해야 한다", () => {
      expect(escapeCSVValue(undefined)).toBe("");
    });

    it("숫자는 문자열로 변환해야 한다", () => {
      expect(escapeCSVValue(12345)).toBe("12345");
    });
  });

  describe("formatCurrency", () => {
    it("원화를 천단위 구분하여 포맷해야 한다", () => {
      expect(formatCurrency(1234567, "KRW")).toBe("₩1,234,567");
    });

    it("달러를 소수점 2자리로 포맷해야 한다", () => {
      // 한국 로케일에서 USD는 US$로 표시됨
      expect(formatCurrency(1234.56, "USD")).toBe("US$1,234.56");
    });

    it("0은 ₩0으로 표시해야 한다", () => {
      expect(formatCurrency(0, "KRW")).toBe("₩0");
    });
  });

  describe("formatDate", () => {
    it("Date 객체를 YYYY-MM-DD 형식으로 변환해야 한다", () => {
      const date = new Date("2024-12-01T00:00:00Z");
      expect(formatDate(date)).toBe("2024-12-01");
    });

    it("null 값은 빈 문자열로 반환해야 한다", () => {
      expect(formatDate(null)).toBe("");
    });

    it("문자열 날짜도 처리해야 한다", () => {
      expect(formatDate("2024-12-01")).toBe("2024-12-01");
    });
  });

  describe("generateCSV", () => {
    const columns: CSVColumn[] = [
      { key: "name", header: "이름" },
      { key: "email", header: "이메일" },
      { key: "amount", header: "금액" },
    ];

    const data = [
      { name: "홍길동", email: "hong@example.com", amount: 10000 },
      { name: "김철수", email: "kim@example.com", amount: 20000 },
    ];

    it("헤더 행을 포함해야 한다", () => {
      const csv = generateCSV(columns, data);
      const lines = csv.split("\n");
      expect(lines[0]).toBe("이름,이메일,금액");
    });

    it("데이터 행들을 포함해야 한다", () => {
      const csv = generateCSV(columns, data);
      const lines = csv.split("\n");
      expect(lines[1]).toBe("홍길동,hong@example.com,10000");
      expect(lines[2]).toBe("김철수,kim@example.com,20000");
    });

    it("빈 데이터는 헤더만 반환해야 한다", () => {
      const csv = generateCSV(columns, []);
      expect(csv).toBe("이름,이메일,금액");
    });

    it("formatter 함수를 적용해야 한다", () => {
      const columnsWithFormatter: CSVColumn[] = [
        { key: "name", header: "이름" },
        {
          key: "amount",
          header: "금액",
          formatter: (value) => formatCurrency(value as number, "KRW"),
        },
      ];

      const csv = generateCSV(columnsWithFormatter, data);
      const lines = csv.split("\n");
      expect(lines[1]).toContain("₩10,000");
    });

    it("특수 문자가 포함된 값을 이스케이프해야 한다", () => {
      const specialData = [
        { name: "홍, 길동", email: "test@test.com", amount: 0 },
      ];
      const csv = generateCSV(columns, specialData);
      const lines = csv.split("\n");
      expect(lines[1]).toContain('"홍, 길동"');
    });

    it("BOM을 포함한 UTF-8 CSV를 생성할 수 있어야 한다", () => {
      const csv = generateCSV(columns, data, { includeBOM: true });
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });
  });
});
