// src/components/cards/card-transactions-table.tsx
"use client";

import {
  getCardTransactions,
  matchTransactionToAppManually,
  type CardTransactionSummary,
  type TransactionFilter,
  type TransactionListResult,
  type TransactionQuery,
} from "@/actions/corporate-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface App {
  id: string;
  name: string;
}

interface CardTransactionsTableProps {
  cardId: string;
  apps: App[];
  initialData?: TransactionListResult;
  summary?: CardTransactionSummary;
}

export function CardTransactionsTable({
  cardId,
  apps,
  initialData,
  summary,
}: CardTransactionsTableProps) {
  const t = useTranslations("cards.transactions");
  const [transactions, setTransactions] = useState(
    initialData?.transactions || []
  );
  const [total, setTotal] = useState(initialData?.total || 0);
  const [page, setPage] = useState(initialData?.page || 1);
  const [pageSize] = useState(initialData?.pageSize || 20);
  // 새 필터: SaaS가 기본값
  const [filter, setFilter] = useState<TransactionFilter>("saas");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"useDt" | "useAmt">("useDt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  // 데이터 로드
  const loadTransactions = async (
    newPage?: number,
    newFilter?: TransactionFilter
  ) => {
    setIsLoading(true);
    const query: TransactionQuery = {
      cardId,
      filter: newFilter || filter,
      page: newPage || page,
      pageSize,
    };

    const result = await getCardTransactions(query);
    setTransactions(result.transactions);
    setTotal(result.total);
    setPage(result.page);
    setIsLoading(false);
  };

  // 탭(필터) 변경 시 리로드
  const handleFilterChange = (newFilter: TransactionFilter) => {
    setFilter(newFilter);
    setPage(1);
    startTransition(() => {
      loadTransactions(1, newFilter);
    });
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    startTransition(() => {
      loadTransactions(newPage);
    });
  };

  // 정렬 변경
  const handleSort = (field: "useDt" | "useAmt") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // 수동 매칭
  const handleMatchUpdate = async (
    transactionId: string,
    appId: string | null
  ) => {
    startTransition(async () => {
      const result = await matchTransactionToAppManually(transactionId, appId);
      if (result.success) {
        toast.success(appId ? t("match.success") : t("match.unmatchSuccess"));
        loadTransactions();
      } else {
        toast.error(result.message || t("match.error"));
      }
    });
  };

  // 날짜 포맷
  const formatDate = (useDt: string, useTm: string | null) => {
    const year = useDt.substring(0, 4);
    const month = useDt.substring(4, 6);
    const day = useDt.substring(6, 8);
    let result = `${year}-${month}-${day}`;
    if (useTm) {
      const hour = useTm.substring(0, 2);
      const min = useTm.substring(2, 4);
      result += ` ${hour}:${min}`;
    }
    return result;
  };

  // 금액 포맷
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);
  };

  // 검색 필터링 (클라이언트 측)
  const filteredTransactions = transactions.filter((t) =>
    searchTerm
      ? t.useStore.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  // 정렬 (클라이언트 측)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortField === "useDt") {
      const aDate = a.useDt + (a.useTm || "000000");
      const bDate = b.useDt + (b.useTm || "000000");
      return sortOrder === "asc"
        ? aDate.localeCompare(bDate)
        : bDate.localeCompare(aDate);
    } else {
      return sortOrder === "asc" ? a.useAmt - b.useAmt : b.useAmt - a.useAmt;
    }
  });

  // 탭별 건수 표시용 헬퍼
  const getTabLabel = (tab: TransactionFilter) => {
    if (!summary) {
      const labels: Record<TransactionFilter, string> = {
        saas: t("tabs.saas"),
        unmatched: t("tabs.unmatched"),
        "non-saas": t("tabs.nonSaas"),
        all: t("tabs.all"),
      };
      return labels[tab];
    }
    const counts: Record<TransactionFilter, number> = {
      saas: summary.saasMatchedCount,
      unmatched: summary.unmatchedCount,
      "non-saas": summary.nonSaaSCount,
      all: summary.totalCount,
    };
    const labels: Record<TransactionFilter, string> = {
      saas: t("tabs.saas"),
      unmatched: t("tabs.unmatched"),
      "non-saas": t("tabs.nonSaas"),
      all: t("tabs.all"),
    };
    return `${labels[tab]} (${counts[tab]})`;
  };

  return (
    <div className="space-y-4">
      {/* Tabs: SaaS → 미분류 → Non-SaaS → 전체 */}
      <Tabs
        value={filter}
        onValueChange={(v) => handleFilterChange(v as TransactionFilter)}
      >
        <TabsList>
          <TabsTrigger value="saas">{getTabLabel("saas")}</TabsTrigger>
          <TabsTrigger value="unmatched">
            {getTabLabel("unmatched")}
          </TabsTrigger>
          <TabsTrigger value="non-saas">{getTabLabel("non-saas")}</TabsTrigger>
          <TabsTrigger value="all">{getTabLabel("all")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 검색 */}
      <div className="flex items-center gap-2">
        <Search className="text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("search.placeholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-60"
        />
      </div>

      {/* 테이블 */}
      {isLoading || isPending ? (
        <Card className="border-border/50 rounded-sm shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-8 w-40" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : sortedTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <CreditCard className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-sm font-medium">{t("empty.title")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("empty.description")}
          </p>
        </div>
      ) : (
        <div className="rounded-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("useDt")}
                >
                  <div className="flex items-center gap-1">
                    {t("columns.dateTime")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t("columns.store")}</TableHead>
                <TableHead
                  className="cursor-pointer text-right select-none"
                  onClick={() => handleSort("useAmt")}
                >
                  <div className="flex items-center justify-end gap-1">
                    {t("columns.amount")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.matchedApp")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(tx.useDt, tx.useTm)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={tx.useStore}>
                      {tx.useStore}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(tx.useAmt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.transactionType === "APPROVAL"
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {tx.transactionType === "APPROVAL"
                        ? t("type.approval")
                        : t("type.purchase")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={tx.matchedApp?.id || "none"}
                      onValueChange={(value) =>
                        handleMatchUpdate(
                          tx.id,
                          value === "none" ? null : value
                        )
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={t("appSelect.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {t("appSelect.none")}
                        </SelectItem>
                        {apps.map((app) => (
                          <SelectItem key={app.id} value={app.id}>
                            {app.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tx.matchConfidence && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({Math.round(tx.matchConfidence * 100)}%)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {tx.matchedApp && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMatchUpdate(tx.id, null)}
                        disabled={isPending}
                        title={t("unmatch")}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                    {!tx.matchedApp && (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {t("pagination.range", {
              total,
              start: (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, total),
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || isLoading || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {t("pagination.page", { current: page, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages || isLoading || isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
