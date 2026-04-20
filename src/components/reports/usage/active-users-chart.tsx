// src/components/reports/usage/active-users-chart.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

interface ActiveUsersTrendItem {
  date: string;
  count: number;
}

interface ActiveUsersChartProps {
  data: ActiveUsersTrendItem[];
}

const chartConfig = {
  count: {
    label: "Active Users",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ActiveUsersChart({ data }: ActiveUsersChartProps) {
  const t = useTranslations();
  const formatXAxis = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "M/d", { locale: ko });
    } catch {
      return dateStr;
    }
  };

  const formatTooltipLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "yyyy년 M월 d일", { locale: ko });
    } catch {
      return dateStr;
    }
  };

  if (data.length === 0) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{t("reports.usage.activeUsersChart.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[300px] items-center justify-center">
            {t("reports.usage.activeUsersChart.empty")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("reports.usage.activeUsersChart.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.2}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) => formatTooltipLabel(String(value))}
                  formatter={(value) => (
                    <div className="flex w-full items-center justify-between gap-8">
                      <span className="text-muted-foreground">
                        {t("reports.usage.activeUsersChart.tooltipLabel")}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {t("reports.usage.activeUsersChart.tooltipValue", {
                          count: Number(value),
                        })}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={{ fill: "var(--color-count)", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
