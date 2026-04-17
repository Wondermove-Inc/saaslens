// src/app/(dashboard)/reports/cost/_components/export-buttons.tsx
"use client";

import {
  detectCostAnomalies,
  getCostStatistics,
  getMonthlyCostTrend,
  getTopCostApps,
} from "@/actions/cost-analytics";
import type { ReportExportConfig } from "@/components/reports/export";
import { ReportExportButton } from "@/components/reports/export";
import {
  createBarChartImage,
  createLineChartImage,
} from "@/lib/services/export/chart-image";
import { formatCurrency, type CSVColumn } from "@/lib/services/export/csv";
import type { PDFSection } from "@/lib/services/export/pdf";
import type {
  AppCostDistribution,
  CostAnomaly,
  CostStatistics,
  MonthlyCostTrend,
} from "@/types/cost-analytics";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

interface ExportButtonsProps {
  statistics: CostStatistics | null;
  trends: MonthlyCostTrend[];
  topApps: AppCostDistribution[];
  anomalies: CostAnomaly[];
  filters: {
    teamId?: string | null;
    userId?: string | null;
  };
}

export function ExportButtons({
  statistics,
  trends,
  topApps,
  anomalies,
  filters,
}: ExportButtonsProps) {
  const t = useTranslations("reports.cost.export");
  const teamId = filters.teamId ?? undefined;
  const userId = filters.userId ?? undefined;

  const loadData = useCallback(async (): Promise<ReportExportConfig> => {
    const [statisticsResult, trendResult, topAppsResult, anomaliesResult] =
      await Promise.all([
        getCostStatistics({ teamId, userId }),
        getMonthlyCostTrend({ months: 12, teamId, userId }),
        getTopCostApps({ limit: null, teamId, userId }),
        detectCostAnomalies({ teamId, userId }),
      ]);

    const stats = statisticsResult.success
      ? (statisticsResult.data?.statistics ?? null)
      : statistics;
    const trendData = trendResult.success
      ? (trendResult.data?.trends ?? [])
      : trends;
    const appData = topAppsResult.success
      ? (topAppsResult.data?.apps ?? [])
      : topApps;
    const anomalyData = anomaliesResult.success
      ? (anomaliesResult.data?.anomalies ?? [])
      : anomalies;

    const dateStr = new Date().toISOString().slice(0, 10);

    return {
      csv: buildCSVConfig(t, stats, trendData, appData, anomalyData, dateStr),
      excel: buildExcelConfig(
        t,
        stats,
        trendData,
        appData,
        anomalyData,
        dateStr
      ),
      pdf: buildPDFConfig(t, stats, trendData, appData, anomalyData, dateStr),
    };
  }, [teamId, userId, statistics, trends, topApps, anomalies, t]);

  return (
    <ReportExportButton loadData={loadData} formats={["csv", "excel", "pdf"]} />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslateFn = (key: any, params?: any) => string;

function buildSummaryRows(t: TranslateFn, stats: CostStatistics | null) {
  if (!stats) return [];
  return [
    {
      label: t("summary.totalCost"),
      value: formatCurrency(stats.totalCost, "KRW"),
    },
    {
      label: t("summary.monthlyAverage"),
      value: formatCurrency(stats.monthlyAverage, "KRW"),
    },
    { label: t("summary.vsLastMonth"), value: `${stats.costChange}%` },
    {
      label: t("summary.transactionCount"),
      value: t("summary.transactionCountValue", {
        count: stats.transactionCount,
      }),
    },
  ];
}

function buildCSVConfig(
  t: TranslateFn,
  stats: CostStatistics | null,
  trendData: MonthlyCostTrend[],
  appData: AppCostDistribution[],
  anomalyData: CostAnomaly[],
  dateStr: string
): ReportExportConfig["csv"] {
  const summaryRows = buildSummaryRows(t, stats);
  const trendColumns: CSVColumn<MonthlyCostTrend>[] = [
    { key: "displayLabel", header: t("trend.month") },
    {
      key: "totalCost",
      header: t("trend.cost"),
      formatter: (v) => formatCurrency(v as number, "KRW"),
    },
    { key: "transactionCount", header: t("trend.transactionCount") },
  ];
  const appColumns: CSVColumn<AppCostDistribution>[] = [
    { key: "appName", header: t("app.appName") },
    {
      key: "totalCost",
      header: t("app.cost"),
      formatter: (v) => formatCurrency(v as number, "KRW"),
    },
    {
      key: "percentage",
      header: t("app.percentage"),
      formatter: (v) => (v as number).toFixed(1),
    },
    { key: "transactionCount", header: t("app.transactionCount") },
  ];
  const anomalyColumns: CSVColumn<CostAnomaly>[] = [
    { key: "appName", header: t("anomaly.appName") },
    {
      key: "previousCost",
      header: t("anomaly.previousCost"),
      formatter: (v) => formatCurrency(v as number, "KRW"),
    },
    {
      key: "currentCost",
      header: t("anomaly.currentCost"),
      formatter: (v) => formatCurrency(v as number, "KRW"),
    },
    { key: "changeRate", header: t("anomaly.changeRate") },
    { key: "severity", header: t("anomaly.severity") },
  ];

  const sheets = [
    ...(summaryRows.length > 0
      ? [
          {
            filename: `cost-analysis-summary-${dateStr}.csv`,
            columns: [
              { key: "label", header: t("summary.label") },
              { key: "value", header: t("summary.value") },
            ],
            data: summaryRows,
          },
        ]
      : []),
    {
      filename: `cost-analysis-trends-${dateStr}.csv`,
      columns: trendColumns as CSVColumn<MonthlyCostTrend>[],
      data: trendData,
    },
    {
      filename: `cost-analysis-apps-${dateStr}.csv`,
      columns: appColumns as CSVColumn<AppCostDistribution>[],
      data: appData,
    },
    ...(anomalyData.length > 0
      ? [
          {
            filename: `cost-analysis-anomalies-${dateStr}.csv`,
            columns: anomalyColumns as CSVColumn<CostAnomaly>[],
            data: anomalyData,
          },
        ]
      : []),
  ];

  return { sheets };
}

function buildExcelConfig(
  t: TranslateFn,
  stats: CostStatistics | null,
  trendData: MonthlyCostTrend[],
  appData: AppCostDistribution[],
  anomalyData: CostAnomaly[],
  dateStr: string
): ReportExportConfig["excel"] {
  const summaryData = buildSummaryRows(t, stats);

  const sheets = [
    {
      sheetName: t("excel.summary"),
      columns: [
        { key: "label", header: t("summary.label"), width: 20 },
        { key: "value", header: t("summary.value"), width: 20 },
      ],
      data: summaryData,
      title: t("excel.summaryTitle"),
    },
    {
      sheetName: t("excel.trendSheet"),
      columns: [
        { key: "displayLabel", header: t("trend.month"), width: 15 },
        { key: "totalCost", header: t("trend.cost"), width: 20 },
        {
          key: "transactionCount",
          header: t("trend.transactionCount"),
          width: 15,
        },
      ],
      data: trendData,
      title: t("excel.trendTitle"),
    },
    {
      sheetName: t("excel.appSheet"),
      columns: [
        { key: "appName", header: t("app.appName"), width: 20 },
        { key: "totalCost", header: t("app.cost"), width: 20 },
        { key: "percentage", header: t("app.percentage"), width: 15 },
        {
          key: "transactionCount",
          header: t("app.transactionCount"),
          width: 15,
        },
      ],
      data: appData,
      title: t("excel.appTitle"),
    },
    ...(anomalyData.length > 0
      ? [
          {
            sheetName: t("excel.anomalySheet"),
            columns: [
              { key: "appName", header: t("anomaly.appName"), width: 20 },
              {
                key: "previousCost",
                header: t("anomaly.previousCost"),
                width: 20,
              },
              {
                key: "currentCost",
                header: t("anomaly.currentCost"),
                width: 20,
              },
              {
                key: "changeRate",
                header: t("anomaly.changeRate"),
                width: 15,
              },
              { key: "severity", header: t("anomaly.severity"), width: 15 },
            ],
            data: anomalyData,
            title: t("excel.anomalyTitle"),
          },
        ]
      : []),
  ];

  return { filename: `cost-analysis-${dateStr}.xlsx`, sheets };
}

function buildPDFConfig(
  t: TranslateFn,
  stats: CostStatistics | null,
  trendData: MonthlyCostTrend[],
  appData: AppCostDistribution[],
  anomalyData: CostAnomaly[],
  dateStr: string
): ReportExportConfig["pdf"] {
  const sections: PDFSection[] = [];

  if (stats) {
    sections.push({
      type: "keyValue",
      title: t("pdf.keyMetrics"),
      items: [
        {
          label: t("summary.totalCost"),
          value: formatCurrency(stats.totalCost, "KRW"),
        },
        {
          label: t("pdf.monthlyAverage"),
          value: formatCurrency(stats.monthlyAverage, "KRW"),
        },
        { label: t("summary.vsLastMonth"), value: `${stats.costChange}%` },
        {
          label: t("summary.transactionCount"),
          value: t("summary.transactionCountValue", {
            count: stats.transactionCount,
          }),
        },
      ],
    });
  }

  if (trendData.length > 0) {
    const trendChart = createLineChartImage(
      trendData.map((item) => ({
        label: item.displayLabel,
        value: item.totalCost,
      }))
    );
    if (trendChart) {
      sections.push({
        type: "image",
        title: t("pdf.trendTitle"),
        imageDataUrl: trendChart,
        width: 170,
        height: 80,
      });
    }
    sections.push({
      type: "table",
      title: t("pdf.trendTitle"),
      headers: [
        t("pdf.trendHeaders.month"),
        t("pdf.trendHeaders.cost"),
        t("pdf.trendHeaders.transactionCount"),
      ],
      rows: trendData.map((tr) => [
        tr.displayLabel,
        formatCurrency(tr.totalCost, "KRW"),
        tr.transactionCount.toString(),
      ]),
    });
  }

  if (appData.length > 0) {
    const appChart = createBarChartImage(
      appData.map((app) => ({ label: app.appName, value: app.totalCost }))
    );
    if (appChart) {
      sections.push({
        type: "image",
        title: t("pdf.distributionTitle"),
        imageDataUrl: appChart,
        width: 170,
        height: 80,
      });
    }
    sections.push({
      type: "table",
      title: t("pdf.distributionTitle"),
      headers: [
        t("pdf.distributionHeaders.appName"),
        t("pdf.distributionHeaders.cost"),
        t("pdf.distributionHeaders.percentage"),
      ],
      rows: appData.map((a) => [
        a.appName,
        formatCurrency(a.totalCost, "KRW"),
        `${a.percentage.toFixed(1)}%`,
      ]),
    });
  }

  if (anomalyData.length > 0) {
    sections.push({
      type: "table",
      title: t("pdf.anomalyTitle"),
      headers: [
        t("pdf.anomalyHeaders.appName"),
        t("pdf.anomalyHeaders.previousMonth"),
        t("pdf.anomalyHeaders.thisMonth"),
        t("pdf.anomalyHeaders.changeRate"),
      ],
      rows: anomalyData.map((a) => [
        a.appName,
        formatCurrency(a.previousCost, "KRW"),
        formatCurrency(a.currentCost, "KRW"),
        `+${a.changeRate}%`,
      ]),
    });
  }

  return {
    filename: `cost-analysis-${dateStr}.pdf`,
    title: t("pdf.title"),
    subtitle: new Date().toLocaleDateString(),
    sections,
  };
}
