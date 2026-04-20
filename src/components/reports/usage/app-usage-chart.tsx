// src/components/reports/usage/app-usage-chart.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface AppUsageItem {
  appId: string;
  appName: string;
  userCount: number;
  usageRate: number;
}

interface AppUsageChartProps {
  data: AppUsageItem[];
}

const chartConfig = {
  usageRate: {
    label: "Usage Rate",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function AppUsageChart({ data }: AppUsageChartProps) {
  const t = useTranslations();

  const hasAnyUsage = data.some(
    (item) => item.usageRate > 0 || item.userCount > 0
  );

  if (data.length === 0 || !hasAnyUsage) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{t("reports.usage.appUsageChart.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[300px] items-center justify-center">
            {t("reports.usage.appUsageChart.empty")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("reports.usage.appUsageChart.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.2}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="appName"
              width={70}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  nameKey="appName"
                  formatter={(value, name) => {
                    const label =
                      name === "usageRate"
                        ? t("reports.usage.appUsageChart.tooltip.usageRate")
                        : t("reports.usage.appUsageChart.tooltip.userCount");
                    const formatted =
                      name === "usageRate"
                        ? t(
                            "reports.usage.appUsageChart.tooltip.usageRateValue",
                            {
                              rate: Number(value),
                            }
                          )
                        : t(
                            "reports.usage.appUsageChart.tooltip.userCountValue",
                            {
                              count: Number(value),
                            }
                          );
                    return (
                      <div className="flex w-full items-center justify-between gap-8">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatted}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="usageRate"
              fill="var(--color-usageRate)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
