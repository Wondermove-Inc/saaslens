// src/app/(dashboard)/reports/audit/page.client.tsx
"use client";

import {
  AdvancedFilterBar,
  type FilterDefinition,
} from "@/components/common/advanced-filter-bar";
import { DateRangeSelector } from "@/components/common/date-range-selector";
import {
  AuditLogDetailDialog,
  AuditLogTable,
} from "@/components/reports/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  AuditLogEntry,
  AuditLogFilterOptions,
  AuditLogFilters,
} from "@/types/audit";
import { Download, File, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

interface AuditLogPageClientProps {
  initialLogs: AuditLogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filterOptions: AuditLogFilterOptions;
  initialFilters: AuditLogFilters;
  canExport: boolean;
  presets: Array<{ value: string; label: string }>;
  currentPeriod: string;
  currentStartDate: string;
  currentEndDate: string;
}

export function AuditLogPageClient({
  initialLogs,
  filterOptions,
  initialFilters,
  canExport,
  presets,
  currentPeriod,
  currentStartDate,
  currentEndDate,
}: AuditLogPageClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const actionLabels: Record<string, string> = {
    CREATE: t("reports.audit.actions.create"),
    UPDATE: t("reports.audit.actions.update"),
    DELETE: t("reports.audit.actions.delete"),
    LOGIN: t("reports.audit.actions.login"),
    LOGOUT: t("reports.audit.actions.logout"),
    SYNC: t("reports.audit.actions.sync"),
    EXPORT: t("reports.audit.actions.export"),
    IMPORT: t("reports.audit.actions.import"),
  };

  const entityTypeLabels: Record<string, string> = {
    App: t("reports.audit.entityTypes.app"),
    Subscription: t("reports.audit.entityTypes.subscription"),
    User: t("reports.audit.entityTypes.user"),
    Integration: t("reports.audit.entityTypes.integration"),
    Organization: t("reports.audit.entityTypes.organization"),
    Payment: t("reports.audit.entityTypes.payment"),
  };

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");

  // 필터 상태 (Set 기반)
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({
    action: initialFilters.action
      ? new Set([initialFilters.action])
      : new Set(),
    entityType: initialFilters.entityType
      ? new Set([initialFilters.entityType])
      : new Set(),
    userId: initialFilters.userId
      ? new Set([initialFilters.userId])
      : new Set(),
  });

  // URL 쿼리 업데이트 함수
  const updateUrlParams = useCallback(
    (filters: {
      search?: string;
      action?: string;
      entityType?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
    }) => {
      const params = new URLSearchParams();

      if (filters.search) params.set("search", filters.search);
      if (filters.action) params.set("action", filters.action);
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.startDate)
        params.set("startDate", `${filters.startDate}T00:00:00Z`);
      if (filters.endDate)
        params.set("endDate", `${filters.endDate}T23:59:59Z`);
      if (filters.page && filters.page > 1)
        params.set("page", filters.page.toString());

      const queryString = params.toString();
      router.push(
        queryString ? `/reports/audit?${queryString}` : "/reports/audit"
      );
    },
    [router]
  );

  // 필터 변경 핸들러 (AdvancedFilterBar용)
  const handleFilterChange = useCallback(
    (filterId: string, values: Set<string>) => {
      setSelectedFilters((prev) => ({
        ...prev,
        [filterId]: values,
      }));

      const newFilters = {
        ...selectedFilters,
        [filterId]: values,
      };

      updateUrlParams({
        search: searchQuery || undefined,
        action: Array.from(newFilters.action)[0],
        entityType: Array.from(newFilters.entityType)[0],
        userId: Array.from(newFilters.userId)[0],
        startDate: currentStartDate,
        endDate: currentEndDate,
      });
    },
    [selectedFilters, searchQuery, updateUrlParams]
  );

  // 검색 변경 핸들러
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // 모든 필터 초기화
  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedFilters({
      action: new Set(),
      entityType: new Set(),
      userId: new Set(),
    });
    router.push("/reports/audit");
  }, [router]);

  // 상세 보기 핸들러
  const handleViewDetail = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  // CSV 내보내기 핸들러
  const handleExportCSV = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", "csv");
    window.open(`/api/reports/audit/export?${params.toString()}`, "_blank");
  };

  // 필터 정의
  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        id: "action",
        title: t("reports.audit.columns.action"),
        options: filterOptions.actions.map((action) => ({
          label: actionLabels[action] || action,
          value: action,
        })),
      },
      {
        id: "entityType",
        title: t("reports.audit.columns.entity"),
        options: filterOptions.entityTypes.map((type) => ({
          label: entityTypeLabels[type] || type,
          value: type,
        })),
      },
      {
        id: "userId",
        title: t("reports.audit.columns.user"),
        options: filterOptions.users.map((user) => ({
          label: user.name || user.email,
          value: user.id,
        })),
      },
    ],
    [filterOptions, actionLabels, entityTypeLabels, t]
  );

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <AdvancedFilterBar
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("reports.audit.columns.searchPlaceholder")}
        filters={filters}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        onClearAllFilters={clearAllFilters}
      >
        {/* 기간 선택 */}
        <DateRangeSelector
          currentPeriod={currentPeriod}
          startDate={currentStartDate}
          endDate={currentEndDate}
          presets={presets}
          basePath="/reports/audit"
          preserveParams={{
            ...(searchQuery ? { search: searchQuery } : {}),
            ...(Array.from(selectedFilters.action)[0]
              ? { action: Array.from(selectedFilters.action)[0] }
              : {}),
            ...(Array.from(selectedFilters.entityType)[0]
              ? { entityType: Array.from(selectedFilters.entityType)[0] }
              : {}),
            ...(Array.from(selectedFilters.userId)[0]
              ? { userId: Array.from(selectedFilters.userId)[0] }
              : {}),
          }}
        />

        {/* 내보내기 */}
        {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="dark:!bg-transparent"
              >
                <Download className="mr-2 h-4 w-4" />
                {t("reports.audit.export.button")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="mr-2 h-4 w-4" />
                {t("reports.audit.export.csvLabel")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t("reports.audit.export.excelLabel")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <File className="mr-2 h-4 w-4" />
                {t("reports.audit.export.pdfLabel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </AdvancedFilterBar>

      {/* 테이블 */}
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          <AuditLogTable
            logs={initialLogs}
            onViewDetail={handleViewDetail}
            hideToolbar
          />
        </CardContent>
      </Card>

      {/* 상세 다이얼로그 */}
      <AuditLogDetailDialog
        log={selectedLog}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
