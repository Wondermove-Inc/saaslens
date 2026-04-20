// src/app/(dashboard)/reports/cost/_components/monthly-trend-chart.tsx
"use client";

import { getMonthlyCostTrend } from "@/actions/cost-analytics";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { MonthlyCostTrend } from "@/types/cost-analytics";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type ChartView = "line" | "bar";

interface MonthOption {
  value: string;
  label: string;
}

const chartConfig = {
  cost: {
    label: "SaaS Cost",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

// YYYY-MM 문자열을 locale-aware 월 표시로 포맷
function formatMonth(yearMonth: string, locale: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
  }).format(date);
}

// 최근 24개월 옵션 생성
function generateMonthOptions(locale: string): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
    }).format(date);
    options.push({ value, label });
  }

  return options;
}

// 금액 포맷
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

// 축 금액 포맷 (간략화)
function formatAxisCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

interface MonthlyTrendChartProps {
  initialData: MonthlyCostTrend[];
  teamId?: string | null;
  userId?: string | null;
}

export function MonthlyTrendChart({
  initialData,
  teamId,
  userId,
}: MonthlyTrendChartProps) {
  const t = useTranslations("reports.cost.trend");
  const locale = useLocale();
  const monthOptions = generateMonthOptions(locale);

  // 기본 기간: 최근 6개월
  const defaultEndMonth = monthOptions[0].value;
  const defaultStartMonth =
    monthOptions[5]?.value || monthOptions[monthOptions.length - 1].value;

  const [chartView, setChartView] = useState<ChartView>("line");
  const [startMonth, setStartMonth] = useState(defaultStartMonth);
  const [endMonth, setEndMonth] = useState(defaultEndMonth);
  const [data, setData] = useState<MonthlyCostTrend[]>(initialData);
  const [isPending, startTransition] = useTransition();

  // 기간 변경 시 데이터 재조회
  const fetchData = useCallback(() => {
    startTransition(async () => {
      // 월 수 계산
      const start = new Date(startMonth + "-01");
      const end = new Date(endMonth + "-01");
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1;

      const result = await getMonthlyCostTrend({
        months: Math.max(1, months),
        teamId: teamId ?? undefined,
        userId: userId ?? undefined,
      });
      if (result.success && result.data) {
        // 선택한 기간으로 필터링
        const filtered = result.data.trends.filter((item) => {
          return item.month >= startMonth && item.month <= endMonth;
        });
        setData(filtered);
      }
    });
  }, [startMonth, endMonth, teamId, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 차트 데이터 변환
  const chartData = data.map((item) => ({
    month: item.month,
    label: formatMonth(item.month, locale),
    cost: item.saasCost,
  }));

  return (
    <Card className="border-border/50 min-h-[450px] rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* 기간 선택 */}
            <div className="flex items-center gap-2">
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t("startMonth")} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">~</span>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t("endMonth")} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 차트 뷰 토글 */}
            <div className="flex rounded-lg border">
              <Button
                variant={chartView === "line" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setChartView("line")}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartView === "bar" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setChartView("bar")}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">{t("noData")}</p>
          </div>
        ) : chartView === "line" ? (
          /* Line Chart (Area Chart) - ChartContainer 패턴 */
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorCostLine" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal={true}
                vertical={false}
                stroke="rgba(100, 116, 243, 0.15)"
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                padding={{ left: 10, right: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis hide={true} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-8">
                        <span className="text-muted-foreground">
                          {chartConfig.cost.label}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatCurrency(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fillOpacity={0.3}
                fill="url(#colorCostLine)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          /* Bar Chart - HTML 기반, 기존 그대로 유지 */
          <div className="space-y-4">
            {data.map((trend) => {
              const maxCost = Math.max(...data.map((t) => t.saasCost));
              const percentage =
                maxCost > 0 ? (trend.saasCost / maxCost) * 100 : 0;
              return (
                <div key={trend.month} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatMonth(trend.month, locale)}</span>
                    <span className="font-medium">
                      {formatCurrency(trend.saasCost)}
                    </span>
                  </div>
                  <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
