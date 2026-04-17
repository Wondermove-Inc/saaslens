// src/components/cards/sync-history-panel.tsx
"use client";

import { getSyncHistory } from "@/actions/payments/sync-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SyncHistory } from "@prisma/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useState, useTransition } from "react";

interface SyncHistoryPanelProps {
  corporateCardId: string;
  limit?: number;
}

type SyncStatusColor = {
  className: string;
  label: string;
};

function getSyncStatusStyle(status: string): SyncStatusColor {
  switch (status) {
    case "SUCCESS":
      return {
        className: "bg-success-muted text-success-muted-foreground",
        label: "성공",
      };
    case "PARTIAL":
      return {
        className: "bg-warning-muted text-warning-muted-foreground",
        label: "부분 성공",
      };
    case "FAILED":
      return {
        className: "bg-destructive-muted text-destructive-muted-foreground",
        label: "실패",
      };
    case "RUNNING":
      return {
        className: "bg-info-muted text-info-muted-foreground",
        label: "실행 중",
      };
    default:
      return {
        className: "",
        label: status,
      };
  }
}

function getSyncTypeLabel(type: string): string {
  switch (type) {
    case "CARD_SYNC":
      return "카드 동기화";
    case "CSV_IMPORT":
      return "CSV 가져오기";
    case "REMATCH":
      return "재매칭";
    default:
      return type;
  }
}

export function SyncHistoryPanel({
  corporateCardId,
  limit = 10,
}: SyncHistoryPanelProps) {
  const [entries, setEntries] = useState<SyncHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsInitialLoading(true);
      const result = await getSyncHistory({
        corporateCardId,
        page: 1,
        limit,
      });

      if (cancelled) return;

      if (result.success && result.data) {
        setEntries(result.data.data);
        setTotal(result.data.total);
        setPage(1);
      }
      setIsInitialLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [corporateCardId, limit]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await getSyncHistory({
        corporateCardId,
        page: nextPage,
        limit,
      });

      if (result.success && result.data) {
        setEntries((prev) => [...prev, ...result.data!.data]);
        setPage(nextPage);
      }
    });
  };

  const hasMore = entries.length < total;

  if (isInitialLoading) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm">
        <CardHeader>
          <CardTitle>동기화 이력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              data-testid="sync-history-skeleton"
              className="flex items-center gap-3"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm">
        <CardHeader>
          <CardTitle>동기화 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            data-testid="sync-history-empty"
            className="text-muted-foreground text-sm"
          >
            동기화 이력이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-sm shadow-sm">
      <CardHeader>
        <CardTitle>동기화 이력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2" data-testid="sync-history-list">
        {entries.map((entry) => {
          const statusStyle = getSyncStatusStyle(entry.status);
          return (
            <div
              key={entry.id}
              data-testid={`sync-history-entry-${entry.id}`}
              className="flex flex-col gap-1 rounded-sm border p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={statusStyle.className}>
                    {statusStyle.label}
                  </Badge>
                  <span className="text-sm font-medium">
                    {getSyncTypeLabel(entry.type)}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(entry.startedAt), "yyyy-MM-dd HH:mm", {
                    locale: ko,
                  })}
                </span>
              </div>

              <div className="text-muted-foreground flex gap-3 text-xs">
                <span>전체 {entry.totalRecords}건</span>
                <span>성공 {entry.successCount}건</span>
                {entry.failedCount > 0 && (
                  <span className="text-destructive">
                    실패 {entry.failedCount}건
                  </span>
                )}
              </div>

              {entry.errorMessage && (
                <p className="text-destructive-foreground bg-destructive/10 rounded px-2 py-1 text-xs">
                  {entry.errorMessage}
                </p>
              )}
            </div>
          );
        })}

        {hasMore && (
          <Button
            data-testid="sync-history-load-more"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            더보기
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
