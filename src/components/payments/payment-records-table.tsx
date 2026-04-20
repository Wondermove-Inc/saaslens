// src/components/payments/payment-records-table.tsx
"use client";

import {
  getPaymentRecords,
  getPaymentStatusCounts,
  linkPaymentToSubscription,
  updatePaymentMatch,
  type PaymentRecordWithApp,
} from "@/actions/payment-import";
import { DataTable, useDataTable } from "@/components/common/data-table";
import { TabFilter, type TabFilterItem } from "@/components/common/tab-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentMatchStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  RegisterAppDialog,
  RegisterSubscriptionDialog,
} from "./payment-register-dialogs";
import { usePaymentTableColumns } from "./payment-table-columns";
import { getPaymentRecordColumns } from "./payment-table.constants";
import { RematchButton } from "./rematch-button";
import { useRematchSelection } from "./use-rematch-selection";

// Re-export for external use
export { getPaymentRecordColumns };

interface App {
  id: string;
  name: string;
}

interface Subscription {
  id: string;
  appName: string;
}

interface AppWithTeams {
  id: string;
  name: string;
  teams: { id: string; name: string }[];
}

interface PaymentRecordsTableProps {
  apps: App[];
  subscriptions: Subscription[];
  appsWithTeams?: AppWithTeams[];
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  hideToolbar?: boolean;
  showRematch?: boolean;
}

type StatusFilterValue = "all" | PaymentMatchStatus;

export function PaymentRecordsTable({
  apps,
  subscriptions,
  appsWithTeams,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange: externalOnColumnVisibilityChange,
  hideToolbar = false,
  showRematch = false,
}: PaymentRecordsTableProps) {
  const t = useTranslations();
  const [records, setRecords] = useState<PaymentRecordWithApp[]>([]);
  const [total, setTotal] = useState(0);
  const [serverPage, setServerPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    all: 0,
    PENDING: 0,
    AUTO_MATCHED: 0,
    MANUAL: 0,
    UNMATCHED: 0,
  });

  // Dialog states
  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedPaymentRecord, setSelectedPaymentRecord] =
    useState<PaymentRecordWithApp | null>(null);

  const handleRegisterApp = useCallback((record: PaymentRecordWithApp) => {
    setSelectedPaymentRecord(record);
    setAppDialogOpen(true);
  }, []);

  const handleRegisterSubscription = useCallback(
    (record: PaymentRecordWithApp) => {
      setSelectedPaymentRecord(record);
      setSubscriptionDialogOpen(true);
    },
    []
  );

  const limit = 10;

  const {
    columnVisibility: internalColumnVisibility,
    handleColumnVisibilityChange: internalHandleColumnVisibilityChange,
    sortState,
    setSortState,
  } = useDataTable({ defaultPageSize: limit });

  const {
    selectedIds,
    selectedIdsArray,
    handleSelectedRowsChange,
    clearSelection,
  } = useRematchSelection();

  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    externalOnColumnVisibilityChange ?? internalHandleColumnVisibilityChange;

  // 상태별 건수 로드
  const loadStatusCounts = useCallback(async () => {
    const result = await getPaymentStatusCounts();
    if (result.success && result.data) {
      setStatusCounts(result.data);
    }
  }, []);

  // 데이터 로드
  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    const result = await getPaymentRecords({
      page: serverPage,
      limit,
      matchStatus:
        statusFilter !== "all"
          ? (statusFilter as PaymentMatchStatus)
          : undefined,
    });

    if (result.success && result.data) {
      setRecords(result.data.records);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
    }
    setIsLoading(false);
  }, [serverPage, statusFilter]);

  // 데이터 + 건수 리프레시
  const refreshAll = useCallback(async () => {
    await Promise.all([loadRecords(), loadStatusCounts()]);
  }, [loadRecords, loadStatusCounts]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    setServerPage(1);
  }, [statusFilter]);

  // TabFilter 아이템
  const filterItems = useMemo<TabFilterItem<StatusFilterValue>[]>(
    () => [
      {
        value: "all",
        label: t("payments.table.all"),
        count: statusCounts.all,
      },
      {
        value: "PENDING",
        label: t("payments.status.pending"),
        count: statusCounts.PENDING,
        variant: "warning",
      },
      {
        value: "AUTO_MATCHED",
        label: t("payments.status.autoMatched"),
        count: statusCounts.AUTO_MATCHED,
        variant: "default",
      },
      {
        value: "MANUAL",
        label: t("payments.status.manual"),
        count: statusCounts.MANUAL,
        variant: "secondary",
      },
      {
        value: "UNMATCHED",
        label: t("payments.status.unmatched"),
        count: statusCounts.UNMATCHED,
        variant: "danger",
      },
    ],
    [t, statusCounts]
  );

  // 핸들러들
  const handleMatchUpdate = useCallback(
    (paymentId: string, appId: string | null) => {
      startTransition(async () => {
        const result = await updatePaymentMatch(paymentId, appId);
        if (result.success) {
          toast.success(
            appId
              ? t("payments.messages.matchUpdated")
              : t("payments.messages.matchRemoved")
          );
          refreshAll();
        } else {
          toast.error(
            result.message || t("payments.messages.matchUpdateFailed")
          );
        }
      });
    },
    [refreshAll, t]
  );

  const handleLinkSubscription = useCallback(
    (paymentId: string, subscriptionId: string) => {
      if (subscriptionId === "none") return;
      startTransition(async () => {
        const result = await linkPaymentToSubscription(
          paymentId,
          subscriptionId
        );
        if (result.success) {
          toast.success(t("payments.messages.subscriptionLinked"));
          refreshAll();
        } else {
          toast.error(
            result.message || t("payments.messages.subscriptionLinkFailed")
          );
        }
      });
    },
    [refreshAll, t]
  );

  // 필터링된 레코드
  const filteredRecords = useMemo(() => {
    return records.filter((r) =>
      searchTerm
        ? r.merchantName.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );
  }, [records, searchTerm]);

  // 컬럼 정의 (커스텀 훅 사용)
  const columns = usePaymentTableColumns({
    apps,
    subscriptions,
    isPending,
    onMatchUpdate: handleMatchUpdate,
    onLinkSubscription: handleLinkSubscription,
    onRegisterApp: handleRegisterApp,
    onRegisterSubscription: handleRegisterSubscription,
    t,
  });

  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!sortState) return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      const { columnId, direction } = sortState;

      switch (columnId) {
        case "transactionDate": {
          const aDate = new Date(a.transactionDate).getTime();
          const bDate = new Date(b.transactionDate).getTime();
          return direction === "asc" ? aDate - bDate : bDate - aDate;
        }
        case "amount":
          return direction === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        case "merchantName":
          return direction === "asc"
            ? a.merchantName.localeCompare(b.merchantName)
            : b.merchantName.localeCompare(a.merchantName);
        default:
          return 0;
      }
    });
  }, [filteredRecords, sortState]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-9 w-60" />
        </div>
        {/* Table Skeleton */}
        <Card className="border-border/50 rounded-sm shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16" />
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
      {/* 검색 + 액션 버튼 */}
      <div className="flex items-center gap-2">
        <Search className="text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("payments.table.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-60"
        />
      </div>

      {/* DataTable (TabFilter를 toolbarLeft로 전달하여 Columns 버튼과 동일 행 배치) */}
      <DataTable
        data={sortedData}
        columns={columns}
        getRowId={(row) => row.id}
        enableColumnVisibility
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        enableSorting
        sortState={sortState}
        onSortChange={setSortState}
        enablePagination={false}
        emptyMessage={t("payments.table.emptyMessage")}
        hideToolbar={hideToolbar}
        enableRowSelection={showRematch}
        selectedRows={selectedIds}
        onSelectedRowsChange={handleSelectedRowsChange}
        toolbarLeft={
          <>
            <TabFilter<StatusFilterValue>
              items={filterItems}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            {showRematch && (
              <RematchButton
                selectedIds={selectedIdsArray}
                recordType="payment"
                onComplete={() => {
                  clearSelection();
                  refreshAll();
                }}
              />
            )}
          </>
        }
      />

      {/* 서버 측 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {total}
            {t("payments.table.of")} {(serverPage - 1) * limit + 1}-
            {Math.min(serverPage * limit, total)}
            {t("payments.table.th")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setServerPage((p) => Math.max(1, p - 1));
              }}
              disabled={serverPage === 1 || isLoading}
            >
              {t("payments.table.previous")}
            </Button>
            <span className="text-sm">
              {serverPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setServerPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={serverPage === totalPages || isLoading}
            >
              {t("payments.table.next")}
            </Button>
          </div>
        </div>
      )}

      {/* 앱 등록 Dialog */}
      <RegisterAppDialog
        open={appDialogOpen}
        onOpenChange={setAppDialogOpen}
        paymentRecord={selectedPaymentRecord}
        onSuccess={refreshAll}
      />

      {/* 구독 등록 Dialog */}
      <RegisterSubscriptionDialog
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
        paymentRecord={selectedPaymentRecord}
        apps={
          appsWithTeams ??
          apps.map((a) => ({ id: a.id, name: a.name, teams: [] }))
        }
        onSuccess={refreshAll}
      />
    </div>
  );
}
