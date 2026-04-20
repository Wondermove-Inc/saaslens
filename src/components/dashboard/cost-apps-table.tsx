"use client";

import { getTopCostApps } from "@/actions/cost-analytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export interface CostAppData {
  id: string;
  name: string;
  logoUrl?: string;
  monthlyCost: number;
  usedLicenses: number;
  totalLicenses: number;
  usageEfficiency: number;
  grade: "A" | "B" | "C" | "D";
  hasSeatData: boolean;
}

interface CostAppsTableProps {
  initialData: CostAppData[];
  period: string;
  onPeriodChange: (period: string) => void;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

function getGradeColor(grade: string) {
  switch (grade) {
    case "A":
      return "bg-success-muted text-success-muted-foreground";
    case "B":
      return "bg-info-muted text-info-muted-foreground";
    case "C":
      return "bg-warning-muted text-warning-muted-foreground";
    case "D":
      return "bg-destructive-muted text-destructive-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function getAppInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

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

function periodToDateRange(period: string): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - parseInt(period));
  return { startDate, endDate };
}

// 순위 배지 컴포넌트
function RankBadge({ rank }: { rank: number }) {
  const isFirst = rank === 1;
  return (
    <div
      className={`flex size-6 items-center justify-center rounded-sm text-sm font-semibold ${
        isFirst
          ? "bg-purple-primary text-white"
          : "bg-purple-tertiary text-purple-primary"
      }`}
    >
      {rank}
    </div>
  );
}

// 활용률 막대 그래프 컴포넌트
function UsageBars({ efficiency }: { efficiency: number }) {
  const filledBars = Math.ceil(efficiency / 20);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{efficiency}%</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-3 w-1 rounded-sm ${
              i <= filledBars ? "bg-purple-primary" : "bg-purple-tertiary"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function CostAppsTable({
  initialData,
  period,
  onPeriodChange,
  className,
}: CostAppsTableProps) {
  const t = useTranslations("dashboardV2Cost.table");
  const tChart = useTranslations("dashboardV2Cost.chart");
  const [data, setData] = useState<CostAppData[]>(initialData);
  const [isPending, startTransition] = useTransition();
  const isInitialMount = useRef(true);

  const fetchData = useCallback(
    (p: string) => {
      const { startDate, endDate } = periodToDateRange(p);
      startTransition(async () => {
        const res = await getTopCostApps({ limit: 10, startDate, endDate });
        if (res.success && res.data?.apps) {
          setData(
            res.data.apps.map((app) => ({
              id: app.appId,
              name: app.appName,
              logoUrl: app.appLogoUrl,
              monthlyCost: app.totalCost,
              usedLicenses: 0,
              totalLicenses: 0,
              usageEfficiency: 0,
              grade: "D" as const,
              hasSeatData: false,
            }))
          );
        }
      });
    },
    [startTransition]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchData(period);
  }, [period, fetchData]);

  const filteredData = data.slice(0, 10);

  return (
    <Card
      className={`bg-card flex h-[400px] flex-col gap-5 rounded border-none p-5 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] ${className ?? ""}`}
    >
      {/* 헤더: 타이틀 + 기간 탭 */}
      <div className="flex items-center justify-between">
        <p className="text-foreground text-base font-semibold">{t("title")}</p>
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
            {tChart("period3M")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="6"
            className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-purple-primary w-[50px] rounded px-3 py-1 text-xs data-[state=on]:font-semibold data-[state=on]:shadow-sm"
          >
            {tChart("period6M")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="12"
            className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-purple-primary w-[50px] rounded px-3 py-1 text-xs data-[state=on]:font-semibold data-[state=on]:shadow-sm"
          >
            {tChart("period1Y")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* 테이블 영역 */}
      <div
        className={`flex-1 overflow-y-auto transition-opacity [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isPending ? "opacity-50" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-muted-foreground w-[60px] px-2 py-2 text-center text-sm font-medium">
                {t("rank")}
              </TableHead>
              <TableHead className="text-muted-foreground px-2 py-2 text-sm font-medium">
                {t("appName")}
              </TableHead>
              <TableHead className="text-muted-foreground px-2 py-2 text-sm font-medium">
                {t("monthlyCost")}
              </TableHead>
              <TableHead className="text-muted-foreground px-2 py-2 text-sm font-medium">
                {t("licenses")}
              </TableHead>
              <TableHead className="text-muted-foreground px-2 py-2 text-sm font-medium">
                {t("usageEfficiency")}
              </TableHead>
              <TableHead className="text-muted-foreground px-2 py-2 text-center text-sm font-medium">
                {t("grade")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((app, index) => {
              const rank = index + 1;
              return (
                <TableRow
                  key={app.id}
                  className="hover:bg-purple-gray h-[52px] border-none transition-colors"
                >
                  <TableCell className="px-2 py-2 text-center">
                    <div className="flex justify-center">
                      <RankBadge rank={rank} />
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-md">
                        {app.logoUrl ? (
                          <AvatarImage src={app.logoUrl} alt={app.name} />
                        ) : null}
                        <AvatarFallback
                          className={`rounded-md text-sm font-semibold ${getAppColor(app.name)}`}
                        >
                          {getAppInitial(app.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground text-sm font-medium">
                        {app.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground px-2 py-2 text-sm font-medium">
                    ₩{formatCurrency(app.monthlyCost)}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-2 py-2 text-sm">
                    {app.hasSeatData ? (
                      `${app.usedLicenses} / ${app.totalLicenses}`
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    {app.hasSeatData ? (
                      <UsageBars efficiency={app.usageEfficiency} />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2 text-center">
                    {app.hasSeatData ? (
                      <Badge
                        className={`${getGradeColor(app.grade)} text-xs font-semibold`}
                      >
                        {app.grade}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
