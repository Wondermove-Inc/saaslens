"use client";

import {
  AdvancedFilterBar,
  type FilterDefinition,
} from "@/components/common/advanced-filter-bar";
import { ColumnsDropdown } from "@/components/common/columns-dropdown";
import { KpiCard, KpiCardsGrid } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { IntegrationCreateDialog } from "@/components/integrations/integration-create-dialog";
import {
  getIntegrationListColumns,
  IntegrationsList,
} from "@/components/integrations/integrations-list";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Integration } from "@prisma/client";
import {
  type CrudFilters,
  type CrudSort,
  type HttpError,
  type Pagination,
  useCan,
  useList,
} from "@refinedev/core";
import {
  AlertTriangle,
  CheckCircle,
  Link2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

type SortOption = "created-desc" | "created-asc" | "updated-desc" | "type-asc";

interface IntegrationsPageClientProps {
  canManage: boolean;
  role?: "ADMIN" | "MEMBER" | "VIEWER";
}

const sortOptionToSorter = (sort: SortOption) => {
  switch (sort) {
    case "created-asc":
      return { field: "createdAt", order: "asc" as const };
    case "updated-desc":
      return { field: "updatedAt", order: "desc" as const };
    case "type-asc":
      return { field: "type", order: "asc" as const };
    case "created-desc":
    default:
      return { field: "createdAt", order: "desc" as const };
  }
};

export function IntegrationsPageClient({
  canManage,
  role = "VIEWER",
}: IntegrationsPageClientProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({
    status: new Set<string>(),
    type: new Set<string>(),
  });
  const [sort] = useState<SortOption>("created-desc");
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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

  const filters: CrudFilters = useMemo(
    () => [
      {
        field: "search",
        operator: "contains",
        value: searchQuery || undefined,
      },
      {
        field: "status",
        operator: "eq",
        value:
          selectedFilters.status.size === 1
            ? Array.from(selectedFilters.status)[0]
            : undefined,
      },
    ],
    [searchQuery, selectedFilters.status]
  );

  const sorter: CrudSort[] = useMemo(() => [sortOptionToSorter(sort)], [sort]);

  const pagination: Pagination = { currentPage, pageSize, mode: "server" };

  const { data: createAccess } = useCan({
    resource: "integrations",
    action: "create",
    params: { user: { role } },
    queryOptions: { enabled: true },
  });

  const { data: deleteAccess } = useCan({
    resource: "integrations",
    action: "delete",
    params: { user: { role } },
    queryOptions: { enabled: true },
  });

  const canManageActions = role === "ADMIN" || role === "MEMBER" || canManage;
  const canCreate = createAccess?.can ?? canManageActions;
  const canDelete = deleteAccess?.can ?? role === "ADMIN";

  const { query, result } = useList<Integration, HttpError>({
    resource: "integrations",
    filters,
    sorters: sorter,
    pagination,
  });

  const { data, isLoading, refetch } = query;
  const integrations = useMemo(
    () => result.data ?? data?.data ?? [],
    [result.data, data?.data]
  );
  const total = result.total ?? data?.total ?? 0;

  // 통계 계산
  const stats = useMemo(() => {
    const activeCount = integrations.filter(
      (i) => i.status === "ACTIVE"
    ).length;
    const pendingCount = integrations.filter(
      (i) => i.status === "PENDING"
    ).length;
    const errorCount = integrations.filter((i) => i.status === "ERROR").length;
    return { activeCount, pendingCount, errorCount };
  }, [integrations]);

  // 필터 정의
  const filterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        id: "status",
        title: t("integrations.filters.status.label"),
        options: [
          { label: t("integrations.filters.status.active"), value: "ACTIVE" },
          { label: t("integrations.filters.status.pending"), value: "PENDING" },
          { label: t("integrations.filters.status.error"), value: "ERROR" },
          {
            label: t("integrations.filters.status.disconnected"),
            value: "DISCONNECTED",
          },
        ],
      },
      {
        id: "type",
        title: t("integrations.filters.type.label"),
        options: [
          {
            label: t("integrations.type.googleWorkspace"),
            value: "GOOGLE_WORKSPACE",
          },
          {
            label: t("integrations.type.microsoftEntra"),
            value: "MICROSOFT_ENTRA",
          },
          { label: t("integrations.type.okta"), value: "OKTA" },
        ],
      },
    ],
    [t]
  );

  const handleFilterChange = (filterId: string, values: Set<string>) => {
    setSelectedFilters((prev) => ({ ...prev, [filterId]: values }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: new Set<string>(),
      type: new Set<string>(),
    });
    setCurrentPage(1);
  };

  // 클라이언트 측 필터링 (type)
  const filteredIntegrations = useMemo(() => {
    let result = integrations;

    if (selectedFilters.type.size > 0) {
      result = result.filter((i) => selectedFilters.type.has(i.type));
    }

    return result;
  }, [integrations, selectedFilters.type]);

  // 로딩 상태 - Skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Page Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50 rounded-sm shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Bar Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Table Skeleton */}
        <Card className="rounded-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <PageHeader
        title={t("integrations.page.title")}
        actions={[
          {
            label: t("integrations.actions.new"),
            icon: Plus,
            onClick: () => setIsCreateDialogOpen(true),
            disabled: !canCreate || isLoading,
          },
        ]}
      />

      {/* 연동 추가 다이얼로그 */}
      <IntegrationCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => refetch()}
      />

      {/* 통계 카드 */}
      <KpiCardsGrid columns={4}>
        <KpiCard
          title={t("integrations.kpi.total")}
          value={total}
          icon={Link2}
        />
        <KpiCard
          title={t("integrations.kpi.active")}
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
        <KpiCard
          title={t("integrations.kpi.pending")}
          value={stats.pendingCount}
          icon={RefreshCw}
        />
        <KpiCard
          title={t("integrations.kpi.error")}
          value={stats.errorCount}
          icon={AlertTriangle}
        />
      </KpiCardsGrid>

      {/* 필터 툴바 */}
      <AdvancedFilterBar
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t("integrations.list.searchPlaceholder")}
        filters={filterDefinitions}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        onClearAllFilters={clearAllFilters}
      >
        <ColumnsDropdown
          columns={getIntegrationListColumns(t)}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />
      </AdvancedFilterBar>

      {/* 연동 목록 */}
      <IntegrationsList
        integrations={filteredIntegrations}
        canManage={canManageActions}
        canDelete={canDelete}
        onRefresh={refetch}
        isLoading={isLoading}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        hideToolbar
      />
    </div>
  );
}
