// src/components/users/user-page-client.tsx
"use client";

import {
  AdvancedFilterBar,
  type FilterDefinition,
} from "@/components/common/advanced-filter-bar";
import { ColumnsDropdown } from "@/components/common/columns-dropdown";
import { KpiCard, KpiCardsGrid } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserListColumns, UserList } from "@/components/users/user-list";
import type { UserListItem } from "@/types/user";
import { useList } from "@refinedev/core";
import { UserCheck, UserMinus, UserPlus, Users, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

type Role = "ADMIN" | "MEMBER" | "VIEWER" | null | undefined;

interface UserPageClientProps {
  role?: Role;
}

export function UserPageClient({ role }: UserPageClientProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({
    status: new Set<string>(),
    role: new Set<string>(),
  });

  // 컬럼 가시성 상태 (외부에서 관리)
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});

  // 선택된 행 상태
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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
    query: { data, isLoading },
  } = useList<UserListItem>({
    resource: "users",
    pagination: { pageSize: 50 },
    sorters: [{ field: "name", order: "asc" }],
  });

  const users = useMemo(() => data?.data ?? [], [data?.data]);
  const total = useMemo(
    () => data?.total ?? users.length,
    [users.length, data?.total]
  );

  // 사용자 통계 계산
  const stats = useMemo(() => {
    const activeCount = users.filter((u) => u.status === "ACTIVE").length;
    const inactiveCount = users.filter((u) => u.status === "INACTIVE").length;
    const terminatedCount = users.filter(
      (u) => u.status === "TERMINATED"
    ).length;
    return { activeCount, inactiveCount, terminatedCount };
  }, [users]);

  // 필터 정의
  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        id: "status",
        title: t("users.filter.status"),
        options: [
          { label: t("users.status.active"), value: "ACTIVE" },
          { label: t("users.status.inactive"), value: "INACTIVE" },
          { label: t("users.status.terminated"), value: "TERMINATED" },
        ],
      },
      {
        id: "role",
        title: t("users.filter.role"),
        options: [
          { label: t("users.role.admin"), value: "ADMIN" },
          { label: t("users.role.member"), value: "MEMBER" },
          { label: t("users.role.viewer"), value: "VIEWER" },
        ],
      },
    ],
    [t]
  );

  const handleFilterChange = (filterId: string, values: Set<string>) => {
    setSelectedFilters((prev) => ({ ...prev, [filterId]: values }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: new Set<string>(),
      role: new Set<string>(),
    });
  };

  // 필터링된 사용자 목록
  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name || "").toLowerCase().includes(q) ||
          (u.department || "").toLowerCase().includes(q)
      );
    }

    // Status 필터
    if (selectedFilters.status.size > 0) {
      result = result.filter((u) => selectedFilters.status.has(u.status));
    }

    // Role 필터
    if (selectedFilters.role.size > 0) {
      result = result.filter((u) => selectedFilters.role.has(u.role));
    }

    return result;
  }, [users, searchQuery, selectedFilters]);

  // 사용자 초대는 ADMIN만 가능
  const canInvite = role === "ADMIN";

  // 로딩 상태 - Skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* 페이지 헤더 Skeleton */}
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
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-24" />
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
        title={t("users.page.title")}
        actions={[
          {
            label: t("users.page.inviteUser"),
            icon: UserPlus,
            href: "/settings/team",
            disabled: !canInvite || isLoading,
          },
        ]}
      />

      {/* 통계 카드 */}
      <KpiCardsGrid columns={4}>
        <KpiCard title={t("users.kpi.total")} value={total} icon={Users} />
        <KpiCard
          title={t("users.kpi.active")}
          value={stats.activeCount}
          icon={UserCheck}
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
          title={t("users.kpi.inactive")}
          value={stats.inactiveCount}
          icon={UserMinus}
        />
        <KpiCard
          title={t("users.kpi.terminated")}
          value={stats.terminatedCount}
          icon={UserX}
        />
      </KpiCardsGrid>

      {/* 필터 툴바 */}
      <AdvancedFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("users.table.searchPlaceholder")}
        filters={filters}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        onClearAllFilters={clearAllFilters}
      >
        <ColumnsDropdown
          columns={getUserListColumns(t)}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />
      </AdvancedFilterBar>

      {/* 사용자 목록 */}
      <UserList
        users={filteredUsers}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        hideToolbar
      />
    </div>
  );
}
