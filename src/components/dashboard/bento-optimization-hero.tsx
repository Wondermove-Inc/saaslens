"use client";

import { Card } from "@/components/ui/card";
import type { OptimizationHeroData } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface BentoOptimizationHeroProps {
  data: OptimizationHeroData;
  isReadOnly?: boolean;
}

/**
 * formatCurrency
 * 금액을 한국 원화 형식으로 포맷팅
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

/**
 * StatSection - 개별 통계 섹션 컴포넌트
 */
function StatSection({
  label,
  amount,
  suffix,
  subtext,
  href,
  isReadOnly = false,
  showDivider = false,
  style = {},
}: {
  label: string;
  amount: number;
  suffix: string;
  subtext?: string;
  href?: string;
  isReadOnly?: boolean;
  showDivider?: boolean;
  style?: React.CSSProperties;
}) {
  const content = (
    <div
      style={style}
      className={`flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 ${
        showDivider ? "border-l border-white/30" : ""
      }`}
    >
      <p className="text-sm text-white/90">{label}</p>
      <div className="flex items-end gap-0.5">
        <span className="py-1 text-sm text-white">₩</span>
        <span className="text-3xl font-semibold text-white">
          {formatCurrency(amount)}
        </span>
        <span className="py-1 text-sm text-white">{suffix}</span>
      </div>
      {subtext && <p className="text-xs text-white/70">{subtext}</p>}
    </div>
  );

  if (href && !isReadOnly) {
    return (
      <Link
        href={href}
        className="flex min-w-0 flex-1 rounded transition-colors hover:bg-white/5"
      >
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * BentoOptimizationHero
 * Figma 디자인 기반 최적화 히어로 섹션
 * - 보라-핑크 그라데이션 배경
 * - 3개 섹션이 가로로 배치
 * - 세로 구분선으로 섹션 분리
 */
export function BentoOptimizationHero({
  data,
  isReadOnly = false,
}: BentoOptimizationHeroProps) {
  const t = useTranslations("dashboardV2Cost.hero");

  return (
    <Card className="optimization-hero-gradient flex h-[130px] flex-1 flex-row items-stretch gap-3 rounded-md border-none px-4 py-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
      {/* 섹션 1: 총 최적화 기회 */}
      <StatSection
        style={{ flex: 2 }}
        label={t("title")}
        amount={data.monthlySavings}
        suffix={`${t("perMonth")} (${t("annualPossible", { amount: `₩${formatCurrency(data.annualSavings)}` })})`}
        isReadOnly={isReadOnly}
      />

      {/* 섹션 2: 미사용 Seat */}
      <StatSection
        style={{ flex: 1 }}
        label={t("unusedLicenses")}
        amount={data.breakdown.unusedLicenses.amount}
        suffix={t("perMonth")}
        href="/subscriptions?filter=unused"
        isReadOnly={isReadOnly}
        showDivider
      />

      {/* 섹션 3: 미사용 앱 */}
      <StatSection
        style={{ flex: 1 }}
        label={t("overProvisioned")}
        amount={data.breakdown.unusedApps.amount}
        suffix={t("perMonth")}
        href="/apps?filter=unused"
        isReadOnly={isReadOnly}
        showDivider
      />
    </Card>
  );
}
