// src/app/(dashboard)/reports/renewal/_components/export-buttons.tsx
"use client";

import type { ReportExportConfig } from "@/components/reports/export";
import { ReportExportButton } from "@/components/reports/export";
import { createBarChartImage } from "@/lib/services/export/chart-image";
import { formatCurrency, type CSVColumn } from "@/lib/services/export/csv";
import type { ExcelColumn } from "@/lib/services/export/excel";
import type { PDFSection } from "@/lib/services/export/pdf";
import type { RenewalReportData, UpcomingRenewal } from "@/types/dashboard";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";

interface ExportButtonsProps {
  data: RenewalReportData;
  filters: {
    teamId?: string | null;
    userId?: string | null;
  };
}

function formatRenewalDate(date: Date, locale: string = "ko"): string {
  return new Date(date).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US");
}

function formatAssignedUsers(users: UpcomingRenewal["assignedUsers"]): string {
  return Array.isArray(users)
    ? users.map((user) => user.name || user.email).join(", ")
    : "-";
}

export function ExportButtons({ data }: ExportButtonsProps) {
  const t = useTranslations("reports.renewal.export");
  const locale = useLocale();

  const loadData = useCallback(async (): Promise<ReportExportConfig> => {
    const dateStr = new Date().toISOString().slice(0, 10);
    return {
      csv: buildCSVConfig(t, data, locale, dateStr),
      excel: buildExcelConfig(t, data, locale, dateStr),
      pdf: buildPDFConfig(t, data, locale, dateStr),
    };
  }, [data, t, locale]);

  return (
    <ReportExportButton loadData={loadData} formats={["csv", "excel", "pdf"]} />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslateFn = (key: any, params?: any) => string;

function buildSummaryData(t: TranslateFn, data: RenewalReportData) {
  return [
    { label: t("summary.totalCount"), value: `${data.totalCount}` },
    {
      label: t("summary.totalCost"),
      value: formatCurrency(data.totalRenewalCost, "KRW"),
    },
    { label: t("summary.within7Days"), value: `${data.within7Days.length}` },
    {
      label: t("summary.within30Days"),
      value: `${data.within7Days.length + data.within30Days.length}`,
    },
  ];
}

function buildCSVConfig(
  t: TranslateFn,
  data: RenewalReportData,
  locale: string,
  dateStr: string
): ReportExportConfig["csv"] {
  const allRenewals = [
    ...data.within7Days,
    ...data.within30Days,
    ...data.within90Days,
  ];

  const columns: CSVColumn<UpcomingRenewal>[] = [
    { key: "appName", header: t("columns.appName") },
    { key: "teamName", header: t("columns.team") },
    {
      key: "assignedUsers",
      header: t("columns.assignedUsers"),
      formatter: (v) =>
        formatAssignedUsers(v as UpcomingRenewal["assignedUsers"]),
    },
    {
      key: "renewalDate",
      header: t("columns.renewalDate"),
      formatter: (v) => formatRenewalDate(v as Date, locale),
    },
    {
      key: "amount",
      header: t("columns.amount"),
      formatter: (v, row) => formatCurrency(v as number, row.currency),
    },
    { key: "daysUntilRenewal", header: t("columns.daysLeft") },
  ];

  return {
    sheets: [
      {
        filename: `renewal-report-${dateStr}.csv`,
        columns: columns as CSVColumn<UpcomingRenewal>[],
        data: allRenewals,
      },
      {
        filename: `renewal-report-summary-${dateStr}.csv`,
        columns: [
          { key: "label", header: t("summary.label") },
          { key: "value", header: t("summary.value") },
        ],
        data: buildSummaryData(t, data),
      },
    ],
  };
}

function buildExcelConfig(
  t: TranslateFn,
  data: RenewalReportData,
  _locale: string,
  dateStr: string
): ReportExportConfig["excel"] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renewalColumns: Array<ExcelColumn<any>> = [
    { key: "appName", header: t("columns.appName"), width: 20 },
    { key: "teamName", header: t("columns.team"), width: 16 },
    {
      key: "assignedUsers",
      header: t("columns.assignedUsers"),
      width: 30,
      formatter: (value) =>
        formatAssignedUsers(value as UpcomingRenewal["assignedUsers"]),
    },
    { key: "renewalDate", header: t("columns.renewalDate"), width: 15 },
    { key: "amount", header: t("columns.amount"), width: 15 },
    { key: "daysUntilRenewal", header: t("columns.daysLeft"), width: 12 },
  ];

  return {
    filename: `renewal-report-${dateStr}.xlsx`,
    sheets: [
      {
        sheetName: t("excel.summary"),
        columns: [
          { key: "label" as const, header: t("summary.label"), width: 20 },
          { key: "value" as const, header: t("summary.value"), width: 20 },
        ],
        data: buildSummaryData(t, data),
        title: t("excel.summaryTitle"),
      },
      {
        sheetName: t("excel.within7DaysSheet"),
        columns: renewalColumns,
        data: data.within7Days,
        title: t("excel.within7DaysTitle"),
      },
      {
        sheetName: t("excel.within30DaysSheet"),
        columns: renewalColumns,
        data: data.within30Days,
        title: t("excel.within30DaysTitle"),
      },
      {
        sheetName: t("excel.within90DaysSheet"),
        columns: renewalColumns,
        data: data.within90Days,
        title: t("excel.within90DaysTitle"),
      },
    ],
  };
}

function buildPDFConfig(
  t: TranslateFn,
  data: RenewalReportData,
  locale: string,
  dateStr: string
): ReportExportConfig["pdf"] {
  const sections: PDFSection[] = [];
  const localeStr = locale === "ko" ? "ko-KR" : "en-US";

  sections.push({
    type: "keyValue",
    title: t("pdf.summary"),
    items: buildSummaryData(t, data).map((item) => ({
      label: item.label,
      value: item.value,
    })),
  });

  const renewalChart = createBarChartImage([
    {
      label: t("pdf.chartLabels.within7Days"),
      value: data.within7Days.length,
    },
    {
      label: t("pdf.chartLabels.within30Days"),
      value: data.within30Days.length,
    },
    {
      label: t("pdf.chartLabels.within90Days"),
      value: data.within90Days.length,
    },
  ]);
  if (renewalChart) {
    sections.push({
      type: "image",
      title: t("pdf.chartTitle"),
      imageDataUrl: renewalChart,
      width: 170,
      height: 80,
    });
  }

  const pdfHeaders = [
    t("columns.appName"),
    t("columns.team"),
    t("columns.assignedUsers"),
    t("columns.renewalDate"),
    t("columns.amount"),
    t("columns.dDay"),
  ];

  const mapRenewalRow = (r: UpcomingRenewal) => [
    r.appName,
    r.teamName ?? "-",
    formatAssignedUsers(r.assignedUsers),
    formatRenewalDate(r.renewalDate, locale),
    formatCurrency(r.amount, r.currency),
    `D-${r.daysUntilRenewal}`,
  ];

  if (data.within7Days.length > 0) {
    sections.push({
      type: "table",
      title: t("pdf.within7DaysTitle"),
      headers: pdfHeaders,
      rows: data.within7Days.map(mapRenewalRow),
    });
  }
  if (data.within30Days.length > 0) {
    sections.push({
      type: "table",
      title: t("pdf.within30DaysTitle"),
      headers: pdfHeaders,
      rows: data.within30Days.map(mapRenewalRow),
    });
  }
  if (data.within90Days.length > 0) {
    sections.push({
      type: "table",
      title: t("pdf.within90DaysTitle"),
      headers: pdfHeaders,
      rows: data.within90Days.map(mapRenewalRow),
    });
  }

  return {
    filename: `renewal-report-${dateStr}.pdf`,
    title: t("pdf.title"),
    subtitle: new Date().toLocaleDateString(localeStr),
    sections,
  };
}
