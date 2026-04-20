"use client";

import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import * as React from "react";

/**
 * 🎯 목적: Collapsible 컴포넌트에 forwardRef 적용하여 React 18/19 호환성 제공
 * 📝 주의사항: Radix UI Collapsible.Root primitive 사용
 * 🔄 변경이력: 2025-10-11 - React 18/19 dual support를 위한 forwardRef 추가
 */
const Collapsible = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>
>((props, ref) => {
  return (
    <CollapsiblePrimitive.Root ref={ref} data-slot="collapsible" {...props} />
  );
});
Collapsible.displayName = "Collapsible";

/**
 * 🎯 목적: CollapsibleTrigger 컴포넌트에 forwardRef 적용
 */
const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger>
>((props, ref) => {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      ref={ref}
      data-slot="collapsible-trigger"
      {...props}
    />
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

/**
 * 🎯 목적: CollapsibleContent 컴포넌트에 forwardRef 적용
 */
const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>((props, ref) => {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      ref={ref}
      data-slot="collapsible-content"
      {...props}
    />
  );
});
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
