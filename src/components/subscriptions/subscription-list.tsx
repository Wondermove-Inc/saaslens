// src/components/subscriptions/subscription-list.tsx
"use client";

import { deleteSubscription } from "@/actions/subscriptions";
import { ColumnsDropdown } from "@/components/common/columns-dropdown";
import {
  DataTable,
  useDataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import {
  TabFilter,
  useTabFilter,
  type TabFilterItem,
} from "@/components/common/tab-filter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { SubscriptionListItem } from "@/types/subscription";
import type { BillingCycle, SubscriptionStatus } from "@prisma/client";
import { MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

interface SubscriptionListProps {
  subscriptions: SubscriptionListItem[];
  canManage?: boolean;
}

// 컬럼 가시성 드롭다운에서 사용할 컬럼 정의 (외부 노출용)
// 이 함수는 컴포넌트 외부에서 호출되므로 번역을 받아야 함
export function getSubscriptionListColumns(t: (key: string) => string) {
  return [
    { id: "app", header: t("subscriptions.list.columns.app") },
    { id: "status", header: t("subscriptions.list.columns.status") },
    {
      id: "billingCycle",
      header: t("subscriptions.list.columns.billingCycle"),
    },
    { id: "amount", header: t("subscriptions.list.columns.amount") },
    { id: "licenses", header: t("subscriptions.list.columns.licenses") },
    { id: "renewalDate", header: t("subscriptions.list.columns.renewalDate") },
    { id: "autoRenewal", header: t("subscriptions.list.columns.autoRenewal") },
  ];
}

const statusConfig: Record<
  SubscriptionStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  ACTIVE: { variant: "default" },
  EXPIRED: { variant: "destructive" },
  CANCELLED: { variant: "destructive" },
  PENDING: {
    variant: "secondary",
    className: "border-0 bg-info-muted text-info-muted-foreground",
  },
};

function formatCurrency(amount: number, currency: string): string {
  if (currency === "KRW") {
    return `₩${amount.toLocaleString()}`;
  } else if (currency === "USD") {
    return `$${amount.toLocaleString()}`;
  } else {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

type StatusFilter = "ALL" | SubscriptionStatus;

export function SubscriptionList({
  subscriptions,
  canManage = true,
}: SubscriptionListProps) {
  const t = useTranslations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionListItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  const statusLabels: Record<SubscriptionStatus, string> = {
    ACTIVE: t("subscriptions.status.active"),
    EXPIRED: t("subscriptions.status.expired"),
    CANCELLED: t("subscriptions.status.cancelled"),
    PENDING: t("subscriptions.status.pending"),
  };

  const billingCycleLabels: Record<BillingCycle, string> = {
    MONTHLY: t("subscriptions.billingCycle.monthly"),
    QUARTERLY: t("subscriptions.billingCycle.quarterly"),
    YEARLY: t("subscriptions.billingCycle.yearly"),
    ONE_TIME: t("subscriptions.billingCycle.oneTime"),
  };

  // V2 이관: 결제주기, 금액범위, 날짜범위 필터는 MVP에서 제외
  // const [billingFilter, setBillingFilter] = useState<BillingCycle | "ALL">("ALL");
  // const [minAmount, setMinAmount] = useState<string>("");
  // const [maxAmount, setMaxAmount] = useState<string>("");
  // const [startDate, setStartDate] = useState<string>("");
  // const [endDate, setEndDate] = useState<string>("");

  const { value: statusFilter, onChange: setStatusFilter } =
    useTabFilter<StatusFilter>("ALL");

  const {
    selectedRows,
    setSelectedRows,
    columnVisibility,
    handleColumnVisibilityChange,
    sortState,
    setSortState,
    pagination,
    setPagination,
  } = useDataTable({ defaultPageSize: 10 });

  // MVP: 검색 필터만 적용 (V2에서 결제주기/금액/날짜 필터 추가 예정)
  const filteredBySearch = useMemo(() => {
    if (!searchQuery) return subscriptions;
    const q = searchQuery.toLowerCase();
    return subscriptions.filter((s) => s.appName.toLowerCase().includes(q));
  }, [subscriptions, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALL: filteredBySearch.length,
      ACTIVE: 0,
      EXPIRED: 0,
      CANCELLED: 0,
      PENDING: 0,
    };
    filteredBySearch.forEach((s) => {
      counts[s.status]++;
    });
    return counts;
  }, [filteredBySearch]);

  // 탭 필터 아이템
  const tabFilterItems: TabFilterItem<StatusFilter>[] = useMemo(
    () => [
      {
        value: "ALL",
        label: t("subscriptions.status.all"),
        count: statusCounts.ALL,
      },
      {
        value: "ACTIVE",
        label: t("subscriptions.status.active"),
        count: statusCounts.ACTIVE,
        variant: "success",
      },
      {
        value: "PENDING",
        label: t("subscriptions.status.pending"),
        count: statusCounts.PENDING,
        variant: "warning",
      },
      {
        value: "EXPIRED",
        label: t("subscriptions.status.expired"),
        count: statusCounts.EXPIRED,
        variant: "danger",
      },
      {
        value: "CANCELLED",
        label: t("subscriptions.status.cancelled"),
        count: statusCounts.CANCELLED,
        variant: "secondary",
      },
    ],
    [statusCounts, t]
  );

  // 필터링된 데이터 (검색 + 상태 탭)
  const filteredSubscriptions = useMemo(() => {
    const statusFiltered =
      statusFilter === "ALL"
        ? filteredBySearch
        : filteredBySearch.filter((s) => s.status === statusFilter);

    return statusFiltered;
  }, [filteredBySearch, statusFilter]);

  const handleDelete = useCallback(
    (subscription: SubscriptionListItem) => {
      if (!canManage) {
        toast.error(t("subscriptions.delete.noPermission"));
        return;
      }

      setSelectedSubscription(subscription);
      setDeleteDialogOpen(true);
    },
    [canManage, t]
  );

  const confirmDelete = () => {
    if (!selectedSubscription) return;

    startTransition(async () => {
      try {
        const result = await deleteSubscription(selectedSubscription.id);

        if (result?.success) {
          toast.success(
            t("subscriptions.delete.success", {
              appName: selectedSubscription.appName,
            })
          );
          setDeleteDialogOpen(false);
          setSelectedSubscription(null);
        } else {
          toast.error(result?.message ?? t("subscriptions.delete.error"));
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("subscriptions.delete.errorUnknown");
        toast.error(message);
      }
    });
  };

  // 컬럼 정의
  const columns: DataTableColumn<SubscriptionListItem>[] = useMemo(
    () => [
      {
        id: "app",
        header: t("subscriptions.list.columns.app"),
        sortable: true,
        cell: (subscription) => (
          <Link
            href={`/subscriptions/${subscription.id}`}
            className="flex items-center gap-3 hover:underline"
          >
            {subscription.appLogoUrl ? (
              <Image
                src={subscription.appLogoUrl}
                alt={subscription.appName}
                width={32}
                height={32}
                className="rounded-sm"
              />
            ) : (
              <div className="bg-purple-gray flex h-8 w-8 items-center justify-center rounded-sm text-sm font-medium">
                {subscription.appName.charAt(0)}
              </div>
            )}
            <span className="font-medium">{subscription.appName}</span>
          </Link>
        ),
      },
      {
        id: "status",
        header: t("subscriptions.list.columns.status"),
        cell: (subscription) => {
          const config = statusConfig[subscription.status];
          return (
            <Badge variant={config.variant} className={config.className}>
              {statusLabels[subscription.status]}
            </Badge>
          );
        },
      },
      {
        id: "billingCycle",
        header: t("subscriptions.list.columns.billingCycle"),
        cell: (subscription) => billingCycleLabels[subscription.billingCycle],
      },
      {
        id: "amount",
        header: t("subscriptions.list.columns.amount"),
        sortable: true,
        className: "text-right",
        headerClassName: "text-right",
        cell: (subscription) =>
          formatCurrency(subscription.amount, subscription.currency),
      },
      {
        id: "licenses",
        header: t("subscriptions.list.columns.licenses"),
        cell: (subscription) =>
          subscription.totalLicenses
            ? `${subscription.usedLicenses ?? 0}/${subscription.totalLicenses}`
            : "-",
      },
      {
        id: "renewalDate",
        header: t("subscriptions.list.columns.renewalDate"),
        sortable: true,
        cell: (subscription) => formatDate(subscription.renewalDate),
      },
      {
        id: "autoRenewal",
        header: t("subscriptions.list.columns.autoRenewal"),
        cell: (subscription) =>
          subscription.autoRenewal ? (
            <Badge variant="outline">
              {t("subscriptions.autoRenewal.auto")}
            </Badge>
          ) : (
            <span className="text-muted-foreground">
              {t("subscriptions.autoRenewal.manual")}
            </span>
          ),
      },
      {
        id: "actions",
        header: "",
        headerClassName: "w-[50px]",
        cell: (subscription) =>
          canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isPending}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">
                    {t("subscriptions.list.menuOpen")}
                  </span>
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
                  <Link href={`/subscriptions/${subscription.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("subscriptions.actions.edit")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(subscription)}
                  disabled={isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("subscriptions.actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
    ],
    [canManage, isPending, handleDelete, t]
  );

  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!sortState) return filteredSubscriptions;

    return [...filteredSubscriptions].sort((a, b) => {
      const { columnId, direction } = sortState;
      let aVal: string | number | Date = "";
      let bVal: string | number | Date = "";

      switch (columnId) {
        case "app":
          aVal = a.appName;
          bVal = b.appName;
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "renewalDate":
          aVal = a.renewalDate ? new Date(a.renewalDate).getTime() : 0;
          bVal = b.renewalDate ? new Date(b.renewalDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredSubscriptions, sortState]);

  // 페이지네이션된 데이터
  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return sortedData.slice(start, start + pagination.pageSize);
  }, [sortedData, pagination]);

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">
          {t("subscriptions.list.empty")}
        </p>
        <Button asChild>
          <Link href="/subscriptions/new">
            {t("subscriptions.list.emptyAction")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 툴바 - MVP: 검색 + 상태 탭만 유지 (V2에서 상세 필터 추가 예정) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("subscriptions.list.searchPlaceholder")}
            className="w-64 pl-9"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
        </div>

        <ColumnsDropdown
          columns={getSubscriptionListColumns(t)}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />
      </div>

      {/* 탭 필터 */}
      <TabFilter
        items={tabFilterItems}
        value={statusFilter}
        onChange={(value) => {
          setStatusFilter(value);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
      />

      {/* 데이터 테이블 */}
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
        totalCount={filteredSubscriptions.length}
        // 기타
        emptyMessage={t("subscriptions.list.empty")}
        hideToolbar
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("subscriptions.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSubscription?.appName
                ? t("subscriptions.delete.description", {
                    appName: selectedSubscription.appName,
                  })
                : t("subscriptions.delete.description", { appName: "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("subscriptions.delete.cancelled")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending
                ? t("subscriptions.actions.deleting")
                : t("subscriptions.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
