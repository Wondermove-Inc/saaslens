// src/components/dashboard/recent-activity.tsx
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecentActivityItem } from "@/types/dashboard";
import { formatDistanceToNow } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

interface RecentActivityProps {
  activities: RecentActivityItem[];
  isLoading?: boolean;
}

/**
 * 최근 활동 목록 컴포넌트
 * - Figma 디자인 적용: 카드형 아이템 레이아웃
 * - 배경: purple-gray (rgba(100, 116, 243, 0.05))
 * - 아바타: 40x40 원형
 * - 높이: h-[450px] (카테고리별앱과 동일)
 */
export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "en" ? enUS : ko;

  // 최근 5개 활동만 표시
  const displayActivities = useMemo(() => {
    return activities.slice(0, 5);
  }, [activities]);

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className="bg-card flex h-[450px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
        <Skeleton className="h-6 w-24" />
        <div className="flex flex-1 flex-col gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded" />
          ))}
        </div>
      </Card>
    );
  }

  // 빈 상태
  if (!displayActivities || displayActivities.length === 0) {
    return (
      <Card className="bg-card flex h-[450px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
        <p className="text-foreground text-base font-semibold">
          {t("dashboard.sections.recentActivity.title")}
        </p>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            {t("dashboard.recentActivity.empty")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card flex h-[450px] flex-col gap-5 overflow-clip rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 타이틀 */}
      <p className="text-foreground text-base font-semibold">
        {t("dashboard.sections.recentActivity.title")}
      </p>

      {/* 활동 목록 */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {displayActivities.map((activity) => {
          const displayName =
            activity.userName ??
            activity.userEmail ??
            t("dashboard.recentActivity.system");
          const initials = displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const timeAgo = formatDistanceToNow(new Date(activity.createdAt), {
            addSuffix: true,
            locale: dateLocale,
          });

          return (
            <div
              key={activity.id}
              className="bg-purple-gray flex items-center gap-2 rounded p-2"
            >
              {/* 아바타 */}
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-muted-foreground text-xs text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* 내용 */}
              <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
                <p className="text-foreground truncate text-sm font-medium">
                  {displayName}
                </p>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">
                    {activity.description}
                  </span>
                  <span className="shrink-0 whitespace-nowrap">{timeAgo}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
