// src/components/common/chart-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Download, MoreVertical } from "lucide-react";
import * as React from "react";

/**
 * ChartCard Props
 */
interface ChartCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** 우측 상단에 표시할 요약 정보 */
  summary?: {
    label: string;
    value: string;
  };
  /** CardAction 슬롯에 추가할 커스텀 액션 (e.g. ToggleGroup) */
  action?: React.ReactNode;
  /** 차트 컨텐츠 */
  children: React.ReactNode;
  /** 차트 하단에 표시할 추가 컨텐츠 */
  footer?: React.ReactNode;
  /** Export 기능 활성화 */
  enableExport?: boolean;
  /** Export 데이터 (CSV 형식) */
  exportData?: ExportData;
  /** Export 파일명 (확장자 제외) */
  exportFilename?: string;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 차트 높이 */
  chartHeight?: number;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 데이터 없음 메시지 */
  emptyMessage?: string;
  /** 데이터 없음 액션 */
  emptyAction?: React.ReactNode;
  /** 데이터 없음 여부 */
  isEmpty?: boolean;
}

/**
 * Export 데이터 타입
 */
export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
}

/**
 * CSV 문자열 생성
 */
function generateCSV(data: ExportData): string {
  const escape = (value: string | number) => {
    const str = String(value);
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = data.headers.map(escape).join(",");
  const dataRows = data.rows.map((row) => row.map(escape).join(","));

  return [headerRow, ...dataRows].join("\n");
}

/**
 * CSV 파일 다운로드
 */
function downloadCSV(csv: string, filename: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * JSON 파일 다운로드
 */
function downloadJSON(data: ExportData, filename: string) {
  const jsonData = data.rows.map((row) => {
    const obj: Record<string, string | number> = {};
    data.headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  const json = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 차트 카드 컴포넌트 (shadcn dashboard-01 패턴)
 * - CardAction 슬롯 지원
 * - 그래디언트 배경 + shadow-xs
 * - Export 기능, 로딩/빈 상태 처리
 */
export function ChartCard({
  title,
  description,
  icon,
  summary,
  action,
  children,
  footer,
  enableExport = false,
  exportData,
  exportFilename = "chart-data",
  isLoading = false,
  chartHeight = 200,
  className,
  emptyMessage = "데이터가 없습니다.",
  emptyAction,
  isEmpty = false,
}: ChartCardProps) {
  const handleExportCSV = () => {
    if (exportData) {
      const csv = generateCSV(exportData);
      downloadCSV(csv, exportFilename);
    }
  };

  const handleExportJSON = () => {
    if (exportData) {
      downloadJSON(exportData, exportFilename);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <Card
        className={cn("shadow-xs", className)}
        data-testid="chart-card-skeleton"
      >
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {icon && <Skeleton className="h-5 w-5" />}
              <Skeleton className="h-5 w-24" />
            </div>
            {description && <Skeleton className="h-4 w-32" />}
          </div>
          {summary && (
            <CardAction>
              <div className="text-right">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="mt-1 h-5 w-16" />
              </div>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height: chartHeight }} />
        </CardContent>
      </Card>
    );
  }

  // 빈 상태
  if (isEmpty) {
    return (
      <Card className={cn("shadow-xs", className)}>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2 text-lg font-bold">
            {icon}
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ height: chartHeight }}
          >
            <p className="text-muted-foreground">{emptyMessage}</p>
            {emptyAction && <div className="mt-2">{emptyAction}</div>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border/50 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 text-lg font-bold">
          {icon}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
        <CardAction>
          <div className="flex items-center gap-2">
            {action}
            {summary && (
              <div className="text-right">
                <p className="text-muted-foreground text-xs">{summary.label}</p>
                <p className="font-bold tabular-nums">{summary.value}</p>
              </div>
            )}
            {enableExport && exportData && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Export options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    CSV로 내보내기
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJSON}>
                    <Download className="mr-2 h-4 w-4" />
                    JSON으로 내보내기
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div style={{ height: chartHeight }}>{children}</div>
        {footer && <div className="mt-4 border-t pt-4">{footer}</div>}
      </CardContent>
    </Card>
  );
}

/**
 * ChartCardFooter - 차트 하단 요약 정보
 */
interface ChartCardFooterProps {
  items: {
    label: string;
    value: string | number;
    color?: string;
    variant?: "default" | "success" | "warning" | "danger";
  }[];
  columns?: 2 | 3 | 4;
}

const variantColors = {
  default: "",
  success: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
};

export function ChartCardFooter({ items, columns = 3 }: ChartCardFooterProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4 text-center text-sm", gridCols[columns])}>
      {items.map((item, index) => (
        <div key={index}>
          <p className="text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              "font-medium tabular-nums",
              item.color && `text-[${item.color}]`,
              item.variant && variantColors[item.variant]
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * ChartLegend - 차트 범례
 */
interface ChartLegendProps {
  items: {
    label: string;
    value?: string | number;
    color: string;
    href?: string;
  }[];
  onClick?: (item: ChartLegendProps["items"][0]) => void;
}

export function ChartLegend({ items, onClick }: ChartLegendProps) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const content = (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between rounded-md p-2 text-sm",
              onClick && "hover:bg-muted/50 cursor-pointer transition-colors"
            )}
            onClick={() => onClick?.(item)}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.label}</span>
            </div>
            {item.value !== undefined && (
              <span className="text-muted-foreground tabular-nums">
                {item.value}
              </span>
            )}
          </div>
        );

        return content;
      })}
    </div>
  );
}
