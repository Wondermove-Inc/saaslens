// src/components/users/user-list.tsx
"use client";

import {
  DataTable,
  useDataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { formatKoreanDate } from "@/lib/date";
import type { UserListItem } from "@/types/user";
import type { UserRole, UserStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

interface UserListProps {
  users: UserListItem[];
  // 외부에서 컬럼 가시성 상태 제어 시 사용
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  hideToolbar?: boolean;
  // 외부에서 선택 행 상태 제어 시 사용
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (rows: Set<string>) => void;
}

// URL이 유효한 이미지 URL인지 확인
function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const statusVariants: Record<
  UserStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  INACTIVE: "outline",
  TERMINATED: "destructive",
};

const roleVariants: Record<
  UserRole,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SUPER_ADMIN: "default",
  ADMIN: "default",
  MEMBER: "secondary",
  VIEWER: "outline",
};

// 컬럼 가시성 드롭다운에서 사용할 컬럼 정의 (외부 노출용) - 함수로 변환
export function getUserListColumns(t: ReturnType<typeof useTranslations>) {
  return [
    { id: "user", header: t("users.table.columns.user") },
    { id: "role", header: t("users.table.columns.role") },
    { id: "status", header: t("users.table.columns.status") },
    { id: "department", header: t("users.table.columns.department") },
    { id: "assignedAppCount", header: t("users.table.columns.appAccessCount") },
    { id: "lastLoginAt", header: t("users.table.columns.lastLoginAt") },
  ];
}

export function UserList({
  users,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange: externalOnColumnVisibilityChange,
  hideToolbar = false,
  selectedRows: externalSelectedRows,
  onSelectedRowsChange: externalOnSelectedRowsChange,
}: UserListProps) {
  const t = useTranslations();
  const {
    selectedRows: internalSelectedRows,
    setSelectedRows: internalSetSelectedRows,
    columnVisibility: internalColumnVisibility,
    handleColumnVisibilityChange: internalHandleColumnVisibilityChange,
    sortState,
    setSortState,
    pagination,
    setPagination,
  } = useDataTable({ defaultPageSize: 10 });

  const statusLabels: Record<UserStatus, string> = {
    ACTIVE: t("users.status.active"),
    INACTIVE: t("users.status.inactive"),
    TERMINATED: t("users.status.terminated"),
  };

  const roleLabels: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: t("users.role.admin"),
    MEMBER: t("users.role.member"),
    VIEWER: t("users.role.viewer"),
  };

  // 외부 상태가 제공되면 외부 상태 사용, 아니면 내부 상태 사용
  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    externalOnColumnVisibilityChange ?? internalHandleColumnVisibilityChange;
  const selectedRows = externalSelectedRows ?? internalSelectedRows;
  const setSelectedRows =
    externalOnSelectedRowsChange ?? internalSetSelectedRows;

  // 컬럼 정의
  const columns: DataTableColumn<UserListItem>[] = useMemo(
    () => [
      {
        id: "user",
        header: t("users.table.columns.user"),
        sortable: true,
        cell: (user) => (
          <Link
            href={`/users/${user.id}`}
            className="flex items-center gap-3 hover:underline"
          >
            {isValidImageUrl(user.avatarUrl) ? (
              <Image
                src={user.avatarUrl!}
                alt={user.name || user.email}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                {(user.name || user.email).charAt(0)}
              </div>
            )}
            <div>
              <div className="font-medium">{user.name || "-"}</div>
              <div className="text-muted-foreground text-sm">{user.email}</div>
            </div>
          </Link>
        ),
      },
      {
        id: "role",
        header: t("users.table.columns.role"),
        cell: (user) => (
          <Badge variant={roleVariants[user.role]}>
            {roleLabels[user.role]}
          </Badge>
        ),
      },
      {
        id: "status",
        header: t("users.table.columns.status"),
        cell: (user) => (
          <Badge variant={statusVariants[user.status]}>
            {statusLabels[user.status]}
          </Badge>
        ),
      },
      {
        id: "department",
        header: t("users.table.columns.department"),
        sortable: true,
        cell: (user) => user.team?.name || user.department || "-",
      },
      {
        id: "assignedAppCount",
        header: t("users.table.columns.appAccessCount"),
        sortable: true,
        accessorKey: "assignedAppCount",
      },
      {
        id: "lastLoginAt",
        header: t("users.table.columns.lastLoginAt"),
        sortable: true,
        cell: (user) => formatKoreanDate(user.lastLoginAt),
      },
    ],
    [t, statusLabels, roleLabels]
  );

  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!sortState) return users;

    return [...users].sort((a, b) => {
      const { columnId, direction } = sortState;
      let aVal: string | number | Date = "";
      let bVal: string | number | Date = "";

      switch (columnId) {
        case "user":
          aVal = a.name || a.email;
          bVal = b.name || b.email;
          break;
        case "department":
          aVal = a.department || "";
          bVal = b.department || "";
          break;
        case "assignedAppCount":
          aVal = a.assignedAppCount;
          bVal = b.assignedAppCount;
          break;
        case "lastLoginAt":
          aVal = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          bVal = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [users, sortState]);

  // 페이지네이션된 데이터
  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return sortedData.slice(start, start + pagination.pageSize);
  }, [sortedData, pagination]);

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">
          {t("users.table.emptyMessage")}
        </p>
      </div>
    );
  }

  return (
    <DataTable
      data={paginatedData}
      columns={columns}
      getRowId={(row) => row.id}
      // 행 선택
      enableRowSelection
      selectedRows={selectedRows}
      onSelectedRowsChange={setSelectedRows}
      // 컬럼 가시성
      enableColumnVisibility
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={handleColumnVisibilityChange}
      // 정렬
      enableSorting
      sortState={sortState}
      onSortChange={setSortState}
      // 페이지네이션
      enablePagination
      pagination={pagination}
      onPaginationChange={setPagination}
      totalCount={users.length}
      // 기타
      emptyMessage={t("users.table.emptyMessage")}
      hideToolbar={hideToolbar}
    />
  );
}
