"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 🎯 목적: TooltipProvider 컴포넌트 (Radix UI Provider primitive)
 * 📝 주의사항: Provider primitive는 ref를 지원하지 않음
 * 🔄 변경이력: 2025-10-11 - React 18/19 dual support 검토 (ref 미지원 확인)
 */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

/**
 * 🎯 목적: Tooltip 컴포넌트 (Radix UI Root primitive)
 * 📝 주의사항: Root primitive는 ref를 지원하지 않음
 * 🔄 변경이력: 2025-10-11 - React 18/19 dual support 검토 (ref 미지원 확인)
 */
function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

/**
 * 🎯 목적: TooltipTrigger 컴포넌트에 forwardRef 적용하여 React 18/19 호환성 제공
 * 📝 주의사항: Radix UI Trigger primitive 사용
 * 🔄 변경이력: 2025-10-11 - React 18/19 dual support를 위한 forwardRef 추가
 */
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>((props, ref) => {
  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      data-slot="tooltip-trigger"
      {...props}
    />
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

/**
 * 🎯 목적: TooltipContent 컴포넌트에 forwardRef 적용하여 React 18/19 호환성 제공
 * 📝 주의사항: Radix UI Content primitive 사용, Portal로 래핑됨, Arrow 포함
 * 🔄 변경이력: 2025-10-11 - React 18/19 dual support를 위한 forwardRef 추가
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 0, children, ...props }, ref) => {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
