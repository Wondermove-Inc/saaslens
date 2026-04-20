"use client";

import { Card } from "@/components/ui/card";
import type { TotalCostKpiData } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface TotalCostCardProps {
  data: TotalCostKpiData;
  isReadOnly?: boolean;
}

/**
 * formatCurrency
 * 금액을 한국 원화 형식으로 포맷팅
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * TotalCostCard
 * Figma 디자인 기반 총 비용 KPI 카드
 * - 반투명 흰색 배경
 * - 하단에 보라색 배경의 전월 대비 영역
 */
export function TotalCostCard({
  data,
  isReadOnly = false,
}: TotalCostCardProps) {
  const t = useTranslations("dashboardV3.kpi.totalCost");

  const trendText =
    data.changePercent !== 0
      ? `${t("vsLastMonth")} ${Math.abs(data.changePercent)}% ${data.changePercent > 0 ? "상승" : "하락"}`
      : null;

  const cardContent = (
    <Card className="bg-card flex h-full flex-col gap-3 rounded border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 상단: 라벨 + 금액 */}
      <div className="flex flex-1 flex-col gap-2 px-2">
        <p className="text-primary text-xs">{t("title")}</p>
        <div className="flex items-center gap-1">
          <p className="text-secondary-foreground text-2xl font-medium">
            {formatCurrency(data.amount)}
          </p>
          <span className="text-muted-foreground py-1 text-xs">계정</span>
        </div>
      </div>
      {/* 하단: 전월 대비 */}
      {trendText && (
        <div className="bg-purple-gray rounded p-2">
          <p className="text-muted-foreground text-xs">{trendText}</p>
        </div>
      )}
    </Card>
  );

  if (isReadOnly) return cardContent;

  return (
    <Link
      href="/reports/cost"
      aria-label={t("ariaLabel")}
      className="block h-full"
    >
      <Card className="bg-card flex h-full cursor-pointer flex-col gap-3 rounded border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] transition-all hover:shadow-md">
        {/* 상단: 라벨 + 금액 */}
        <div className="flex flex-1 flex-col gap-2 px-2">
          <p className="text-primary text-xs">{t("title")}</p>
          <div className="flex items-center gap-1">
            <p className="text-secondary-foreground text-2xl font-medium">
              {formatCurrency(data.amount)}
            </p>
            <span className="text-muted-foreground py-1 text-xs">계정</span>
          </div>
        </div>
        {/* 하단: 전월 대비 */}
        {trendText && (
          <div className="bg-purple-gray rounded p-2">
            <p className="text-muted-foreground text-xs">{trendText}</p>
          </div>
        )}
      </Card>
    </Link>
  );
}
