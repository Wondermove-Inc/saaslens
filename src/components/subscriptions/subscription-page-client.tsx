// src/components/subscriptions/subscription-page-client.tsx
"use client";

import { useList } from "@refinedev/core";
import { AlertTriangle, CreditCard, DollarSign } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { KpiCard, KpiCardsGrid } from "@/components/common/kpi-card";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubscriptionListItem } from "@/types/subscription";

// 금액 포맷팅 헬퍼
const formatCurrency = (amount: number, currency: string = "KRW") => {
  const symbol = currency === "KRW" ? "₩" : "$";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
};

interface SubscriptionPageClientProps {
  canManage: boolean;
}

export function SubscriptionPageClient({
  canManage,
}: SubscriptionPageClientProps) {
  const t = useTranslations();
  const {
    query: { data, isLoading },
  } = useList<SubscriptionListItem>({
    resource: "subscriptions",
    pagination: { pageSize: 50 },
    sorters: [{ field: "renewalDate", order: "asc" }],
  });

  const subscriptions = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? subscriptions.length;

  // 구독 통계 계산
  const stats = useMemo(() => {
    const activeCount = subscriptions.filter(
      (s) => s.status === "ACTIVE"
    ).length;

    // 월간 총 비용 계산 (모든 구독을 월간으로 환산)
    const monthlyTotalCost = subscriptions.reduce((sum, sub) => {
      if (sub.status !== "ACTIVE") return sum;
      let monthlyAmount = sub.amount;
      switch (sub.billingCycle) {
        case "YEARLY":
          monthlyAmount = sub.amount / 12;
          break;
        case "QUARTERLY":
          monthlyAmount = sub.amount / 3;
          break;
        case "ONE_TIME":
          monthlyAmount = 0;
          break;
      }
      return sum + monthlyAmount;
    }, 0);

    // 30일 내 갱신 예정
    const today = new Date();
    const thirtyDaysLater = new Date(
      today.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    const renewingSoon = subscriptions.filter((s) => {
      if (!s.renewalDate || s.status !== "ACTIVE") return false;
      const renewalDate = new Date(s.renewalDate);
      return renewalDate >= today && renewalDate <= thirtyDaysLater;
    }).length;

    return { activeCount, monthlyTotalCost, renewingSoon };
  }, [subscriptions]);

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <KpiCardsGrid columns={4}>
        <KpiCard
          title={t("subscriptions.kpi.total")}
          value={total}
          icon={CreditCard}
        />
        <KpiCard
          title={t("subscriptions.kpi.active")}
          value={stats.activeCount}
          icon={CreditCard}
          change={
            total > 0
              ? {
                  value: Math.round((stats.activeCount / total) * 100),
                  type: "neutral",
                }
              : undefined
          }
        />
        <KpiCard
          title={t("subscriptions.kpi.monthlyCost")}
          value={formatCurrency(stats.monthlyTotalCost, "KRW")}
          icon={DollarSign}
        />
        <KpiCard
          title={t("subscriptions.kpi.renewingSoon")}
          value={stats.renewingSoon}
          icon={AlertTriangle}
        />
      </KpiCardsGrid>

      {/* 구독 목록 */}
      {isLoading ? (
        <div className="space-y-4">
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/50 rounded-sm shadow-sm">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-2 h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table Skeleton */}
          <Card className="rounded-sm">
            <CardHeader>
              <div className="flex items-center gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-4 w-24" />
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <SubscriptionList subscriptions={subscriptions} canManage={canManage} />
      )}
    </div>
  );
}
