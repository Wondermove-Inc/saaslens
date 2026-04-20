// src/lib/services/export/excel.test.ts
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  addWorksheetToWorkbook,
  generateExcelWorkbook,
  type ExcelColumn,
  type ExcelSheetConfig,
} from "./excel";

describe("Excel Export Service", () => {
  describe("generateExcelWorkbook", () => {
    const columns: ExcelColumn[] = [
      { key: "name", header: "이름", width: 20 },
      { key: "email", header: "이메일", width: 30 },
      { key: "amount", header: "금액", width: 15, style: { numFmt: "#,##0" } },
    ];

    const data = [
      { name: "홍길동", email: "hong@example.com", amount: 10000 },
      { name: "김철수", email: "kim@example.com", amount: 20000 },
    ];

    it("워크북을 생성해야 한다", async () => {
      const workbook = await generateExcelWorkbook({
        sheetName: "테스트",
        columns,
        data,
      });

      expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
    });

    it("지정된 시트 이름으로 워크시트를 생성해야 한다", async () => {
      const workbook = await generateExcelWorkbook({
        sheetName: "비용 리포트",
        columns,
        data,
      });

      const worksheet = workbook.getWorksheet("비용 리포트");
      expect(worksheet).toBeDefined();
    });

    it("헤더 행을 포함해야 한다", async () => {
      const workbook = await generateExcelWorkbook({
        sheetName: "테스트",
        columns,
        data,
      });

      const worksheet = workbook.getWorksheet("테스트");
      const headerRow = worksheet?.getRow(1);

      expect(headerRow?.getCell(1).value).toBe("이름");
      expect(headerRow?.getCell(2).value).toBe("이메일");
      expect(headerRow?.getCell(3).value).toBe("금액");
    });

    it("데이터 행들을 포함해야 한다", async () => {
      const workbook = await generateExcelWorkbook({
        sheetName: "테스트",
        columns,
        data,
      });

      const worksheet = workbook.getWorksheet("테스트");
      const dataRow1 = worksheet?.getRow(2);
      const dataRow2 = worksheet?.getRow(3);

      expect(dataRow1?.getCell(1).value).toBe("홍길동");
      expect(dataRow1?.getCell(2).value).toBe("hong@example.com");
      expect(dataRow2?.getCell(1).value).toBe("김철수");
    });

    it("열 너비를 설정해야 한다", async () => {
      const workbook = await generateExcelWorkbook({
        sheetName: "테스트",
        columns,
        data,
      });

      const worksheet = workbook.getWorksheet("테스트");
      expect(worksheet?.getColumn(1).width).toBe(20);
      expect(worksheet?.getColumn(2).width).toBe(30);
    });

    it("빈 데이터는 헤더만 포함해야 한다", async () => {
      const workbook = await generateExcelWorkbook({
        sheetName: "테스트",
        columns,
        data: [],
      });

      const worksheet = workbook.getWorksheet("테스트");
      expect(worksheet?.rowCount).toBe(1);
    });

    it("제목을 포함할 수 있어야 한다", async () => {
      const workbook = await generateExcelWorkbook({
        sheetName: "테스트",
        columns,
        data,
        title: "월간 비용 리포트",
      });

      const worksheet = workbook.getWorksheet("테스트");
      const titleRow = worksheet?.getRow(1);
      expect(titleRow?.getCell(1).value).toBe("월간 비용 리포트");
    });
  });

  describe("addWorksheetToWorkbook", () => {
    it("기존 워크북에 새 워크시트를 추가해야 한다", async () => {
      const workbook = new ExcelJS.Workbook();

      const config1: ExcelSheetConfig = {
        sheetName: "시트1",
        columns: [{ key: "name", header: "이름" }],
        data: [{ name: "테스트1" }],
      };

      const config2: ExcelSheetConfig = {
        sheetName: "시트2",
        columns: [{ key: "name", header: "이름" }],
        data: [{ name: "테스트2" }],
      };

      addWorksheetToWorkbook(workbook, config1);
      addWorksheetToWorkbook(workbook, config2);

      expect(workbook.worksheets.length).toBe(2);
      expect(workbook.getWorksheet("시트1")).toBeDefined();
      expect(workbook.getWorksheet("시트2")).toBeDefined();
    });
  });
});
