// src/lib/services/export/excel.ts
/**
 * Excel 내보내기 서비스
 * exceljs를 사용하여 Excel 파일 생성
 */

import ExcelJS from "exceljs";

export interface ExcelColumn<T = unknown> {
  key: keyof T | string;
  header: string;
  width?: number;
  style?: Partial<ExcelJS.Style>;
  formatter?: (value: unknown, row: T) => unknown;
}

export interface ExcelSheetConfig<T = unknown> {
  sheetName: string;
  columns: ExcelColumn<T>[];
  data: T[];
  title?: string;
  headerStyle?: Partial<ExcelJS.Style>;
}

const DEFAULT_HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  },
  alignment: { horizontal: "center", vertical: "middle" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

const DEFAULT_TITLE_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 14 },
  alignment: { horizontal: "left", vertical: "middle" },
};

/**
 * Excel 워크북 생성
 */
export async function generateExcelWorkbook<T>(
  config: ExcelSheetConfig<T>
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SaaS Management Platform";
  workbook.created = new Date();

  addWorksheetToWorkbook(workbook, config);

  return workbook;
}

/**
 * 워크북에 워크시트 추가
 */
export function addWorksheetToWorkbook<T>(
  workbook: ExcelJS.Workbook,
  config: ExcelSheetConfig<T>
): ExcelJS.Worksheet {
  const {
    sheetName,
    columns,
    data,
    title,
    headerStyle = DEFAULT_HEADER_STYLE,
  } = config;

  const worksheet = workbook.addWorksheet(sheetName);

  // 열 너비 설정
  columns.forEach((col, index) => {
    const column = worksheet.getColumn(index + 1);
    if (col.width) {
      column.width = col.width;
    }
  });

  let currentRow = 1;

  // 제목 행 추가 (있는 경우)
  if (title) {
    const titleRow = worksheet.getRow(currentRow);
    titleRow.getCell(1).value = title;
    titleRow.getCell(1).style = DEFAULT_TITLE_STYLE;

    // 제목 셀 병합
    worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
    currentRow++;
  }

  // 헤더 행 추가
  const headerRow = worksheet.getRow(currentRow);
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.style = headerStyle;
  });
  headerRow.height = 25;
  currentRow++;

  // 데이터 행 추가
  data.forEach((rowData) => {
    const row = worksheet.getRow(currentRow);

    columns.forEach((col, index) => {
      const cell = row.getCell(index + 1);
      const value = rowData[col.key as keyof T];

      // formatter가 있으면 적용
      cell.value = col.formatter
        ? (col.formatter(value, rowData) as ExcelJS.CellValue)
        : (value as ExcelJS.CellValue);

      // 셀 스타일 적용
      if (col.style) {
        cell.style = col.style;
      }

      // 기본 테두리
      cell.border = {
        top: { style: "thin", color: { argb: "FFD0D0D0" } },
        left: { style: "thin", color: { argb: "FFD0D0D0" } },
        bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
        right: { style: "thin", color: { argb: "FFD0D0D0" } },
      };
    });

    currentRow++;
  });

  // 필터 활성화 (헤더에)
  if (data.length > 0) {
    const headerRowNum = title ? 2 : 1;
    worksheet.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: columns.length },
    };
  }

  return worksheet;
}

/**
 * 워크북을 Buffer로 변환
 */
export async function workbookToBuffer(
  workbook: ExcelJS.Workbook
): Promise<ArrayBuffer> {
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as ArrayBuffer;
}

/**
 * 워크북을 Blob으로 변환 (클라이언트 사이드)
 */
export async function workbookToBlob(
  workbook: ExcelJS.Workbook
): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Excel 다운로드 트리거 (클라이언트 사이드)
 */
export async function downloadExcel(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> {
  const blob = await workbookToBlob(workbook);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
