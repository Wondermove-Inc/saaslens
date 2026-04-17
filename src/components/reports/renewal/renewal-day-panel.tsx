// src/app/(dashboard)/reports/renewal/_components/renewal-day-panel.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UpcomingRenewal } from "@/types/dashboard";
import { Calendar, DollarSign } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type UrgencyLevel = "urgent" | "warning" | "normal";

interface RenewalDayPanelProps {
  selectedDate: string | null;
  renewals: UpcomingRenewal[];
}

// 긴급도 계산
function getUrgencyLevel(daysUntilRenewal: number): UrgencyLevel {
  if (daysUntilRenewal <= 7) return "urgent";
  if (daysUntilRenewal <= 14) return "warning";
  return "normal";
}

// 긴급도별 스타일 (Tailwind 표준 색상)
const urgencyStyles = {
  urgent: {
    badge: "destructive" as const,
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-500/50",
    icon: "text-red-700 dark:text-red-400",
    iconBg: "bg-red-500/20",
  },
  warning: {
    badge: "secondary" as const,
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-500/50",
    icon: "text-amber-700 dark:text-amber-400",
    iconBg: "bg-amber-500/20",
  },
  normal: {
    badge: "outline" as const,
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-500/50",
    icon: "text-blue-700 dark:text-blue-400",
    iconBg: "bg-blue-500/20",
  },
};

// 금액 포맷
function formatCurrency(
  amount: number,
  currency: string = "KRW",
  locale: string = "ko"
): string {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// 날짜 포맷 (YYYY-MM-DD → 로케일)
function formatDateLocalized(dateStr: string, locale: string = "ko"): string {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 총 금액 계산
function calculateTotalAmount(renewals: UpcomingRenewal[]): number {
  return renewals.reduce((sum, r) => sum + r.amount, 0);
}

export function RenewalDayPanel({
  selectedDate,
  renewals,
}: RenewalDayPanelProps) {
  const t = useTranslations("reports.renewal.dayPanel");
  const locale = useLocale();

  // 선택된 날짜가 없는 경우
  if (!selectedDate) {
    return (
      <Card className="border-border/50 flex h-full flex-col rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("selectDate")}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <Calendar className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground whitespace-pre-line">
              {t("selectDateHint")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = calculateTotalAmount(renewals);

  return (
    <Card className="border-border/50 flex h-full flex-col rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {formatDateLocalized(selectedDate, locale)}
            </CardTitle>
            <CardDescription>
              {renewals.length > 0
                ? t("renewalCount", { count: renewals.length })
                : t("noRenewal")}
            </CardDescription>
          </div>
          {renewals.length > 0 && (
            <div className="text-right">
              <p className="text-muted-foreground text-sm">{t("totalCost")}</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCurrency(totalAmount, "KRW", locale)}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {renewals.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <Calendar className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-muted-foreground">{t("emptyDate")}</p>
          </div>
        ) : (
          <div className="h-full space-y-3 overflow-y-auto">
            {renewals.map((renewal) => {
              const urgencyLevel = getUrgencyLevel(renewal.daysUntilRenewal);
              const styles = urgencyStyles[urgencyLevel];

              return (
                <div
                  key={renewal.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    styles.border,
                    styles.bg
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        styles.iconBg
                      )}
                    >
                      <DollarSign className={cn("h-5 w-5", styles.icon)} />
                    </div>
                    <div>
                      <p className="font-medium">{renewal.appName}</p>
                      <Badge variant={styles.badge} className="mt-1">
                        D-{renewal.daysUntilRenewal}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(renewal.amount, renewal.currency, locale)}
                    </p>
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
