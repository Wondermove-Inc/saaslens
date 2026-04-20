"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as React from "react";

/**
 * 탭 필터 아이템 타입
 */
export interface TabFilterItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  variant?: "default" | "success" | "warning" | "danger" | "secondary";
}

/**
 * 탭 필터 Props
 */
interface TabFilterProps<T extends string = string> {
  items: TabFilterItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * 배지 색상 매핑
 */
const badgeVariantStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary hover:bg-primary/20",
  success:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  secondary: "bg-muted text-muted-foreground",
};

/**
 * 탭 필터 컴포넌트
 * 레퍼런스: Orders 페이지 상단 (All / Completed / Processed / Returned / Canceled)
 */
export function TabFilter<T extends string = string>({
  items,
  value,
  onChange,
  className,
}: TabFilterProps<T>) {
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-10 items-center justify-center rounded-lg p-1",
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground"
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <Badge
                variant="secondary"
                className={cn(
                  "ml-2 h-5 min-w-[20px] rounded-full px-1.5 text-xs",
                  isActive && item.variant
                    ? badgeVariantStyles[item.variant]
                    : ""
                )}
              >
                {item.count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * useTabFilter 훅 - 탭 필터 상태 관리
 */
export function useTabFilter<T extends string>(defaultValue: T) {
  const [value, setValue] = React.useState<T>(defaultValue);
  return {
    value,
    setValue,
    onChange: setValue,
  };
}
