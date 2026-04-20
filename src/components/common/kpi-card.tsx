"use client";

import { ArrowDown, ArrowRight, ArrowUp, LucideIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
  };
  /** CardFooter에 표시할 트렌드 요약 문구 */
  trendSummary?: string;
  href?: string;
  className?: string;
}

/**
 * 개선된 KPI 카드 컴포넌트 (shadcn dashboard-01 패턴)
 * - @container 쿼리 기반 반응형
 * - CardAction 슬롯에 트렌드 Badge
 * - CardFooter에 트렌드 요약 문구
 * - Color Theme Guide 준수 배경색 + shadow-xs
 * - tabular-nums 숫자 정렬
 */
export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  change,
  trendSummary,
  href,
  className,
}: KpiCardProps) {
  const isPositive = change?.type === "increase";
  const isNegative = change?.type === "decrease";

  return (
    <Card
      className={cn(
        "border-border/50 @container/card rounded-sm shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <CardHeader>
        <CardDescription className="text-sm font-medium">
          {title}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {change && (
          <CardAction>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-xs font-medium",
                isPositive &&
                  "border-green-200 text-green-700 dark:border-green-800 dark:text-green-400",
                isNegative &&
                  "border-red-200 text-red-700 dark:border-red-800 dark:text-red-400"
              )}
            >
              {isPositive && <ArrowUp className="size-3" />}
              {isNegative && <ArrowDown className="size-3" />}
              {change.value > 0 ? "+" : ""}
              {change.value}%
            </Badge>
          </CardAction>
        )}
        {!change && Icon && (
          <CardAction>
            <div className="bg-muted rounded-lg p-2.5">
              <Icon className="text-muted-foreground size-4" />
            </div>
          </CardAction>
        )}
      </CardHeader>
      {(description || trendSummary || href) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {description && (
            <div className="text-muted-foreground text-xs">{description}</div>
          )}
          {trendSummary && (
            <div className="flex gap-2 text-xs font-medium">
              {trendSummary}
              {isPositive && <ArrowUp className="size-3" />}
              {isNegative && <ArrowDown className="size-3" />}
            </div>
          )}
          {href && (
            <Link
              href={href}
              className="text-primary inline-flex items-center text-xs font-medium hover:underline"
            >
              View more
              <ArrowRight className="ml-1 size-3" />
            </Link>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * KPI 카드 그리드 컨테이너
 */
interface KpiCardsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function KpiCardsGrid({
  children,
  columns = 4,
  className,
}: KpiCardsGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
