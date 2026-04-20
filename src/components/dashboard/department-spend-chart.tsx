// src/components/dashboard-v2-seat/department-spend-chart.tsx
"use client";

import type { DepartmentInsights } from "@/actions/department-insights";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

/**
 * Figma 디자인 기준 도넛 차트 색상
 * - globals.css 변수와 동일한 값 사용
 * - 개발팀: purple-primary (#6474F3)
 * - 기획팀: magenta-primary (#D165D3)
 * - 기타: Yellow (#F5D063)
 * - 영업팀: Orange (#F7A362)
 * - 데이터 분석팀: Gray (#D4D4D8)
 */
const DONUT_COLORS = [
  "#6474F3", // 개발팀 (purple-primary)
  "#D165D3", // 기획팀 (magenta-primary)
  "#F5D063", // 기타
  "#F7A362", // 영업팀
  "#D4D4D8", // 데이터 분석팀
];

interface DepartmentSpendChartProps {
  data: DepartmentInsights;
  isLoading?: boolean;
}

/**
 * 금액 포맷 (만원 단위로 축약)
 */
function formatAmount(amount: number): string {
  if (amount >= 100000000) {
    // 1억 이상
    const value = amount / 100000000;
    return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
  }
  if (amount >= 10000) {
    // 1만원 이상
    const value = amount / 10000;
    return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만`;
  }
  return `${amount.toLocaleString("ko-KR")}`;
}

/**
 * 부서별 지출 분석 차트 컴포넌트
 * - Figma 디자인 적용: 얇은 도넛 차트 + 테이블 레이아웃
 * - 중앙: "월간 총계 (₩)" + 금액
 * - 하단: 부서별 리스트 (색상 점 + 이름 + 인원수 + 퍼센트)
 */
export function DepartmentSpendChart({
  data,
  isLoading,
}: DepartmentSpendChartProps) {
  const t = useTranslations("dashboardV2Seat.department");

  // 비용 순 정렬, 상위 5개 부서
  const chartData = useMemo(() => {
    return [...data.departments]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [data.departments]);

  // 총 비용 계산
  const totalCost = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.totalCost, 0);
  }, [chartData]);

  // 퍼센트 계산
  const dataWithPercent = useMemo(() => {
    return chartData.map((item) => ({
      ...item,
      percentage:
        totalCost > 0 ? Math.round((item.totalCost / totalCost) * 100) : 0,
    }));
  }, [chartData, totalCost]);

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className="bg-card flex h-[450px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
        <Skeleton className="h-6 w-32" />
        <div className="flex h-[180px] shrink-0 items-center justify-center">
          <Skeleton className="h-[180px] w-[180px] rounded-full" />
        </div>
        <div className="flex flex-col gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  // 데이터 없음 상태
  if (chartData.length === 0) {
    return (
      <Card className="bg-card flex h-[450px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
        <p className="text-foreground text-base font-semibold">{t("title")}</p>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-muted-foreground text-sm">{t("noData")}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card flex h-[450px] flex-col gap-5 overflow-clip rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 타이틀 */}
      <p className="text-foreground text-base font-semibold">{t("title")}</p>

      {/* 콘텐츠 영역 */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* 도넛 차트 + 중앙 텍스트 */}
        <div className="relative flex h-[180px] shrink-0 items-center justify-center">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={dataWithPercent}
                cx="50%"
                cy="50%"
                innerRadius="80%"
                outerRadius="90%"
                dataKey="totalCost"
                stroke="none"
                paddingAngle={2}
              >
                {dataWithPercent.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* 중앙 텍스트 */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-muted-foreground text-xs">
              {t("monthlyTotal")}
            </span>
            <span className="text-muted-foreground text-3xl font-semibold">
              {formatAmount(totalCost)}
            </span>
          </div>
        </div>

        {/* 테이블 영역 */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {dataWithPercent.map((item, index) => (
            <div
              key={item.department}
              className="border-border flex items-center border-t px-2 py-1.5"
            >
              {/* 부서 이름 + 색상 점 */}
              <div className="flex flex-1 items-center gap-1">
                <div
                  className="h-[10px] w-[10px] shrink-0 rounded-full"
                  style={{
                    backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length],
                  }}
                />
                <span className="text-muted-foreground text-xs">
                  {item.department}
                </span>
              </div>

              {/* 인원수 */}
              <div className="w-[60px] text-right">
                <span className="text-muted-foreground text-xs">
                  {item.headcount}
                  {t("countUnit")}
                </span>
              </div>

              {/* 퍼센트 */}
              <div className="w-[60px] text-right">
                <span className="text-muted-foreground text-xs">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
