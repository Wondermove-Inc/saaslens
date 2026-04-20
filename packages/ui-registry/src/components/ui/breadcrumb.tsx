import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 🎯 목적: Breadcrumb 컴포넌트에 forwardRef 적용하여 React 18/19 호환성 제공
 * 📝 주의사항: aria-label="breadcrumb" 접근성 속성 유지 필수
 * 🔄 변경이력: 2025-10-11 - React 18/19 dual support를 위한 forwardRef 추가
 */
const Breadcrumb = React.forwardRef<HTMLElement, React.ComponentProps<"nav">>(
  ({ ...props }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="breadcrumb"
        data-slot="breadcrumb"
        {...props}
      />
    );
  },
);
Breadcrumb.displayName = "Breadcrumb";

/**
 * 🎯 목적: BreadcrumbList 컴포넌트에 forwardRef 적용
 * 📝 주의사항: ol 태그 사용, flex 레이아웃 유지
 */
const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentProps<"ol">
>(({ className, ...props }, ref) => {
  return (
    <ol
      ref={ref}
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
});
BreadcrumbList.displayName = "BreadcrumbList";

/**
 * 🎯 목적: BreadcrumbItem 컴포넌트에 forwardRef 적용
 */
const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
});
BreadcrumbItem.displayName = "BreadcrumbItem";

/**
 * 🎯 목적: BreadcrumbLink 컴포넌트에 forwardRef 적용
 * 📝 주의사항: asChild 패턴 지원 (Radix UI Slot 호환)
 */
const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? SlotPrimitive.Slot : "a";

  return (
    <Comp
      ref={ref}
      data-slot="breadcrumb-link"
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

/**
 * 🎯 목적: BreadcrumbPage 컴포넌트에 forwardRef 적용
 * 📝 주의사항: aria-current="page" 접근성 속성 유지
 */
const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
});
BreadcrumbPage.displayName = "BreadcrumbPage";

/**
 * 🎯 목적: BreadcrumbSeparator 컴포넌트에 forwardRef 적용
 * 📝 주의사항: ChevronRight 아이콘 기본값 유지
 */
const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ children, className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
});
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

/**
 * 🎯 목적: BreadcrumbEllipsis 컴포넌트에 forwardRef 적용
 * 📝 주의사항: MoreHorizontal 아이콘 유지
 */
const BreadcrumbEllipsis = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
});
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
