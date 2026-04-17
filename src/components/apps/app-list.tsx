// src/components/apps/app-list.tsx
"use client";

import {
  DataTable,
  useDataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAppStatusMeta } from "@/lib/app-status";
import { formatKoreanDate } from "@/lib/date";
import type { AppListItem } from "@/types/app";
import { useDelete } from "@refinedev/core";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useTransition } from "react";
import { toast } from "sonner";

interface AppListProps {
  apps: AppListItem[];
  canManage?: boolean;
  canDelete?: boolean;
  onDeleted?: () => void;
  // 외부에서 컬럼 가시성 상태 제어 시 사용
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  hideToolbar?: boolean;
}

// 컬럼 가시성 드롭다운에서 사용할 컬럼 정의 (외부 노출용)
export function getAppListColumns(t: (key: string) => string) {
  return [
    { id: "logo", header: "" },
    { id: "name", header: t("apps.list.columns.name") },
    { id: "category", header: t("apps.list.columns.category") },
    { id: "status", header: t("apps.list.columns.status") },
    {
      id: "subscriptionCount",
      header: t("apps.list.columns.subscriptionCount"),
    },
    { id: "userAccessCount", header: t("apps.list.columns.userAccessCount") },
    { id: "createdAt", header: t("apps.list.columns.createdAt") },
  ];
}

export function AppList({
  apps,
  canManage = true,
  canDelete = true,
  onDeleted,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange: externalOnColumnVisibilityChange,
  hideToolbar = false,
}: AppListProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const { mutateAsync: deleteOne } = useDelete();

  const {
    selectedRows,
    setSelectedRows,
    columnVisibility: internalColumnVisibility,
    handleColumnVisibilityChange: internalHandleColumnVisibilityChange,
    sortState,
    setSortState,
    pagination,
    setPagination,
  } = useDataTable({ defaultPageSize: 10 });

  // 외부 상태가 제공되면 외부 상태 사용, 아니면 내부 상태 사용
  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    externalOnColumnVisibilityChange ?? internalHandleColumnVisibilityChange;

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (!canManage) {
        toast.error(t("apps.delete.noPermission"));
        return;
      }

      if (!canDelete) {
        toast.error(t("apps.delete.noDeletePermission"));
        return;
      }

      startTransition(async () => {
        try {
          await deleteOne({
            resource: "apps",
            id,
            mutationMode: "pessimistic",
          });

          toast.success(t("apps.delete.success", { appName: name }));
          await onDeleted?.();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : t("apps.delete.errorUnknown");
          toast.error(message);
        }
      });
    },
    [canManage, canDelete, deleteOne, onDeleted, t]
  );

  const getAppLogo = (app: AppListItem) => {
    return app.customLogoUrl || app.catalogLogoUrl || null;
  };

  const isBusy = isPending;

  // 컬럼 정의
  const columns: DataTableColumn<AppListItem>[] = useMemo(
    () => [
      {
        id: "logo",
        header: "",
        cell: (app) => {
          const logo = getAppLogo(app);
          return logo ? (
            <Image
              src={logo}
              alt={app.name}
              width={32}
              height={32}
              className="rounded-sm"
            />
          ) : (
            <div className="bg-purple-gray flex h-8 w-8 items-center justify-center rounded-sm text-xs font-medium">
              {app.name.charAt(0).toUpperCase()}
            </div>
          );
        },
        headerClassName: "w-12",
      },
      {
        id: "name",
        header: t("apps.list.columns.name"),
        accessorKey: "name",
        sortable: true,
        cell: (app) => (
          <Link
            href={`/apps/${app.id}`}
            className="font-medium hover:underline"
          >
            {app.name}
          </Link>
        ),
      },
      {
        id: "category",
        header: t("apps.list.columns.category"),
        accessorKey: "category",
        sortable: true,
        cell: (app) => app.category || "-",
      },
      {
        id: "status",
        header: t("apps.list.columns.status"),
        cell: (app) => {
          const statusMeta = getAppStatusMeta(app.status, t);
          return (
            <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
          );
        },
      },
      {
        id: "subscriptionCount",
        header: t("apps.list.columns.subscriptionCount"),
        accessorKey: "subscriptionCount",
        sortable: true,
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        id: "userAccessCount",
        header: t("apps.list.columns.userAccessCount"),
        accessorKey: "userAccessCount",
        sortable: true,
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        id: "createdAt",
        header: t("apps.list.columns.createdAt"),
        sortable: true,
        cell: (app) => formatKoreanDate(app.createdAt),
      },
      {
        id: "actions",
        header: "",
        headerClassName: "w-12",
        cell: (app) =>
          canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isBusy}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  asChild
                  disabled={isPending}
                  onSelect={(event) => {
                    if (isPending) event.preventDefault();
                  }}
                >
                  <Link href={`/apps/${app.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("apps.actions.edit")}
                  </Link>
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive"
                      disabled={isBusy}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("apps.actions.delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("apps.delete.title")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("apps.delete.description", { appName: app.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isBusy}>
                        {t("apps.delete.cancelled")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(app.id, app.name)}
                        disabled={isBusy}
                      >
                        {isBusy
                          ? t("apps.actions.deleting")
                          : t("apps.delete.confirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
    ],
    [canManage, isBusy, isPending, handleDelete, t]
  );

  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!sortState) return apps;

    return [...apps].sort((a, b) => {
      const { columnId, direction } = sortState;
      let aVal: string | number | Date = "";
      let bVal: string | number | Date = "";

      switch (columnId) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "category":
          aVal = a.category || "";
          bVal = b.category || "";
          break;
        case "subscriptionCount":
          aVal = a.subscriptionCount;
          bVal = b.subscriptionCount;
          break;
        case "userAccessCount":
          aVal = a.userAccessCount;
          bVal = b.userAccessCount;
          break;
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [apps, sortState]);

  // 페이지네이션된 데이터
  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return sortedData.slice(start, start + pagination.pageSize);
  }, [sortedData, pagination]);

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">{t("apps.list.empty")}</p>
        <Link href="/apps/new">
          <Button>{t("apps.list.emptyAction")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <DataTable
      data={paginatedData}
      columns={columns}
      getRowId={(row) => row.id}
      // 행 선택
      enableRowSelection={canManage}
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
      totalCount={apps.length}
      // 기타
      emptyMessage={t("apps.list.empty")}
      hideToolbar={hideToolbar}
    />
  );
}
