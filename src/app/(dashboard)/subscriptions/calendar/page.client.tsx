// src/app/(dashboard)/subscriptions/calendar/page.client.tsx
"use client";

import type {
  CalendarData,
  RenewalItem,
  RenewalsByDateResponse,
} from "@/actions/subscriptions";
import { RenewalCalendar } from "@/components/subscriptions/renewal-calendar";
import { RenewalDayDetail } from "@/components/subscriptions/renewal-day-detail";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustom } from "@refinedev/core";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

interface RenewalCalendarPageClientProps {
  initialData: CalendarData;
}

/** URL searchParams에서 연/월 파싱 (유효성 검사 포함) */
function parseYearMonth(
  searchParams: URLSearchParams,
  fallback: { year: number; month: number }
): { year: number; month: number } {
  const y = searchParams.get("year");
  const m = searchParams.get("month");
  const year = y ? parseInt(y, 10) : fallback.year;
  const month = m ? parseInt(m, 10) : fallback.month;
  const validYear =
    Number.isNaN(year) || year < 2020 || year > 2100 ? fallback.year : year;
  const validMonth =
    Number.isNaN(month) || month < 1 || month > 12 ? fallback.month : month;
  return { year: validYear, month: validMonth };
}

export function RenewalCalendarPageClient({
  initialData,
}: RenewalCalendarPageClientProps) {
  const t = useTranslations("subscriptions.calendar");
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL을 단일 소스로 사용 (뒤로가기/앞으로가기, URL 직접 수정 시 동기화)
  const { year, month } = useMemo(
    () =>
      parseYearMonth(searchParams, {
        year: initialData.year,
        month: initialData.month,
      }),
    [searchParams, initialData.year, initialData.month]
  );

  // 선택된 날짜 상태
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // initialData는 요청한 연/월과 일치할 때만 사용 (다른 월 요청에 이전 월 데이터 쓰이지 않도록)
  const calendarInitialData =
    initialData.year === year && initialData.month === month
      ? { data: initialData }
      : undefined;

  // 캘린더 데이터 조회 (Refine useCustom)
  const { query: calendarQuery } = useCustom<CalendarData>({
    url: "/api/v1/subscriptions/calendar",
    method: "get",
    config: {
      query: {
        year,
        month,
      },
    },
    queryOptions: {
      ...(calendarInitialData && { initialData: calendarInitialData }),
      staleTime: 1000 * 60 * 5, // 5분간 캐시
    },
  });

  // 선택된 날짜의 갱신 데이터 조회 (Refine useCustom)
  const { query: renewalsQuery } = useCustom<RenewalsByDateResponse>({
    url: "/api/v1/subscriptions/calendar",
    method: "get",
    config: {
      query: {
        date: selectedDate,
      },
    },
    queryOptions: {
      enabled: !!selectedDate,
      staleTime: 1000 * 60 * 5, // 5분간 캐시
    },
  });

  const calendarResponse = calendarQuery.data;
  const isCalendarLoading = calendarQuery.isLoading;
  const isCalendarFetching = calendarQuery.isFetching;
  const renewalsResponse = renewalsQuery.data;
  const isRenewalsLoading = renewalsQuery.isLoading;

  // 표시 데이터: API 응답 우선, 요청 연/월과 일치하는 initialData만 fallback
  const calendarData: CalendarData =
    calendarResponse?.data ??
    (initialData.year === year && initialData.month === month
      ? initialData
      : { year, month, renewals: {} });

  const selectedRenewals: RenewalItem[] =
    renewalsResponse?.data?.renewals ?? [];

  // 월 변경 핸들러 (URL만 갱신 → searchParams 변경으로 연/월 반영, useCustom 자동 리페치)
  const handleMonthChange = useCallback(
    (nextYear: number, nextMonth: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", nextYear.toString());
      params.set("month", nextMonth.toString());
      router.push(`/subscriptions/calendar?${params.toString()}`);
      setSelectedDate(null);
    },
    [router, searchParams]
  );

  // 날짜 선택 핸들러
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  // 상세 닫기 핸들러
  const handleCloseDetail = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const isPending = isCalendarLoading || isCalendarFetching;

  return (
    <div
      className="grid gap-6 lg:grid-cols-[1fr_400px]"
      data-loading={isPending ? "true" : "false"}
    >
      {/* 캘린더 영역 */}
      <div className="relative">
        {isPending && (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-sm">
            <Card className="border-border/50 w-full max-w-md rounded-sm shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <div className="grid grid-cols-7 gap-2">
                    {[...Array(35)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-md" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        <RenewalCalendar
          calendarData={calendarData}
          onMonthChange={handleMonthChange}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
        />
      </div>

      {/* 상세 영역 */}
      <div className="lg:sticky lg:top-4">
        {selectedDate ? (
          isRenewalsLoading ? (
            <Card className="border-border/50 rounded-sm shadow-sm">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <RenewalDayDetail
              date={selectedDate}
              renewals={selectedRenewals}
              onClose={handleCloseDetail}
            />
          )
        ) : (
          <div className="bg-card flex h-64 flex-col items-center justify-center rounded-sm border p-6 text-center">
            <p className="text-muted-foreground whitespace-pre-line">
              {t("selectDateHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
