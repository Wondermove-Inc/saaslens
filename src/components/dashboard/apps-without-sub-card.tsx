"use client";

import { StatusBalloon } from "@/components/common";
import { Card } from "@/components/ui/card";
import type { AppsWithoutSubKpiData } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface AppsWithoutSubCardProps {
  data: AppsWithoutSubKpiData;
  isReadOnly?: boolean;
}

/**
 * AppsWithoutSubCard
 * Figma 디자인 기반 구독 없는 앱 KPI 카드
 * - 반투명 흰색 배경
 * - 0일 때 말풍선 표시
 * - 하단에 보라색 배경의 상태 영역
 */
export function AppsWithoutSubCard({
  data,
  isReadOnly = false,
}: AppsWithoutSubCardProps) {
  const t = useTranslations("dashboardV3.kpi.appsWithoutSub");

  const statusText =
    data.count > 0
      ? t("detail", { total: data.totalActiveApps, count: data.count })
      : t("allLinked");

  const cardContent = (
    <Card className="bg-card flex h-full flex-col gap-3 rounded border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 상단: 라벨 + 숫자 */}
      <div className="flex flex-1 flex-col gap-2 px-2">
        <p className="text-primary text-xs">{t("title")}</p>
        <div className="flex items-center gap-1">
          <p className="text-secondary-foreground text-2xl font-medium">
            {data.count}
          </p>
          {/* 0일 때 말풍선 표시 */}
          {data.count === 0 && <StatusBalloon variant="excellent" />}
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
      href="/apps?filter=no-subscription"
      aria-label={t("ariaLabel")}
      className="block h-full"
    >
      <Card className="bg-card flex h-full cursor-pointer flex-col gap-3 rounded border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] transition-all hover:shadow-md">
        {/* 상단: 라벨 + 숫자 */}
        <div className="flex flex-1 flex-col gap-2 px-2">
          <p className="text-primary text-xs">{t("title")}</p>
          <div className="flex items-center gap-1">
            <p className="text-secondary-foreground text-2xl font-medium">
              {data.count}
            </p>
            {/* 0일 때 말풍선 표시 */}
            {data.count === 0 && <StatusBalloon variant="excellent" />}
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
