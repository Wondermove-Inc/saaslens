"use client";

import { StatusBalloon } from "@/components/common";
import { Card } from "@/components/ui/card";
import type { TerminatedKpiData } from "@/types/dashboard";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface TerminatedCardProps {
  data: TerminatedKpiData;
  isReadOnly?: boolean;
}

/**
 * TerminatedCard
 * Figma 디자인 기반 퇴사자 미회수 계정 KPI 카드
 * - 반투명 흰색 배경
 * - 0일 때 말풍선 표시
 * - 하단에 보라색 배경의 상태 영역
 */
export function TerminatedCard({
  data,
  isReadOnly = false,
}: TerminatedCardProps) {
  const t = useTranslations("dashboardV3.kpi.terminated");

  const hasIssue = data.count > 0 && data.appCount > 0;
  const statusText = hasIssue
    ? t("subAccess", { count: data.appCount })
    : t("allRecovered");

  const cardContent = (
    <Card className="bg-card flex h-full flex-col gap-3 rounded border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 상단: 라벨 + 숫자 */}
      <div className="flex flex-1 flex-col gap-2 px-2">
        <p className="text-primary text-xs">{t("title")}</p>
        <div className="flex items-center gap-1">
          {/* 분홍색 아이콘 */}
          <CircleAlert className="text-magenta-primary h-[18px] w-[18px]" />
          <p className="text-secondary-foreground text-2xl font-medium">
            {data.count}
          </p>
          <div className="flex items-end py-1">
            <span className="text-muted-foreground text-xs">
              {t("countSuffix")}
            </span>
          </div>
          {/* 0일 때 말풍선 표시 */}
          {data.count === 0 && <StatusBalloon variant="outstanding" />}
        </div>
      </div>
      {/* 하단: 상태 */}
      <div className="bg-purple-gray rounded p-2">
        <p className="text-muted-foreground text-xs">{statusText}</p>
      </div>
    </Card>
  );

  if (isReadOnly) return cardContent;

  return (
    <Link
      href="/users/offboarded"
      aria-label={t("ariaLabel")}
      className="block h-full"
    >
      <Card className="bg-card flex h-full cursor-pointer flex-col gap-3 rounded border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] transition-all hover:shadow-md">
        {/* 상단: 라벨 + 숫자 */}
        <div className="flex flex-1 flex-col gap-2 px-2">
          <p className="text-primary text-xs">{t("title")}</p>
          <div className="flex items-center gap-1">
            {/* 분홍색 아이콘 */}
            <CircleAlert className="text-magenta-primary h-[18px] w-[18px]" />
            <p className="text-secondary-foreground text-2xl font-medium">
              {data.count}
            </p>
            <div className="flex items-end py-1">
              <span className="text-muted-foreground text-xs">
                {t("countSuffix")}
              </span>
            </div>
            {/* 0일 때 말풍선 표시 */}
            {data.count === 0 && <StatusBalloon variant="outstanding" />}
          </div>
        </div>
        {/* 하단: 상태 */}
        <div className="bg-purple-gray rounded p-2">
          <p className="text-muted-foreground text-xs">{statusText}</p>
        </div>
      </Card>
    </Link>
  );
}
