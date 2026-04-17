"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RenewalItem } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

export type { RenewalItem };

interface UpcomingRenewalsProps {
  data: RenewalItem[];
  isLoading?: boolean;
}

function formatCurrency(amount: number): string {
  return `$${new Intl.NumberFormat("en-US").format(amount)}.00`;
}

// 앱 이름 이니셜 추출
function getAppInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// 앱 이름 기반 색상 (아바타 배경)
function getAppColor(name: string): string {
  const colors: Record<string, string> = {
    S: "bg-[#611F69] text-white", // Slack purple
    N: "bg-black text-white", // Notion
    F: "bg-[#F24E1E] text-white", // Figma
    C: "bg-[#10A37F] text-white", // ChatGPT green
    M: "bg-[#D83B01] text-white", // Microsoft orange
    A: "bg-[#FF0000] text-white", // Adobe red
    G: "bg-[#24292F] text-white", // GitHub
  };
  const initial = getAppInitial(name);
  return colors[initial] || "bg-secondary text-secondary-foreground";
}

/**
 * 30일 이내 갱신 예정 앱 컴포넌트
 * - Figma 디자인 적용
 * - 타이틀: "30일 이내 갱신 필요 앱" + 카운트 (purple-primary)
 * - 리스트: purple-gray 배경, D-X (purple-primary), 비용 (muted)
 */
export function UpcomingRenewals({ data, isLoading }: UpcomingRenewalsProps) {
  const t = useTranslations("dashboardV2Cost.renewals");

  // 상위 5개 갱신 예정 항목
  const sortedData = useMemo(() => {
    return [...data].slice(0, 5);
  }, [data]);

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className="bg-card flex h-[400px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
        <Skeleton className="h-6 w-48" />
        <div className="flex flex-1 flex-col gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card flex h-[400px] flex-col gap-5 overflow-clip rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 헤더: 타이틀 + 카운트 */}
      <div className="flex items-start gap-1 whitespace-nowrap">
        <span className="text-foreground text-base font-semibold">
          {t("title30days")}
        </span>
        <span className="text-purple-primary text-base font-semibold">
          {sortedData.length}
        </span>
      </div>

      {/* 리스트 영역 */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {sortedData.map((item) => (
          <Link
            key={item.id}
            href={`/subscriptions/${item.id}`}
            className="bg-purple-gray hover:bg-purple-tertiary flex items-center gap-2 overflow-clip rounded p-2 transition-colors"
          >
            {/* 앱 아바타 */}
            <div className="bg-card flex h-10 w-10 shrink-0 items-center justify-center rounded">
              <Avatar className="h-[30px] w-[30px] rounded">
                {item.logoUrl ? (
                  <AvatarImage src={item.logoUrl} alt={item.appName} />
                ) : null}
                <AvatarFallback
                  className={`rounded text-sm font-semibold ${getAppColor(item.appName)}`}
                >
                  {getAppInitial(item.appName)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* 앱 정보 */}
            <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
              {/* 앱 이름 */}
              <span className="text-foreground truncate text-sm font-medium">
                {item.appName}
              </span>

              {/* D-Day + 비용 */}
              <div className="flex items-center gap-2">
                <span className="text-purple-primary text-sm font-bold">
                  D-{item.daysUntilRenewal}
                </span>
                <div className="bg-purple-tertiary h-3 w-px" />
                <span className="text-muted-foreground text-sm">
                  {formatCurrency(item.renewalCost)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
