"use client";

import { cn } from "@/lib/utils";

const GAP_MAP = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
} as const;

interface BentoGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function BentoGrid({
  children,
  columns = 12,
  gap = "md",
  className,
}: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid auto-rows-[minmax(120px,auto)]",
        GAP_MAP[gap],
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

interface BentoGridItemProps {
  children: React.ReactNode;
  colSpan?: number;
  colSpanMd?: number;
  colSpanLg?: number;
  rowSpan?: number;
  className?: string;
}

export function BentoGridItem({
  children,
  colSpan = 1,
  colSpanMd,
  colSpanLg,
  rowSpan = 1,
  className,
}: BentoGridItemProps) {
  return (
    <div
      className={cn(className)}
      style={{
        gridColumn: `span ${colSpanLg ?? colSpanMd ?? colSpan}`,
        gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
      }}
    >
      {children}
    </div>
  );
}

// Responsive Bento Grid with Tailwind classes
interface ResponsiveBentoGridProps {
  children: React.ReactNode;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function ResponsiveBentoGrid({
  children,
  gap = "md",
  className,
}: ResponsiveBentoGridProps) {
  return (
    <div
      className={cn(
        "grid auto-rows-[minmax(100px,auto)]",
        "grid-cols-1 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12",
        GAP_MAP[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

// Responsive Bento Item that uses Tailwind breakpoints
interface ResponsiveBentoItemProps {
  children: React.ReactNode;
  cols?: number; // base (mobile)
  colsSm?: number; // sm breakpoint
  colsMd?: number; // md breakpoint
  colsLg?: number; // lg breakpoint
  rows?: number;
  className?: string;
}

const COL_SPAN_CLASSES: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};

const SM_COL_SPAN_CLASSES: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
};

const MD_COL_SPAN_CLASSES: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
};

const LG_COL_SPAN_CLASSES: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

const ROW_SPAN_CLASSES: Record<number, string> = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
};

export function ResponsiveBentoItem({
  children,
  cols = 1,
  colsSm,
  colsMd,
  colsLg,
  rows = 1,
  className,
}: ResponsiveBentoItemProps) {
  return (
    <div
      className={cn(
        COL_SPAN_CLASSES[cols] || "col-span-1",
        colsSm && (SM_COL_SPAN_CLASSES[colsSm] || ""),
        colsMd && (MD_COL_SPAN_CLASSES[colsMd] || ""),
        colsLg && (LG_COL_SPAN_CLASSES[colsLg] || ""),
        ROW_SPAN_CLASSES[rows] || "row-span-1",
        className
      )}
    >
      {children}
    </div>
  );
}
