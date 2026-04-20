// src/app/(dashboard)/reports/usage/page.client.tsx
"use client";

import type {
  UsageReportData,
  UsageReportFilters,
} from "@/actions/usage-analytics";
import { getUsageExportData, getUsageReport } from "@/actions/usage-analytics";
import { DateRangeSelector } from "@/components/common/date-range-selector";
import {
  TeamUserFilter,
  type TeamFilterOption,
  type UserFilterOption,
} from "@/components/reports/team-user-filter";
import {
  ActiveUsersChart,
  AppUsageChart,
  UnusedAppsTable,
  UsageStatsCards,
} from "@/components/reports/usage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createBarChartImage,
  createLineChartImage,
} from "@/lib/services/export/chart-image";
import { generateCSV, type CSVColumn } from "@/lib/services/export/csv";
import {
  addWorksheetToWorkbook,
  generateExcelWorkbook,
  workbookToBlob,
} from "@/lib/services/export/excel";
import {
  downloadPDF,
  generatePDFReport,
  type PDFSection,
} from "@/lib/services/export/pdf";
import { format } from "date-fns";
import {
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

interface UsageReportPageClientProps {
  initialData: UsageReportData;
  initialFilters: UsageReportFilters;
  teams: TeamFilterOption[];
  users: UserFilterOption[];
  canExport: boolean;
  includeAllOption: boolean;
  presets: { value: string; label: string }[];
}

export function UsageReportPageClient({
  initialData,
  initialFilters,
  teams,
  users,
  canExport,
  includeAllOption,
  presets,
}: UsageReportPageClientProps) {
  const t = useTranslations("reports.usage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const [reportData, setReportData] = useState<UsageReportData>(initialData);
  const [filters, setFilters] = useState<UsageReportFilters>(initialFilters);

  // 기간 변경 핸들러
  const updateUrlParams = useCallback(
    (nextFilters: UsageReportFilters) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", nextFilters.period);
      params.set("startDate", nextFilters.startDate);
      params.set("endDate", nextFilters.endDate);

      if (nextFilters.teamId) {
        params.set("teamId", nextFilters.teamId);
      } else {
        params.delete("teamId");
      }

      if (nextFilters.userId) {
        params.set("userId", nextFilters.userId);
      } else {
        params.delete("userId");
      }

      router.push(`/reports/usage?${params.toString()}`);
    },
    [router, searchParams]
  );

  const refreshReportData = useCallback((nextFilters: UsageReportFilters) => {
    startTransition(async () => {
      const newData = await getUsageReport(nextFilters);
      setReportData(newData);
    });
  }, []);

  const handleTeamChange = useCallback(
    (nextTeamId: string | null) => {
      const nextFilters = {
        ...filters,
        teamId: nextTeamId ?? undefined,
        userId: undefined,
      };
      setFilters(nextFilters);
      updateUrlParams(nextFilters);
      refreshReportData(nextFilters);
    },
    [filters, refreshReportData, updateUrlParams]
  );

  const handleUserChange = useCallback(
    (nextUserId: string | null) => {
      const nextFilters = {
        ...filters,
        userId: nextUserId ?? undefined,
      };
      setFilters(nextFilters);
      updateUrlParams(nextFilters);
      refreshReportData(nextFilters);
    },
    [filters, refreshReportData, updateUrlParams]
  );

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const exportData = await getUsageExportData(filters);

      const summaryColumns: CSVColumn<{ label: string; value: string }>[] = [
        { key: "label", header: t("export.common.item") },
        { key: "value", header: t("export.common.value") },
      ];
      const summaryRows = [
        {
          label: t("export.summary.totalActiveUsers"),
          value: exportData.summary.totalActiveUsers.toString(),
        },
        {
          label: t("export.summary.totalApps"),
          value: exportData.summary.totalApps.toString(),
        },
        {
          label: t("export.summary.unusedAppsCount"),
          value: exportData.summary.unusedAppsCount.toString(),
        },
        {
          label: t("export.summary.averageUsageRate"),
          value: `${exportData.summary.averageUsageRate}%`,
        },
      ];

      const summaryCSV = generateCSV(summaryColumns, summaryRows, {
        includeBOM: true,
      });
      const trendCSV = generateCSV(
        [
          { key: "date", header: t("export.common.date") },
          { key: "count", header: t("export.common.activeUserCount") },
        ],
        exportData.activeUsersTrend,
        { includeBOM: true }
      );
      const appUsageCSV = generateCSV(
        [
          { key: "appName", header: t("export.common.appName") },
          { key: "userCount", header: t("export.common.userCount") },
          { key: "usageRate", header: t("export.common.usageRate") },
        ],
        exportData.appUsage,
        { includeBOM: true }
      );
      const unusedAppsCSV = generateCSV(
        [
          { key: "appName", header: t("export.common.appName") },
          { key: "lastUsedAt", header: t("export.common.lastUsed") },
          { key: "licenseCount", header: t("export.common.licenseCount") },
        ],
        exportData.unusedApps,
        { includeBOM: true }
      );

      const downloads = [
        {
          name: `usage-summary-${format(new Date(), "yyyy-MM-dd")}.csv`,
          content: summaryCSV,
        },
        {
          name: `usage-active-users-${format(new Date(), "yyyy-MM-dd")}.csv`,
          content: trendCSV,
        },
        {
          name: `usage-app-usage-${format(new Date(), "yyyy-MM-dd")}.csv`,
          content: appUsageCSV,
        },
        {
          name: `usage-unused-apps-${format(new Date(), "yyyy-MM-dd")}.csv`,
          content: unusedAppsCSV,
        },
      ];

      downloads.forEach((file, index) => {
        setTimeout(() => {
          const blob = new Blob([file.content], {
            type: "text/csv;charset=utf-8;",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, index * 300);
      });
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const exportData = await getUsageExportData(filters);

      const workbook = await generateExcelWorkbook({
        sheetName: t("export.summary.sheetName"),
        columns: [
          { key: "label", header: t("export.common.item"), width: 20 },
          { key: "value", header: t("export.common.value"), width: 20 },
        ],
        data: [
          {
            label: t("export.summary.totalActiveUsers"),
            value: exportData.summary.totalActiveUsers,
          },
          {
            label: t("export.summary.totalApps"),
            value: exportData.summary.totalApps,
          },
          {
            label: t("export.summary.unusedAppsCount"),
            value: exportData.summary.unusedAppsCount,
          },
          {
            label: t("export.summary.averageUsageRate"),
            value: `${exportData.summary.averageUsageRate}%`,
          },
        ],
        title: t("export.summary.title"),
      });

      addWorksheetToWorkbook(workbook, {
        sheetName: t("export.activeUsersTrend.sheetName"),
        columns: [
          { key: "date", header: t("export.common.date"), width: 15 },
          {
            key: "count",
            header: t("export.common.activeUserCount"),
            width: 18,
          },
        ],
        data: exportData.activeUsersTrend,
        title: t("export.activeUsersTrend.title"),
      });

      addWorksheetToWorkbook(workbook, {
        sheetName: t("export.appUsage.sheetName"),
        columns: [
          { key: "appName", header: t("export.common.appName"), width: 24 },
          { key: "userCount", header: t("export.common.userCount"), width: 12 },
          { key: "usageRate", header: t("export.common.usageRate"), width: 12 },
        ],
        data: exportData.appUsage,
        title: t("export.appUsage.title"),
      });

      addWorksheetToWorkbook(workbook, {
        sheetName: t("export.unusedApps.sheetName"),
        columns: [
          { key: "appName", header: t("export.common.appName"), width: 24 },
          { key: "lastUsedAt", header: t("export.common.lastUsed"), width: 18 },
          {
            key: "licenseCount",
            header: t("export.common.licenseCount"),
            width: 12,
          },
        ],
        data: exportData.unusedApps,
        title: t("export.unusedApps.title"),
      });

      const blob = await workbookToBlob(workbook);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `usage-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const exportData = await getUsageExportData(filters);
      const sections: PDFSection[] = [
        {
          type: "keyValue",
          title: t("export.pdf.sectionSummary"),
          items: [
            {
              label: t("export.summary.totalActiveUsers"),
              value: exportData.summary.totalActiveUsers.toString(),
            },
            {
              label: t("export.summary.totalApps"),
              value: exportData.summary.totalApps.toString(),
            },
            {
              label: t("export.summary.unusedAppsCount"),
              value: exportData.summary.unusedAppsCount.toString(),
            },
            {
              label: t("export.summary.averageUsageRate"),
              value: `${exportData.summary.averageUsageRate}%`,
            },
          ],
        },
      ];

      if (exportData.activeUsersTrend.length > 0) {
        const activeUsersChart = createLineChartImage(
          exportData.activeUsersTrend.map((item) => ({
            label: item.date,
            value: item.count,
          }))
        );
        if (activeUsersChart) {
          sections.push({
            type: "image",
            title: t("export.pdf.sectionActiveUsersTrend"),
            imageDataUrl: activeUsersChart,
            width: 170,
            height: 80,
          });
        }
      }

      if (exportData.appUsage.length > 0) {
        const appUsageChart = createBarChartImage(
          exportData.appUsage.map((item) => ({
            label: item.appName,
            value: Number(item.usageRate.replace("%", "")),
          }))
        );
        if (appUsageChart) {
          sections.push({
            type: "image",
            title: t("export.pdf.sectionAppUsage"),
            imageDataUrl: appUsageChart,
            width: 170,
            height: 80,
          });
        }
      }

      if (exportData.unusedApps.length > 0) {
        sections.push({
          type: "table",
          title: t("export.pdf.sectionUnusedApps"),
          headers: [
            t("export.common.appName"),
            t("export.common.lastUsed"),
            t("export.common.licenseCount"),
          ],
          rows: exportData.unusedApps.map((app) => [
            app.appName,
            app.lastUsedAt,
            app.licenseCount,
          ]),
        });
      }

      const buffer = await generatePDFReport({
        title: t("export.pdf.title"),
        subtitle: t("export.pdf.subtitle", {
          date: new Date().toLocaleDateString("ko-KR"),
        }),
        organizationName: "SaaS Management Platform",
        generatedAt: new Date(),
        sections,
      });

      downloadPDF(
        buffer,
        `usage-report-${format(new Date(), "yyyy-MM-dd")}.pdf`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더: 타이틀 + 기간 선택 + Export */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("page.title")}</h1>
        <div className="flex items-center gap-2">
          <DateRangeSelector
            currentPeriod={filters.period}
            startDate={filters.startDate}
            endDate={filters.endDate}
            presets={presets}
            basePath="/reports/usage"
            preserveParams={{
              teamId: filters.teamId ?? "",
              userId: filters.userId ?? "",
            }}
          />
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {t("filters.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="mr-2 h-4 w-4" />
                  {t("filters.exportCSV")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t("filters.exportExcel")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <File className="mr-2 h-4 w-4" />
                  {t("filters.exportPDF")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 통계 카드 */}
      <UsageStatsCards summary={reportData.summary} />

      <TeamUserFilter
        teamId={filters.teamId ?? null}
        userId={filters.userId ?? null}
        teams={teams}
        users={users}
        onTeamChange={handleTeamChange}
        onUserChange={handleUserChange}
        includeAllOption={includeAllOption}
        teamLocked={!includeAllOption}
      />

      {/* 차트 영역 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActiveUsersChart data={reportData.activeUsersTrend} />
        <AppUsageChart data={reportData.appUsageRanking} />
      </div>

      {/* 미사용 앱 테이블 */}
      <UnusedAppsTable apps={reportData.unusedApps} />
    </div>
  );
}
