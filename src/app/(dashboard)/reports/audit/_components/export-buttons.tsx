// src/app/(dashboard)/reports/audit/_components/export-buttons.tsx
"use client";

import { getAuditLogExportData } from "@/actions/audit";
import type { ReportExportConfig } from "@/components/reports/export";
import { ReportExportButton } from "@/components/reports/export";
import { createBarChartImage } from "@/lib/services/export/chart-image";
import { type CSVColumn } from "@/lib/services/export/csv";
import type { PDFSection } from "@/lib/services/export/pdf";
import type { AuditLogExportEntry, AuditLogFilters } from "@/types/audit";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

interface ExportButtonsProps {
  filters: AuditLogFilters;
}

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(locale === "ko" ? "ko-KR" : "en-US");
}

function safeJsonStringify(value: Record<string, unknown> | null) {
  if (!value) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function ExportButtons({ filters }: ExportButtonsProps) {
  const t = useTranslations("reports.audit.export");
  const locale = useLocale();

  const exportFilters = useMemo(
    () => ({ ...filters, page: undefined, limit: undefined }),
    [filters]
  );

  const loadData = useCallback(async (): Promise<ReportExportConfig> => {
    const logs = await getAuditLogExportData(exportFilters);
    const dateStr = new Date().toISOString().slice(0, 10);

    return {
      csv: buildCSVConfig(t, logs, locale, dateStr),
      excel: buildExcelConfig(t, logs, locale, dateStr),
      pdf: buildPDFConfig(t, logs, locale, dateStr),
    };
  }, [exportFilters, t, locale]);

  return (
    <ReportExportButton
      loadData={loadData}
      formats={["csv", "excel", "pdf"]}
      size="sm"
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslateFn = (key: any, params?: any) => string;

function buildCSVConfig(
  t: TranslateFn,
  logs: AuditLogExportEntry[],
  locale: string,
  dateStr: string
): ReportExportConfig["csv"] {
  const columns: CSVColumn<AuditLogExportEntry>[] = [
    {
      key: "createdAt",
      header: t("columns.time"),
      formatter: (v) => formatDate(String(v), locale),
    },
    { key: "action", header: t("columns.action") },
    { key: "entityType", header: t("columns.entityType") },
    { key: "entityId", header: t("columns.entityId") },
    { key: "userName", header: t("columns.userName") },
    { key: "userEmail", header: t("columns.userEmail") },
    { key: "teamName", header: t("columns.teamName") },
    { key: "ipAddress", header: t("columns.ipAddress") },
    {
      key: "changes",
      header: t("columns.changes"),
      formatter: (v) => safeJsonStringify(v as Record<string, unknown> | null),
    },
    {
      key: "metadata",
      header: t("columns.metadata"),
      formatter: (v) => safeJsonStringify(v as Record<string, unknown> | null),
    },
  ];

  return {
    sheets: [
      {
        filename: `audit-log-${dateStr}.csv`,
        columns: columns as CSVColumn<AuditLogExportEntry>[],
        data: logs,
      },
    ],
  };
}

function buildExcelConfig(
  t: TranslateFn,
  logs: AuditLogExportEntry[],
  locale: string,
  dateStr: string
): ReportExportConfig["excel"] {
  return {
    filename: `audit-log-${dateStr}.xlsx`,
    sheets: [
      {
        sheetName: t("excel.sheetName"),
        columns: [
          { key: "createdAt", header: t("columns.time"), width: 24 },
          { key: "action", header: t("columns.action"), width: 12 },
          { key: "entityType", header: t("columns.entityType"), width: 14 },
          { key: "entityId", header: t("columns.entityId"), width: 18 },
          { key: "userName", header: t("columns.userName"), width: 16 },
          { key: "userEmail", header: t("columns.userEmail"), width: 24 },
          { key: "teamName", header: t("columns.teamName"), width: 16 },
          { key: "ipAddress", header: t("columns.ipAddress"), width: 16 },
          { key: "changes", header: t("columns.changes"), width: 40 },
          { key: "metadata", header: t("columns.metadata"), width: 40 },
        ],
        data: logs.map((log) => ({
          ...log,
          createdAt: formatDate(log.createdAt, locale),
          changes: safeJsonStringify(log.changes),
          metadata: safeJsonStringify(log.metadata),
        })),
        title: t("excel.title"),
      },
    ],
  };
}

function buildPDFConfig(
  t: TranslateFn,
  logs: AuditLogExportEntry[],
  locale: string,
  dateStr: string
): ReportExportConfig["pdf"] {
  const sections: PDFSection[] = [];
  const localeStr = locale === "ko" ? "ko-KR" : "en-US";

  sections.push({
    type: "keyValue",
    title: t("pdf.summaryTitle"),
    items: [
      {
        label: t("pdf.totalLogs"),
        value: t("pdf.logsCount", { count: logs.length }),
      },
      {
        label: t("pdf.generatedDate"),
        value: new Date().toLocaleDateString(localeStr),
      },
    ],
  });

  const actionCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] ?? 0) + 1;
    return acc;
  }, {});

  const actionChart = createBarChartImage(
    Object.entries(actionCounts).map(([action, count]) => ({
      label: action,
      value: count,
    }))
  );

  if (actionChart) {
    sections.push({
      type: "image",
      title: t("pdf.actionDistribution"),
      imageDataUrl: actionChart,
      width: 170,
      height: 80,
    });
  }

  if (logs.length > 0) {
    sections.push({
      type: "table",
      title: t("pdf.detailTitle"),
      headers: [
        t("pdf.tableHeaders.time"),
        t("pdf.tableHeaders.action"),
        t("pdf.tableHeaders.user"),
        t("pdf.tableHeaders.team"),
        t("pdf.tableHeaders.entity"),
      ],
      rows: logs.map((log) => [
        formatDate(log.createdAt, locale),
        log.action,
        log.userName || log.userEmail || "-",
        log.teamName ?? "-",
        log.entityType,
      ]),
    });
  }

  return {
    filename: `audit-log-${dateStr}.pdf`,
    title: t("pdf.title"),
    subtitle: t("pdf.subtitle", {
      date: new Date().toLocaleDateString(localeStr),
    }),
    sections,
  };
}
