"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TopLicenseApp } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

export interface PerUserLicenseAppsChartProps {
  data: TopLicenseApp[];
  isLoading?: boolean;
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
    G: "bg-[#24292F] text-white", // GitHub
  };
  const initial = getAppInitial(name);
  return colors[initial] || "bg-secondary text-secondary-foreground";
}

/**
 * 라이선스 발급 Top 5 차트 컴포넌트 (Table Layout)
 * - Figma 디자인 적용: 테이블 레이아웃
 * - 컬럼: 순위, 앱 이름, 사용, 발급
 * - 1위 배지: purple-primary 그라디언트
 * - 2-5위 배지: purple-tertiary 배경
 */
export function PerUserLicenseAppsChart({
  data,
  isLoading,
}: PerUserLicenseAppsChartProps) {
  const t = useTranslations("dashboard2.licenseApps");

  // 정렬된 데이터 (발급 수 내림차순, 상위 5개)
  const sortedData = useMemo(() => {
    return [...data].slice(0, 5);
  }, [data]);

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className="bg-card flex h-[400px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="flex-1" />
      </Card>
    );
  }

  return (
    <Card className="bg-card flex h-[400px] flex-col gap-5 overflow-clip rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 헤더: 타이틀 */}
      <p className="text-foreground text-base font-semibold">{t("title")}</p>

      {/* 테이블 영역 */}
      <div className="flex flex-1 flex-col overflow-clip">
        <div className="flex w-full items-center">
          {/* 순위 컬럼 */}
          <div className="flex w-[45px] shrink-0 flex-col items-start">
            {/* 헤더 */}
            <div className="border-border flex h-[40px] w-full items-center justify-center border-b px-2">
              <span className="text-muted-foreground text-center text-sm font-medium">
                {t("rank")}
              </span>
            </div>
            {/* 데이터 행 */}
            {sortedData.map((app, index) => (
              <div
                key={app.appId}
                className={`flex h-[52px] w-full flex-col items-center justify-center p-2 ${
                  index < sortedData.length - 1 ? "border-border border-b" : ""
                }`}
              >
                <RankBadge rank={index + 1} />
              </div>
            ))}
          </div>

          {/* 앱 이름 컬럼 */}
          <div className="flex max-w-[300px] min-w-[100px] flex-1 flex-col items-start">
            {/* 헤더 */}
            <div className="border-border flex h-[40px] w-full items-center border-b px-2">
              <span className="text-muted-foreground text-sm font-medium">
                {t("appName")}
              </span>
            </div>
            {/* 데이터 행 */}
            {sortedData.map((app, index) => (
              <div
                key={app.appId}
                className={`flex h-[52px] w-full items-center gap-2 p-2 ${
                  index < sortedData.length - 1 ? "border-border border-b" : ""
                }`}
              >
                <Avatar className="h-[30px] w-[30px] rounded">
                  <AvatarFallback
                    className={`rounded text-sm font-semibold ${getAppColor(app.appName)}`}
                  >
                    {getAppInitial(app.appName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground text-sm font-medium">
                  {app.appName}
                </span>
              </div>
            ))}
          </div>

          {/* 사용 컬럼 */}
          <div className="flex min-w-[50px] flex-1 flex-col items-start">
            {/* 헤더 */}
            <div className="border-border flex h-[40px] w-full items-center justify-end border-b px-2">
              <span className="text-muted-foreground text-right text-sm font-medium">
                {t("usage")}
              </span>
            </div>
            {/* 데이터 행 */}
            {sortedData.map((app, index) => (
              <div
                key={app.appId}
                className={`flex h-[52px] w-full items-center justify-end p-2 ${
                  index < sortedData.length - 1 ? "border-border border-b" : ""
                }`}
              >
                <span className="text-foreground text-sm">
                  {app.usageCount ?? 0}
                </span>
              </div>
            ))}
          </div>

          {/* 발급 컬럼 */}
          <div className="flex min-w-[50px] flex-1 flex-col items-start">
            {/* 헤더 */}
            <div className="border-border flex h-[40px] w-full items-center justify-end border-b px-2">
              <span className="text-muted-foreground text-right text-sm font-medium">
                {t("issued")}
              </span>
            </div>
            {/* 데이터 행 */}
            {sortedData.map((app, index) => (
              <div
                key={app.appId}
                className={`flex h-[52px] w-full items-center justify-end p-2 ${
                  index < sortedData.length - 1 ? "border-border border-b" : ""
                }`}
              >
                <span className="text-foreground text-sm">
                  {app.userCount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * 순위 배지 컴포넌트
 * - 1위: purple-primary 그라디언트 배경, 흰색 텍스트
 * - 2-5위: purple-tertiary 배경, purple-primary 텍스트
 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="bg-purple-primary flex h-6 w-6 items-center justify-center rounded-sm">
        <span className="text-sm font-semibold text-white">{rank}</span>
      </div>
    );
  }

  return (
    <div className="bg-purple-tertiary flex h-6 w-6 items-center justify-center rounded-sm">
      <span className="text-purple-primary text-sm font-semibold">{rank}</span>
    </div>
  );
}
