// src/app/(dashboard)/reports/renewal/_components/renewal-calendar-section.tsx
"use client";

import type { UpcomingRenewal } from "@/types/dashboard";
import { useState } from "react";
import { RenewalCalendarView } from "./renewal-calendar-view";
import { RenewalDayPanel } from "./renewal-day-panel";

interface RenewalCalendarSectionProps {
  renewals: UpcomingRenewal[];
}

export function RenewalCalendarSection({
  renewals,
}: RenewalCalendarSectionProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRenewals, setSelectedRenewals] = useState<UpcomingRenewal[]>(
    []
  );

  const handleDateSelect = (date: string, dateRenewals: UpcomingRenewal[]) => {
    setSelectedDate(date);
    setSelectedRenewals(dateRenewals);
  };

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-3">
      {/* 캘린더 (2/3 너비) */}
      <div className="lg:col-span-2">
        <RenewalCalendarView
          renewals={renewals}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
        />
      </div>

      {/* 날짜별 상세 (1/3 너비) */}
      <div className="h-full">
        <RenewalDayPanel
          selectedDate={selectedDate}
          renewals={selectedRenewals}
        />
      </div>
    </div>
  );
}
