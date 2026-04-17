// src/lib/services/export/csv.ts
/**
 * CSV 내보내기 서비스
 * 데이터를 CSV 형식으로 변환하는 유틸리티 함수들
 */

export interface CSVColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string;
}

export interface CSVOptions {
  includeBOM?: boolean;
  delimiter?: string;
}

/**
 * CSV 값 이스케이프
 * 쉼표, 따옴표, 줄바꿈이 포함된 값을 적절히 이스케이프
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // 쉼표, 따옴표, 줄바꿈이 포함된 경우 따옴표로 감싸기
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    // 따옴표는 두 개로 이스케이프
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return stringValue;
}

/**
 * 통화 포맷팅
 */
export function formatCurrency(
  amount: number,
  currency: string = "KRW"
): string {
  const formatter = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  });
  return formatter.format(amount);
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return "";
  }

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * CSV 문자열 생성
 */
export function generateCSV<T>(
  columns: CSVColumn<T>[],
  data: T[],
  options: CSVOptions = {}
): string {
  const { includeBOM = false, delimiter = "," } = options;

  // 헤더 행 생성
  const headers = columns
    .map((col) => escapeCSVValue(col.header))
    .join(delimiter);

  // 데이터 행 생성
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key as keyof T];
        const formattedValue = col.formatter
          ? col.formatter(value, row)
          : value;
        return escapeCSVValue(formattedValue);
      })
      .join(delimiter);
  });

  // CSV 문자열 조합
  const csvContent = [headers, ...rows].join("\n");

  // BOM 추가 (Excel에서 한글 깨짐 방지)
  if (includeBOM) {
    return "\uFEFF" + csvContent;
  }

  return csvContent;
}

/**
 * CSV Blob 생성 (다운로드용)
 */
export function createCSVBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

/**
 * CSV 다운로드 트리거 (클라이언트 사이드)
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = createCSVBlob(csvContent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
