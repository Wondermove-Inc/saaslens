// src/app/(dashboard)/reports/registered-app-usage/page.client.tsx
"use client";

import type {
  RegisteredAppUsageItem,
  RegisteredAppUsageResponse,
} from "@/actions/reports/registered-app-usage";
import { DateRangeSelector } from "@/components/common/date-range-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ExternalLink, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface RegisteredAppUsagePageClientProps {
  initialData: RegisteredAppUsageResponse | undefined;
  initialFilters: {
    startDate: string;
    endDate: string;
    appId: string;
    userId: string;
    search: string;
    period: string;
  };
  presets: { value: string; label: string }[];
}

export function RegisteredAppUsagePageClient({
  initialData,
  initialFilters,
  presets,
}: RegisteredAppUsagePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("reports.registeredAppUsage");
  const locale = useLocale();

  const [filters, setFilters] = useState(initialFilters);

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilters(overrides?: Partial<typeof filters>) {
    const f = { ...filters, ...overrides };
    const params = new URLSearchParams();
    if (f.period) params.set("period", f.period);
    if (f.period === "custom") {
      if (f.startDate) params.set("startDate", f.startDate);
      if (f.endDate) params.set("endDate", f.endDate);
    }
    if (f.appId) params.set("appId", f.appId);
    if (f.userId) params.set("userId", f.userId);
    if (f.search) params.set("search", f.search);

    router.push(`/reports/registered-app-usage?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/reports/registered-app-usage?${params.toString()}`);
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}${t("format.hours")} ${minutes}${t("format.minutes")}`;
    }
    return `${minutes}${t("format.minutes")}`;
  }

  function formatDateTime(date: Date): string {
    return new Date(date).toLocaleString(locale === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const data = initialData;
  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {/* Filter Bar - 1행: 검색(좌) + 기간·내보내기(우) */}
      <div className="flex items-center gap-3">
        <div className="relative w-[calc(25%-0.75rem)]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <DateRangeSelector
            currentPeriod={filters.period}
            startDate={filters.startDate}
            endDate={filters.endDate}
            presets={presets}
            basePath="/reports/registered-app-usage"
            preserveParams={{
              search: filters.search,
              appId: filters.appId,
              userId: filters.userId,
            }}
          />

          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t("filters.export")}
          </Button>
        </div>
      </div>

      {/* Summary Cards - Bento Style */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
            <div className="flex flex-1 flex-col gap-2 px-2">
              <p className="text-primary text-xs">{t("stats.totalVisits")}</p>
              <p className="text-secondary-foreground text-2xl font-medium">
                {summary.totalVisits.toLocaleString()}
              </p>
            </div>
            {/* <div className="bg-purple-gray rounded p-2">
              <p className="text-muted-foreground text-xs">
                {t("stats.totalVisitsDesc")}
              </p>
            </div> */}
          </Card>

          <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
            <div className="flex flex-1 flex-col gap-2 px-2">
              <p className="text-primary text-xs">{t("stats.activeUsers")}</p>
              <p className="text-secondary-foreground text-2xl font-medium">
                {summary.uniqueUsers}
              </p>
            </div>
            {/* <div className="bg-purple-gray rounded p-2">
              <p className="text-muted-foreground text-xs">
                {t("stats.activeUsersDesc")}
              </p>
            </div> */}
          </Card>

          <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
            <div className="flex flex-1 flex-col gap-2 px-2">
              <p className="text-primary text-xs">{t("stats.usedApps")}</p>
              <p className="text-secondary-foreground text-2xl font-medium">
                {summary.uniqueApps}
              </p>
            </div>
            {/* <div className="bg-purple-gray rounded p-2">
              <p className="text-muted-foreground text-xs">
                {t("stats.usedAppsDesc")}
              </p>
            </div> */}
          </Card>

          <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
            <div className="flex flex-1 flex-col gap-2 px-2">
              <p className="text-primary text-xs">{t("stats.totalDuration")}</p>
              <p className="text-secondary-foreground text-2xl font-medium">
                {formatDuration(summary.totalDuration)}
              </p>
            </div>
            {/* <div className="bg-purple-gray rounded p-2">
              <p className="text-muted-foreground text-xs">
                {t("stats.totalDurationDesc")}
              </p>
            </div> */}
          </Card>
        </div>
      )}

      {/* Data Table */}
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          {!data || data.items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">{t("table.empty")}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.appName")}</TableHead>
                    <TableHead>{t("table.url")}</TableHead>
                    <TableHead>{t("table.user")}</TableHead>
                    <TableHead>{t("table.visitedAt")}</TableHead>
                    <TableHead>{t("table.duration")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item: RegisteredAppUsageItem) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.appName}</span>
                          {item.appId && (
                            <Link
                              href={`/apps/${item.appId}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate font-mono text-xs">
                          {item.url}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {item.userName || "Unknown"}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {item.userEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDateTime(item.visitedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.durationSeconds ? (
                          <Badge variant="outline">
                            {formatDuration(item.durationSeconds)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-4">
                  <div className="text-muted-foreground text-sm">
                    {t("pagination.totalItems", {
                      total: data.total.toLocaleString(),
                      start: (
                        (data.page - 1) * data.limit +
                        1
                      ).toLocaleString(),
                      end: Math.min(
                        data.page * data.limit,
                        data.total
                      ).toLocaleString(),
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.page - 1)}
                      disabled={data.page === 1}
                    >
                      {t("pagination.previous")}
                    </Button>
                    <span className="text-sm">
                      {t("pagination.pageOf", {
                        page: data.page,
                        totalPages: data.totalPages,
                      })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.page + 1)}
                      disabled={data.page === data.totalPages}
                    >
                      {t("pagination.next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
