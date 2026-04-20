"use client";

import { AppList, getAppListColumns } from "@/components/apps/app-list";
import {
  AdvancedFilterBar,
  type FilterDefinition,
} from "@/components/common/advanced-filter-bar";
import { ColumnsDropdown } from "@/components/common/columns-dropdown";
import { KpiCard, KpiCardsGrid } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppListItem } from "@/types/app";
import { useCan, useList } from "@refinedev/core";
import { AppWindow, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

type Role = "ADMIN" | "MEMBER" | "VIEWER" | null | undefined;

interface AppsPageClientProps {
  role?: Role;
}

export function AppsPageClient({ role }: AppsPageClientProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({
    status: new Set<string>(),
    category: new Set<string>(),
  });

  // 컬럼 가시성 상태 (외부에서 관리)
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});

  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      setColumnVisibility((prev) => ({
        ...prev,
        [columnId]: visible,
      }));
    },
    []
  );

  const {
    query: { data, isLoading, refetch },
  } = useList<AppListItem>({
    resource: "apps",
    pagination: { pageSize: 50 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const apps = useMemo(() => data?.data ?? [], [data?.data]);
  const total = useMemo(
    () => data?.total ?? apps.length,
    [apps.length, data?.total]
  );

  const categories = useMemo(() => {
    const unique = new Set<string>();
    apps.forEach((app) => {
      if (app.category) unique.add(app.category);
    });
    return Array.from(unique);
  }, [apps]);

  // 필터 정의
  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        id: "status",
        title: t("apps.filters.status.label"),
        options: [
          { label: t("apps.filters.status.active"), value: "ACTIVE" },
          // MVP scope: Inactive, Pending Review 필터 비활성화
          // { label: t("apps.filters.status.inactive"), value: "INACTIVE" },
          // {
          //   label: t("apps.filters.status.pendingReview"),
          //   value: "PENDING_REVIEW",
          // },
        ],
      },
      {
        id: "category",
        title: t("apps.filters.category.label"),
        options: categories.map((cat) => ({ label: cat, value: cat })),
      },
    ],
    [categories, t]
  );

  const handleFilterChange = (filterId: string, values: Set<string>) => {
    setSelectedFilters((prev) => ({ ...prev, [filterId]: values }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: new Set<string>(),
      category: new Set<string>(),
    });
  };

  // 앱 통계 계산
  const stats = useMemo(() => {
    const activeCount = apps.filter((app) => app.status === "ACTIVE").length;
    const inactiveCount = apps.filter(
      (app) => app.status === "INACTIVE"
    ).length;
    const reviewCount = apps.filter(
      (app) => app.status === "PENDING_REVIEW"
    ).length;
    return { activeCount, inactiveCount, reviewCount };
  }, [apps]);

  // 필터링된 앱 목록
  const filteredApps = useMemo(() => {
    let result = apps;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (app) =>
          app.name.toLowerCase().includes(query) ||
          app.category?.toLowerCase().includes(query)
      );
    }

    // Status 필터 (Set 기반)
    if (selectedFilters.status.size > 0) {
      result = result.filter((app) => selectedFilters.status.has(app.status));
    }

    // Category 필터 (Set 기반)
    if (selectedFilters.category.size > 0) {
      result = result.filter(
        (app) => app.category && selectedFilters.category.has(app.category)
      );
    }

    return result;
  }, [apps, searchQuery, selectedFilters]);

  const { data: createAccess } = useCan({
    resource: "apps",
    action: "create",
    params: { user: { role } },
    queryOptions: {
      enabled: !!role,
    },
  });

  const { data: deleteAccess } = useCan({
    resource: "apps",
    action: "delete",
    params: { user: { role } },
    queryOptions: {
      enabled: !!role,
    },
  });

  const canCreate =
    createAccess?.can ?? (role === "ADMIN" || role === "MEMBER");
  const canDelete = deleteAccess?.can ?? role === "ADMIN";
  const canManage = canCreate;

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <PageHeader title={t("apps.page.title")} />

      {/* 통계 카드 */}
      <KpiCardsGrid columns={2}>
        <KpiCard title={t("apps.kpi.total")} value={total} icon={AppWindow} />
        <KpiCard
          title={t("apps.kpi.active")}
          value={stats.activeCount}
          icon={CheckCircle}
          change={
            total > 0
              ? {
                  value: Math.round((stats.activeCount / total) * 100),
                  type: "neutral",
                }
              : undefined
          }
        />
        {/* MVP scope: 비활성 앱, 검토 대기 KPI 비활성화
        <KpiCard
          title={t("apps.kpi.inactive")}
          value={stats.inactiveCount}
          icon={XCircle}
        />
        <KpiCard
          title={t("apps.kpi.review")}
          value={stats.reviewCount}
          icon={Eye}
        />
        */}
      </KpiCardsGrid>

      {/* 필터 툴바 */}
      <AdvancedFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("apps.list.searchPlaceholder")}
        filters={filters}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        onClearAllFilters={clearAllFilters}
      >
        <ColumnsDropdown
          columns={getAppListColumns(t)}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />
      </AdvancedFilterBar>

      {/* 앱 목록 */}
      {isLoading ? (
        <div className="space-y-4">
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="border-border/50 rounded-sm shadow-sm">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-2 h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table Skeleton */}
          <Card className="border-border/50 rounded-sm shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-4 w-24" />
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <AppList
          apps={filteredApps}
          canManage={canManage}
          canDelete={canDelete}
          onDeleted={refetch}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          hideToolbar
        />
      )}
    </div>
  );
}
