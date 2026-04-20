import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 🎯 목적: Skeleton 컴포넌트에 forwardRef 적용하여 React 18/19 호환성 제공
 * 📝 주의사항: animate-pulse 애니메이션 유지 필수
 * 🔄 변경이력: 2025-10-11 - React 18/19 dual support를 위한 forwardRef 추가
 */
const Skeleton = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="skeleton"
        className={cn("bg-accent animate-pulse rounded-md", className)}
        {...props}
      />
    );
  },
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
