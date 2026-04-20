// src/components/super-admin/stats-kpi-cards.tsx
import type { SuperAdminStats } from "@/actions/super-admin/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, DollarSign, UserCheck, Users } from "lucide-react";

interface StatsKpiCardsProps {
  stats: SuperAdminStats;
}

export function StatsKpiCards({ stats }: StatsKpiCardsProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const cards = [
    {
      title: "총 사용자",
      value: stats.totalUsers.toLocaleString("ko-KR"),
      description: `활성: ${stats.activeUsers.toLocaleString("ko-KR")}명`,
      icon: Users,
    },
    {
      title: "활성 구독",
      value: `${stats.totalSubscriptions}개`,
      description: "현재 활성 구독 수",
      icon: UserCheck,
    },
    {
      title: "이번 달 총 비용",
      value: formatCurrency(stats.monthlyTotalCost, stats.currency),
      description: "월 환산 구독 비용",
      icon: DollarSign,
    },
    {
      title: "Extension 최신 빌드",
      value: stats.latestBuildVersion ? `v${stats.latestBuildVersion}` : "없음",
      description: stats.latestBuildDate
        ? `빌드일: ${new Date(stats.latestBuildDate).toLocaleDateString("ko-KR")}`
        : "빌드 기록 없음",
      icon: Box,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-muted-foreground text-xs">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
