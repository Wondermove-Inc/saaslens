// src/components/reports/usage/usage-stats-cards.tsx
"use client";

import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface UsageStatsSummary {
  totalActiveUsers: number;
  totalApps: number;
  unusedAppsCount: number;
  averageUsageRate: number;
}

interface UsageStatsCardsProps {
  summary: UsageStatsSummary;
}

export function UsageStatsCards({ summary }: UsageStatsCardsProps) {
  const t = useTranslations();
  const stats = [
    {
      title: t("reports.usage.stats.activeUsers.title"),
      value: summary.totalActiveUsers.toLocaleString(),
    },
    {
      title: t("reports.usage.stats.totalApps.title"),
      value: summary.totalApps.toLocaleString(),
    },
    {
      title: t("reports.usage.stats.unusedApps.title"),
      value: summary.unusedAppsCount.toLocaleString(),
    },
    {
      title: t("reports.usage.stats.averageUsageRate.title"),
      value: `${summary.averageUsageRate}%`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]"
        >
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">{stat.title}</p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {stat.value}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
