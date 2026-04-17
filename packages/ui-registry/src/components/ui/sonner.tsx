"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

/**
 * 🎯 목적: Toaster 컴포넌트 (sonner toast 라이브러리)
 * 📝 주의사항: sonner의 Toaster는 ref를 지원하지 않음
 * 🔄 변경이력: 2025-10-11 - React 18/19 dual support 검토 (ref 미지원 확인)
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
