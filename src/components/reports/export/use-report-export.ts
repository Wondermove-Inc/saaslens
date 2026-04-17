// src/components/reports/export/use-report-export.ts
"use client";

import { downloadCSV, generateCSV } from "@/lib/services/export/csv";
import {
  addWorksheetToWorkbook,
  downloadExcel,
  generateExcelWorkbook,
} from "@/lib/services/export/excel";
import { downloadPDF, generatePDFReport } from "@/lib/services/export/pdf";
import { useCallback, useState } from "react";
import type {
  ExportFormat,
  ReportExportConfig,
  UseReportExportOptions,
  UseReportExportReturn,
} from "./types";

async function exportCSV(config: ReportExportConfig) {
  if (!config.csv) return;
  for (const sheet of config.csv.sheets) {
    const csvContent = generateCSV(sheet.columns, sheet.data, {
      includeBOM: true,
    });
    downloadCSV(csvContent, sheet.filename);
  }
}

async function exportExcel(config: ReportExportConfig) {
  if (!config.excel || config.excel.sheets.length === 0) return;
  const [firstSheet, ...restSheets] = config.excel.sheets;
  const workbook = await generateExcelWorkbook(firstSheet);
  for (const sheet of restSheets) {
    addWorksheetToWorkbook(workbook, sheet);
  }
  await downloadExcel(workbook, config.excel.filename);
}

async function exportPDF(config: ReportExportConfig) {
  if (!config.pdf) return;
  const buffer = await generatePDFReport({
    title: config.pdf.title,
    subtitle: config.pdf.subtitle,
    organizationName: config.pdf.organizationName ?? "SaaS Management Platform",
    generatedAt: new Date(),
    sections: config.pdf.sections,
  });
  downloadPDF(buffer, config.pdf.filename);
}

const exporters: Record<
  ExportFormat,
  (config: ReportExportConfig) => Promise<void>
> = {
  csv: exportCSV,
  excel: exportExcel,
  pdf: exportPDF,
};

export function useReportExport({
  loadData,
}: UseReportExportOptions): UseReportExportReturn {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      try {
        const config = await loadData();
        await exporters[format](config);
      } catch (error) {
        console.error("Export failed:", error);
      } finally {
        setIsExporting(false);
      }
    },
    [loadData]
  );

  return { isExporting, handleExport };
}
