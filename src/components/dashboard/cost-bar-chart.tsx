"use client";

import { Card } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

export interface MonthlyBarData {
  month: string;
  displayLabel: string;
  saasCost: number;
  nonSaasCost: number;
  isCurrentMonth?: boolean;
}

interface CostBarChartProps {
  data: MonthlyBarData[];
  period: string;
  onPeriodChange?: (period: string) => void;
}

function formatCurrency(amount: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(amount)}`;
}

function formatMonthShort(yearMonth: string): string {
  const [, month] = yearMonth.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[month - 1] || yearMonth;
}

export function CostBarChart({
  data,
  period,
  onPeriodChange,
}: CostBarChartProps) {
  const t = useTranslations("dashboardV2Cost.chart");

  const monthsToShow = parseInt(period);
  const chartData = data.slice(-monthsToShow);

  const chartConfig = {
    saasCost: {
      label: t("saasCost"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="bg-card flex h-[400px] flex-col gap-5 overflow-hidden rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 헤더: 타이틀 + 기간 탭 */}
      <div className="flex items-center justify-between">
        <p className="text-foreground text-base font-semibold">{t("title")}</p>
        {onPeriodChange && (
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(value) => value && onPeriodChange(value)}
            className="bg-purple-gray gap-0 rounded p-[3px]"
          >
            <ToggleGroupItem
              value="3"
              className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-purple-primary w-[50px] rounded px-3 py-1 text-xs data-[state=on]:font-semibold data-[state=on]:shadow-sm"
            >
              {t("period3M")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="6"
              className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-purple-primary w-[50px] rounded px-3 py-1 text-xs data-[state=on]:font-semibold data-[state=on]:shadow-sm"
            >
              {t("period6M")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="12"
              className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-purple-primary w-[50px] rounded px-3 py-1 text-xs data-[state=on]:font-semibold data-[state=on]:shadow-sm"
            >
              {t("period1Y")}
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
      {/* 차트 영역 */}
      <div className="flex-1 overflow-hidden">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full overflow-hidden"
        >
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="saasCostGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgba(100, 116, 243, 0.15)"
                  stopOpacity={1}
                />
                <stop
                  offset="100%"
                  stopColor="rgba(100, 116, 243, 0)"
                  stopOpacity={1}
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
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={formatMonthShort}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis hide={true} />
            <ChartTooltip
              content={(props) => (
                <ChartTooltipContent
                  active={props.active}
                  label={props.label}
                  payload={props.payload ?? []}
                  formatter={(value) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig.saasCost.label}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="saasCost"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#saasCostGradient)"
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </Card>
  );
}
