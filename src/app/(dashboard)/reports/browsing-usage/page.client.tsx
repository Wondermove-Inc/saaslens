"use client";

// src/app/(dashboard)/reports/browsing-usage/page.client.tsx
import type { BrowsingUsageItem } from "@/actions/reports/browsing-usage";
import { DateRangeSelector } from "@/components/common/date-range-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface BrowsingUsagePageClientProps {
  initialData: BrowsingUsageItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  initialFilters: {
    startDate: string;
    endDate: string;
    search: string;
    period: string;
  };
  presets: Array<{
    value: string;
    label: string;
  }>;
}

export function BrowsingUsagePageClient({
  initialData,
  pagination,
  initialFilters,
  presets,
}: BrowsingUsagePageClientProps) {
  const router = useRouter();
  const t = useTranslations("reports.browsingUsage");
  const locale = useLocale();

  const [period] = useState(initialFilters.period);
  const [search, setSearch] = useState(initialFilters.search);

  // Format date for display
  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(
      locale === "en" ? "en-US" : "ko-KR",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // Update URL params
  const updateUrlParams = useCallback(
    (params: {
      period?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
    }) => {
      const urlParams = new URLSearchParams();

      const newPeriod = params.period ?? period;
      const newStartDate = params.startDate ?? initialFilters.startDate;
      const newEndDate = params.endDate ?? initialFilters.endDate;
      const newSearch = params.search ?? search;
      const newPage = params.page ?? pagination.page;

      if (newPeriod && newPeriod !== "custom") {
        urlParams.set("period", newPeriod);
      } else if (newStartDate && newEndDate) {
        urlParams.set("period", "custom");
        urlParams.set("startDate", newStartDate);
        urlParams.set("endDate", newEndDate);
      }

      if (newSearch) urlParams.set("search", newSearch);
      if (newPage > 1) urlParams.set("page", newPage.toString());

      const queryString = urlParams.toString();
      router.push(
        queryString
          ? `/reports/browsing-usage?${queryString}`
          : "/reports/browsing-usage"
      );
    },
    [
      router,
      period,
      initialFilters.startDate,
      initialFilters.endDate,
      search,
      pagination.page,
    ]
  );

  // Handle search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      updateUrlParams({ search, page: 1 });
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    updateUrlParams({ page });
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative w-[calc(25%-0.75rem)]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <DateRangeSelector
            currentPeriod={initialFilters.period}
            startDate={initialFilters.startDate}
            endDate={initialFilters.endDate}
            presets={presets}
            basePath="/reports/browsing-usage"
            preserveParams={{ search: search }}
          />
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t("filters.export")}
          </Button>
        </div>
      </div>

      {/* Results Table */}
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.url")}</TableHead>
                <TableHead>{t("table.user")}</TableHead>
                <TableHead>{t("table.visitedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center">
                    <p className="text-muted-foreground">{t("table.empty")}</p>
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="max-w-md truncate">
                      <span title={item.url}>{item.url}</span>
                    </TableCell>
                    <TableCell>
                      {item.userName ? (
                        <div>
                          <div className="text-sm font-medium">
                            {item.userName}
                          </div>
                          {item.userEmail && (
                            <div className="text-muted-foreground text-xs">
                              {item.userEmail}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(item.visitedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-4">
            <div className="text-muted-foreground text-sm">
              {t("table.totalResults", { total: pagination.total })}
            </div>
            {pagination.totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        pagination.page > 1 &&
                        handlePageChange(pagination.page - 1)
                      }
                      className={
                        pagination.page <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      const pageNum = Math.max(1, pagination.page - 2) + i;
                      if (pageNum > pagination.totalPages) return null;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => handlePageChange(pageNum)}
                            isActive={pageNum === pagination.page}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pagination.page < pagination.totalPages &&
                        handlePageChange(pagination.page + 1)
                      }
                      className={
                        pagination.page >= pagination.totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
