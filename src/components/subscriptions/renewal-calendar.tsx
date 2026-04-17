// src/components/subscriptions/renewal-calendar.tsx
"use client";

import type { CalendarData } from "@/actions/subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface RenewalCalendarProps {
  calendarData: CalendarData;
  onMonthChange: (year: number, month: number) => void;
  onDateSelect: (date: string) => void;
  selectedDate?: string | null;
}

/**
 * 갱신 캘린더 컴포넌트
 * 월별 캘린더 뷰로 구독 갱신 일정을 시각화
 */
export function RenewalCalendar({
  calendarData,
  onMonthChange,
  onDateSelect,
  selectedDate,
}: RenewalCalendarProps) {
  const t = useTranslations();
  const { year, month, renewals } = calendarData;

  const WEEKDAYS = [
    t("subscriptions.calendar.weekdays.sun"),
    t("subscriptions.calendar.weekdays.mon"),
    t("subscriptions.calendar.weekdays.tue"),
    t("subscriptions.calendar.weekdays.wed"),
    t("subscriptions.calendar.weekdays.thu"),
    t("subscriptions.calendar.weekdays.fri"),
    t("subscriptions.calendar.weekdays.sat"),
  ];

  const MONTH_NAMES = [
    t("subscriptions.calendar.months.1"),
    t("subscriptions.calendar.months.2"),
    t("subscriptions.calendar.months.3"),
    t("subscriptions.calendar.months.4"),
    t("subscriptions.calendar.months.5"),
    t("subscriptions.calendar.months.6"),
    t("subscriptions.calendar.months.7"),
    t("subscriptions.calendar.months.8"),
    t("subscriptions.calendar.months.9"),
    t("subscriptions.calendar.months.10"),
    t("subscriptions.calendar.months.11"),
    t("subscriptions.calendar.months.12"),
  ];

  // 캘린더 날짜 계산
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // 캘린더 그리드 생성 (6주 x 7일)
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

  // 날짜 문자열 생성 (YYYY-MM-DD)
  const formatDateKey = (day: number): string => {
    const paddedMonth = String(month).padStart(2, "0");
    const paddedDay = String(day).padStart(2, "0");
    return `${year}-${paddedMonth}-${paddedDay}`;
  };

  // 해당 날짜의 갱신 건수 확인
  const getRenewalCount = (day: number): number => {
    const dateKey = formatDateKey(day);
    return renewals[dateKey]?.length || 0;
  };

  // 이전 월로 이동
  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  // 다음 월로 이동
  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  // 오늘로 이동
  const handleToday = () => {
    const today = new Date();
    onMonthChange(today.getFullYear(), today.getMonth() + 1);
  };

  // 오늘 날짜 확인
  const today = new Date();
  const isToday = (day: number): boolean => {
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === day
    );
  };

  // 선택된 날짜 확인
  const isSelected = (day: number): boolean => {
    return formatDateKey(day) === selectedDate;
  };

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {t("subscriptions.calendar.title")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
              {t("subscriptions.calendar.today")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 월 네비게이션 */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("subscriptions.calendar.prev")}
          </Button>
          <h2 className="text-lg font-semibold">
            {t("subscriptions.calendar.monthYear", {
              year,
              month: MONTH_NAMES[month - 1],
            })}
          </h2>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            {t("subscriptions.calendar.next")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {/* 요일 헤더 - 테마 변수 사용 (color-theme-guide.md) */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day, index) => (
            <div
              key={day}
              className={cn(
                "py-2 text-center text-sm font-medium",
                index === 0 && "text-destructive",
                index === 6 && "text-info"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-20 p-1" />;
            }

            const renewalCount = getRenewalCount(day);
            const dateKey = formatDateKey(day);
            const dayOfWeek = index % 7;

            return (
              <button
                key={dateKey}
                data-testid={`day-${day}`}
                onClick={() => onDateSelect(dateKey)}
                className={cn(
                  "hover:bg-purple-gray relative h-20 rounded-sm border p-1 text-left transition-colors",
                  isToday(day) && "border-primary bg-primary/5",
                  isSelected(day) && "ring-primary ring-2",
                  renewalCount > 0 && "hover:border-primary/50 cursor-pointer",
                  dayOfWeek === 0 && "text-destructive",
                  dayOfWeek === 6 && "text-info"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    isToday(day) && "text-primary"
                  )}
                >
                  {day}
                </span>
                {renewalCount > 0 && (
                  <Badge
                    data-testid="renewal-badge"
                    variant="secondary"
                    className="bg-primary/10 text-primary absolute right-1 bottom-1 text-xs"
                  >
                    {t("subscriptions.calendar.renewalCount", {
                      count: renewalCount,
                    })}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
