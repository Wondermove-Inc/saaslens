// src/components/integrations/integrations-list.tsx
"use client";

import { deleteIntegration, syncIntegrationNow } from "@/actions/integrations";
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
import { formatKoreanDate, formatKoreanDateTime } from "@/lib/date";
import type { Integration } from "@prisma/client";
import {
  Link2,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { toast } from "sonner";

// 컬럼 가시성 드롭다운에서 사용할 컬럼 정의 (외부 노출용)
export function getIntegrationListColumns(t: (key: string) => string) {
  return [
    { id: "type", header: t("integrations.list.columns.type") },
    { id: "status", header: t("integrations.list.columns.status") },
    { id: "lastSyncAt", header: t("integrations.list.columns.lastSyncAt") },
    { id: "createdAt", header: t("integrations.list.columns.createdAt") },
  ];
}

interface IntegrationsListProps {
  integrations: Integration[];
  canManage?: boolean;
  canDelete?: boolean;
  isLoading?: boolean;
  onRefresh?: () => Promise<unknown> | void;
  // 외부에서 컬럼 가시성 상태 제어 시 사용
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  hideToolbar?: boolean;
}

function getIntegrationTypeName(
  type: string,
  t: (key: string) => string
): string {
  const typeNames: Record<string, string> = {
    GOOGLE_WORKSPACE: t("integrations.type.googleWorkspace"),
    OKTA: t("integrations.type.okta"),
    AZURE_AD: t("integrations.type.microsoftEntra"),
    MICROSOFT_ENTRA: t("integrations.type.microsoftEntra"),
    ONELOGIN: "OneLogin",
  };
  return typeNames[type] || type;
}

function getStatusBadge(status: string, t: (key: string) => string) {
  const statusConfig: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    ACTIVE: { label: t("integrations.status.active"), variant: "default" },
    PENDING: { label: t("integrations.status.pending"), variant: "secondary" },
    ERROR: { label: t("integrations.status.error"), variant: "destructive" },
    DISCONNECTED: {
      label: t("integrations.status.disconnected"),
      variant: "outline",
    },
  };
  const config = statusConfig[status] || {
    label: status,
    variant: "outline" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function IntegrationsList({
  integrations,
  canManage = true,
  canDelete = true,
  isLoading = false,
  onRefresh,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange: externalOnColumnVisibilityChange,
  hideToolbar = false,
}: IntegrationsListProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  const refreshList = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }
    router.refresh();
  }, [onRefresh, router]);

  const handleSync = useCallback(
    (integration: Integration) => {
      if (!canManage) {
        toast.error(t("integrations.sync.noPermission"));
        return;
      }

      const isSyncSupported = integration.type === "GOOGLE_WORKSPACE";
      if (!isSyncSupported) {
        toast.error(t("integrations.sync.notSupported"));
        return;
      }

      startTransition(async () => {
        try {
          const result = await syncIntegrationNow(integration.id);
          if (result?.success) {
            toast.success(t("integrations.sync.success"));
          } else {
            toast.error(t("integrations.sync.error"));
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : t("integrations.sync.errorUnknown");
          toast.error(message);
        } finally {
          await refreshList();
        }
      });
    },
    [canManage, refreshList, t]
  );

  const handleDelete = useCallback(
    (integration: Integration) => {
      if (!canManage) {
        toast.error(t("integrations.delete.noPermission"));
        return;
      }

      if (!canDelete) {
        toast.error(t("integrations.delete.noDeletePermission"));
        return;
      }

      startTransition(async () => {
        try {
          const result = await deleteIntegration(integration.id);
          if (result?.success) {
            toast.success(t("integrations.delete.success"));
          } else {
            toast.error(t("integrations.delete.error"));
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : t("integrations.delete.errorUnknown");
          toast.error(message);
        } finally {
          await refreshList();
        }
      });
    },
    [canManage, canDelete, refreshList, t]
  );

  const isBusy = isPending;

  // 컬럼 정의
  const columns: DataTableColumn<Integration>[] = useMemo(
    () => [
      {
        id: "type",
        header: t("integrations.list.columns.type"),
        sortable: true,
        cell: (integration) => (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <Link2 className="text-primary h-4 w-4" />
            </div>
            <Link
              href={`/integrations/${integration.id}`}
              className="font-medium hover:underline"
            >
              {getIntegrationTypeName(integration.type, t)}
            </Link>
          </div>
        ),
      },
      {
        id: "status",
        header: t("integrations.list.columns.status"),
        cell: (integration) => getStatusBadge(integration.status, t),
      },
      {
        id: "lastSyncAt",
        header: t("integrations.list.columns.lastSyncAt"),
        sortable: true,
        cell: (integration) =>
          integration.lastSyncAt
            ? formatKoreanDateTime(integration.lastSyncAt)
            : "-",
      },
      {
        id: "createdAt",
        header: t("integrations.list.columns.createdAt"),
        sortable: true,
        cell: (integration) => formatKoreanDate(integration.createdAt),
      },
      {
        id: "actions",
        header: "",
        headerClassName: "w-12",
        cell: (integration) => {
          const isSyncSupported = integration.type === "GOOGLE_WORKSPACE";

          return canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isBusy}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/integrations/${integration.id}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("integrations.actions.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSync(integration)}
                  disabled={
                    isBusy ||
                    !["ACTIVE", "PENDING"].includes(integration.status) ||
                    !isSyncSupported
                  }
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isBusy ? "animate-spin" : ""}`}
                  />
                  {isBusy
                    ? t("integrations.actions.syncing")
                    : t("integrations.actions.sync")}
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive"
                      disabled={isBusy || !canDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("integrations.actions.delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("integrations.delete.title")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("integrations.delete.description", {
                          typeName: getIntegrationTypeName(integration.type, t),
                        })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isBusy}>
                        {t("integrations.delete.cancelled")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(integration)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isBusy}
                      >
                        {isBusy
                          ? t("integrations.actions.deleting")
                          : t("integrations.delete.confirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          );
        },
      },
    ],
    [canManage, canDelete, isBusy, handleSync, handleDelete, t]
  );

  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!sortState) return integrations;

    return [...integrations].sort((a, b) => {
      const { columnId, direction } = sortState;
      let aVal: string | number | Date = "";
      let bVal: string | number | Date = "";

      switch (columnId) {
        case "type":
          aVal = getIntegrationTypeName(a.type, t);
          bVal = getIntegrationTypeName(b.type, t);
          break;
        case "lastSyncAt":
          aVal = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0;
          bVal = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0;
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
  }, [integrations, sortState, t]);

  // 페이지네이션된 데이터
  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return sortedData.slice(start, start + pagination.pageSize);
  }, [sortedData, pagination]);

  if (integrations.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Link2 className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="text-sm font-medium">{t("integrations.list.empty")}</h3>
        <p className="text-muted-foreground mt-2">
          {t("integrations.list.emptyDescription")}
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
      totalCount={integrations.length}
      // 기타
      emptyMessage={t("integrations.list.empty")}
      isLoading={isLoading}
      hideToolbar={hideToolbar}
    />
  );
}
