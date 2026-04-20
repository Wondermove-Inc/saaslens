"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { LowUtilizationApp } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

export interface SeatUtilizationChartProps {
  data: LowUtilizationApp[];
  isLoading?: boolean;
}

// 차트용 데이터 타입
interface ChartData {
  name: string;
  fullName: string;
  assigned: number;
  total: number;
  rate: number;
}

// 앱 이름 이니셜 추출
function getAppInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// 앱 이름 기반 색상
function getAppColor(name: string): string {
  const colors: Record<string, string> = {
    S: "bg-chart-4/20 text-chart-4",
    N: "bg-primary text-primary-foreground",
    F: "bg-chart-5/20 text-chart-5",
    J: "bg-info-muted text-info-muted-foreground",
    Z: "bg-info text-info-foreground",
  };
  const initial = getAppInitial(name);
  return colors[initial] || "bg-secondary text-secondary-foreground";
}

// X축 커스텀 틱 컴포넌트 (앱 아바타 표시)
interface CustomAvatarTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  chartData: ChartData[];
}

function CustomAvatarTick({
  x = 0,
  y = 0,
  payload,
  chartData,
}: CustomAvatarTickProps) {
  if (!payload?.value) return null;

  const app = chartData.find((d) => d.name === payload.value);
  if (!app) return null;

  const initial = getAppInitial(app.fullName);
  const colorClass = getAppColor(app.fullName);

  return (
    <g transform={`translate(${Number(x)},${Number(y) + 8})`}>
      <foreignObject x={-16} y={0} width={32} height={32}>
        <Avatar className="h-8 w-8 rounded-md">
          <AvatarFallback
            className={`rounded-md text-sm font-semibold ${colorClass}`}
          >
            {initial}
          </AvatarFallback>
        </Avatar>
      </foreignObject>
    </g>
  );
}

/**
 * Seat 활용률 하위 Top 5 차트 컴포넌트 (Vertical Bar Chart)
 * - Figma 디자인 적용: 세로 막대 차트
 * - Y축: 0%, 10%, 20%, 30%, 40%, 50%
 * - X축: 앱 아바타
 * - 바 스타일: 보라색 테마
 */
export function SeatUtilizationChart({
  data,
  isLoading,
}: SeatUtilizationChartProps) {
  const t = useTranslations("dashboard2.seatUtilization");

  // 정렬된 데이터 (활용률 낮은 순, 상위 5개)
  const sortedData = useMemo(() => {
    return [...data].slice(0, 5);
  }, [data]);

  // ChartConfig 동적 생성
  const chartConfig = useMemo(() => {
    if (!sortedData.length) return {} as ChartConfig;
    const config: ChartConfig = {
      rate: { label: t("rate") },
    };
    return config;
  }, [sortedData, t]);

  // Recharts 호환 데이터로 변환
  const chartData: ChartData[] = useMemo(() => {
    if (!sortedData.length) return [];
    return sortedData.map((app) => ({
      name:
        app.appName.length > 8 ? app.appName.slice(0, 8) + "…" : app.appName,
      fullName: app.appName,
      assigned: app.assignedSeats,
      total: app.totalSeats,
      rate: app.utilizationRate,
    }));
  }, [sortedData]);

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className="bg-card flex h-[400px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="flex-1" />
      </Card>
    );
  }

  // 빈 상태
  if (!sortedData.length) {
    return (
      <Card className="bg-card flex h-[400px] flex-col items-center justify-center gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      </Card>
    );
  }

  return (
    <Card className="bg-card flex h-[400px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 헤더: 타이틀 */}
      <p className="text-foreground text-base font-semibold">{t("title")}</p>

      {/* 차트 영역 */}
      <div className="flex-1">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
          >
            <CartesianGrid
              horizontal={true}
              vertical={false}
              stroke="rgba(100, 116, 243, 0.15)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={(props) => (
                <CustomAvatarTick {...props} chartData={chartData} />
              )}
              interval={0}
            />
            <YAxis
              domain={[0, 50]}
              ticks={[0, 10, 20, 30, 40, 50]}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              width={40}
            />
            <ChartTooltip
              content={(props) => (
                <ChartTooltipContent
                  active={props.active}
                  label={props.label}
                  payload={props.payload ?? []}
                  formatter={(value, name, item) => (
                    <div className="flex w-full flex-col gap-1">
                      <div className="mb-1 font-medium">
                        {item.payload?.fullName}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {t("assigned")}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {item.payload?.assigned ?? 0}/
                          {item.payload?.total ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {t("rate")}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {item.payload?.rate ?? 0}%
                        </span>
                      </div>
                    </div>
                  )}
                />
              )}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={40}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="rgba(100,116,243,0.15)"
                  stroke="rgba(100,116,243,0.6)"
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  );
}
