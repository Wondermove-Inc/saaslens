// src/components/dashboard/apps-by-category.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryDistribution } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

/**
 * Figma 디자인 기준 도넛 차트 색상
 * - globals.css 변수와 동일한 값 사용
 * - 개발: purple-primary (#6474F3)
 * - 디자인: magenta-primary (#D165D3)
 * - 협업: Yellow (#F5D063)
 * - 기타: Orange (#F7A362)
 * - 데이터 분석: Gray (#D4D4D8)
 */
const DONUT_COLORS = [
  "#6474F3", // 개발 (purple-primary)
  "#D165D3", // 디자인 (magenta-primary)
  "#F5D063", // 협업
  "#F7A362", // 기타
  "#D4D4D8", // 데이터 분석
];

interface AppsByCategoryProps {
  data: CategoryDistribution[];
  isLoading?: boolean;
}

/**
 * 카테고리별 앱 분포 차트 컴포넌트
 * - Figma 디자인 적용: 얇은 도넛 차트 + 테이블 레이아웃
 * - 중앙: "전체 앱" + 총 개수
 * - 하단: 카테고리별 리스트 (색상 점 + 이름 + 개수 + 퍼센트)
 */
export function AppsByCategory({ data, isLoading }: AppsByCategoryProps) {
  const t = useTranslations("dashboard.appsByCategory");

  // 상위 5개 카테고리만 표시
  const chartData = useMemo(() => {
    return [...data].slice(0, 5);
  }, [data]);

  // 총 앱 개수 계산
  const totalApps = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.count, 0);
  }, [chartData]);

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
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="80%"
                outerRadius="90%"
                dataKey="count"
                stroke="none"
                paddingAngle={2}
              >
                {chartData.map((_, index) => (
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
              {t("totalApps")}
            </span>
            <span className="text-muted-foreground text-3xl font-semibold">
              {totalApps}
            </span>
          </div>
        </div>

        {/* 테이블 영역 */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {chartData.map((item, index) => (
            <div
              key={item.category}
              className="border-border flex items-center border-t px-2 py-1.5"
            >
              {/* 카테고리 이름 + 색상 점 */}
              <div className="flex flex-1 items-center gap-1">
                <div
                  className="h-[10px] w-[10px] shrink-0 rounded-full"
                  style={{
                    backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length],
                  }}
                />
                <span className="text-muted-foreground text-xs">
                  {item.category}
                </span>
              </div>

              {/* 개수 */}
              <div className="w-[60px] text-right">
                <span className="text-muted-foreground text-xs">
                  {item.count}
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
