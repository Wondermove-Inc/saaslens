// src/components/reports/export/types.ts

import type { CSVColumn } from "@/lib/services/export/csv";
import type { ExcelSheetConfig } from "@/lib/services/export/excel";
import type { PDFSection } from "@/lib/services/export/pdf";

export type ExportFormat = "csv" | "excel" | "pdf";

export interface CSVExportSheet {
  filename: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: CSVColumn<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}

export interface ExcelExportConfig {
  filename: string;
  sheets: ExcelSheetConfig[];
}

export interface PDFExportConfig {
  filename: string;
  title: string;
  subtitle?: string;
  organizationName?: string;
  sections: PDFSection[];
}

export interface CSVExportConfig {
  sheets: CSVExportSheet[];
}

export interface ReportExportConfig {
  csv?: CSVExportConfig;
  excel?: ExcelExportConfig;
  pdf?: PDFExportConfig;
}

export interface UseReportExportOptions {
  loadData: () => Promise<ReportExportConfig>;
}

export interface UseReportExportReturn {
  isExporting: boolean;
  handleExport: (format: ExportFormat) => Promise<void>;
}
