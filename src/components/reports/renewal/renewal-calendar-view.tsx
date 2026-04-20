// src/app/(dashboard)/reports/renewal/_components/renewal-calendar-view.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UpcomingRenewal } from "@/types/dashboard";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type UrgencyLevel = "urgent" | "warning" | "normal";

interface RenewalCalendarViewProps {
  renewals: UpcomingRenewal[];
  onDateSelect?: (date: string, renewals: UpcomingRenewal[]) => void;
  selectedDate?: string | null;
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

// 긴급도 계산 (오늘 기준 남은 일수)
function getUrgencyLevel(daysUntilRenewal: number): UrgencyLevel {
  if (daysUntilRenewal <= 7) return "urgent";
  if (daysUntilRenewal <= 14) return "warning";
  return "normal";
}

// 긴급도별 색상 클래스 (Tailwind 표준 색상)
const urgencyStyles = {
  urgent: {
    dot: "bg-red-500",
    border: "border-red-500/50",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
  warning: {
    dot: "bg-amber-500",
    border: "border-amber-500/50",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  normal: {
    dot: "bg-blue-500",
    border: "border-blue-500/50",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
};

// 날짜 문자열 생성 (YYYY-MM-DD)
function formatDateKey(year: number, month: number, day: number): string {
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return `${year}-${paddedMonth}-${paddedDay}`;
}

// 날짜별 갱신 목록 그룹화
function groupRenewalsByDate(
  renewals: UpcomingRenewal[]
): Map<string, UpcomingRenewal[]> {
  const grouped = new Map<string, UpcomingRenewal[]>();

  renewals.forEach((renewal) => {
    const date = new Date(renewal.renewalDate);
    const dateKey = formatDateKey(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(renewal);
  });

  return grouped;
}

// 날짜의 가장 긴급한 레벨 찾기
function getMostUrgentLevel(renewals: UpcomingRenewal[]): UrgencyLevel {
  let mostUrgent: UrgencyLevel = "normal";

  for (const renewal of renewals) {
    const level = getUrgencyLevel(renewal.daysUntilRenewal);
    if (level === "urgent") return "urgent";
    if (level === "warning") mostUrgent = "warning";
  }

  return mostUrgent;
}

export function RenewalCalendarView({
  renewals,
  onDateSelect,
  selectedDate,
}: RenewalCalendarViewProps) {
  const t = useTranslations("reports.renewal.calendar");
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  // 날짜별 갱신 그룹화
  const renewalsByDate = groupRenewalsByDate(renewals);

  // 캘린더 날짜 계산
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // 캘린더 그리드 생성
  const calendarDays: (number | null)[] = [];

  // 이전 달의 빈 셀
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // 현재 달의 날짜들
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // 다음 달의 빈 셀로 6주 채우기
  while (calendarDays.length < 42) {
    calendarDays.push(null);
  }

  // 이전/다음 월 네비게이션
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // 오늘 날짜 확인
  const isToday = (day: number): boolean => {
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() + 1 === currentMonth &&
      today.getDate() === day
    );
  };

  // 선택된 날짜 확인
  const isSelected = (day: number): boolean => {
    return formatDateKey(currentYear, currentMonth, day) === selectedDate;
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (day: number) => {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const dateRenewals = renewalsByDate.get(dateKey) || [];
    onDateSelect?.(dateKey, dateRenewals);
  };

  const monthName = t(`months.${currentMonth}`);

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleToday}>
            {t("today")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <span
              className={cn("h-3 w-3 rounded-full", urgencyStyles.urgent.dot)}
            />
            <span className="text-sm">{t("legend.urgent")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn("h-3 w-3 rounded-full", urgencyStyles.warning.dot)}
            />
            <span className="text-sm">{t("legend.warning")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn("h-3 w-3 rounded-full", urgencyStyles.normal.dot)}
            />
            <span className="text-sm">{t("legend.normal")}</span>
          </div>
        </div>

        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("prev")}
          </Button>
          <h2 className="text-lg font-semibold">
            {t("yearMonth", { year: currentYear, month: monthName })}
          </h2>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            {t("next")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_KEYS.map((key, index) => (
            <div
              key={key}
              className={cn(
                "py-2 text-center text-sm font-medium",
                index === 0 && "text-red-500",
                index === 6 && "text-blue-500"
              )}
            >
              {t(`weekdays.${key}`)}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-16 p-1" />;
            }

            const dateKey = formatDateKey(currentYear, currentMonth, day);
            const dateRenewals = renewalsByDate.get(dateKey) || [];
            const hasRenewals = dateRenewals.length > 0;
            const urgencyLevel = hasRenewals
              ? getMostUrgentLevel(dateRenewals)
              : null;
            const dayOfWeek = index % 7;

            return (
              <button
                key={dateKey}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "relative h-16 rounded-md border p-1 text-left transition-all",
                  "hover:bg-muted/50",
                  isToday(day) && "border-primary bg-primary/5 font-bold",
                  isSelected(day) && "ring-primary ring-2",
                  hasRenewals &&
                    urgencyLevel && [
                      urgencyStyles[urgencyLevel].border,
                      urgencyStyles[urgencyLevel].bg,
                    ],
                  dayOfWeek === 0 && !hasRenewals && "text-red-500",
                  dayOfWeek === 6 && !hasRenewals && "text-blue-500"
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    isToday(day) && "text-primary",
                    hasRenewals &&
                      urgencyLevel &&
                      urgencyStyles[urgencyLevel].text
                  )}
                >
                  {day}
                </span>

                {/* 갱신 표시 */}
                {hasRenewals && urgencyLevel && (
                  <div className="absolute right-1 bottom-1 flex items-center gap-1">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        urgencyStyles[urgencyLevel].dot
                      )}
                    />
                    {dateRenewals.length > 1 && (
                      <span className="text-muted-foreground text-xs">
                        {dateRenewals.length}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
