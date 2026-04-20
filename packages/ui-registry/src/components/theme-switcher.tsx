"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// Storybook globals hook types
type GlobalsUpdate = Record<string, string>;
type UseGlobalsReturn = [GlobalsUpdate, (globals: GlobalsUpdate) => void];
type UseGlobalsHook = () => UseGlobalsReturn;

// Storybook globals hook (only available in Storybook environment)
let useGlobals: UseGlobalsHook | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useGlobals = require("@storybook/preview-api").useGlobals as UseGlobalsHook;
} catch {
  // Not in Storybook environment
}

/**
 * 🎯 목적: 라이트/다크 테마 전환을 위한 UI 컴포넌트
 * - Storybook 환경: globals.theme 직접 제어 (theme-default-light ↔ theme-default-dark)
 * - Next.js 환경: next-themes를 사용하여 테마 상태 관리
 * - 드롭다운 메뉴로 Light, Dark, System 선택 제공
 * - 현재 테마에 따라 아이콘 동적 표시
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Storybook globals (if available)
  const storybookGlobals = useGlobals?.();
  const isStorybook = !!storybookGlobals;

  // 🎯 목적: 하이드레이션 불일치 방지를 위한 마운트 상태 관리
  // 클라이언트 사이드에서만 테마 UI 렌더링
  useEffect(() => {
    setMounted(true);
  }, []);

  // 서버 사이드 렌더링 시 placeholder 반환
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-5 w-5" />
        <span className="sr-only">테마 전환</span>
      </Button>
    );
  }

  // Storybook 환경에서의 현재 테마 파악
  const getCurrentMode = () => {
    if (isStorybook && storybookGlobals) {
      const [globals] = storybookGlobals;
      const currentTheme = globals.theme || "blue-light";
      return currentTheme.includes("-dark") ? "dark" : "light";
    }
    return theme || "light";
  };

  // Storybook 환경에서의 테마 전환
  const handleThemeChange = (mode: "light" | "dark" | "system") => {
    if (isStorybook && storybookGlobals) {
      const [globals, updateGlobals] = storybookGlobals;
      const currentTheme = globals.theme || "blue-light";

      // Extract color prefix (e.g., "blue" from "blue-light")
      const colorPrefix = currentTheme.split("-")[0];

      if (mode === "light") {
        updateGlobals({ theme: `${colorPrefix}-light` });
      } else if (mode === "dark") {
        updateGlobals({ theme: `${colorPrefix}-dark` });
      }
      // system은 Storybook에서 지원하지 않음
    } else {
      // Next.js 환경에서는 next-themes 사용
      setTheme(mode);
    }
  };

  const currentMode = getCurrentMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">테마 전환</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className={currentMode === "light" ? "bg-accent" : ""}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>라이트</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("dark")}
          className={currentMode === "dark" ? "bg-accent" : ""}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>다크</span>
        </DropdownMenuItem>
        {!isStorybook && (
          <DropdownMenuItem
            onClick={() => handleThemeChange("system")}
            className={currentMode === "system" ? "bg-accent" : ""}
          >
            <Sun className="mr-2 h-4 w-4" />
            <span>시스템</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
