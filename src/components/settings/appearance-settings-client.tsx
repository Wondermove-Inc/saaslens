"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

// 다크 모드 미리보기 색상
const darkColors = {
  background: "#171717",
  foreground: "#ffffff",
  primary: "#818cf8",
  muted: "#262626",
  mutedForeground: "#a4a4a4",
  border: "#404040",
};

// 라이트 모드 미리보기 색상
const lightColors = {
  background: "#ffffff",
  foreground: "#333333",
  primary: "#6366f1",
  muted: "#f8f8f8",
  mutedForeground: "#6c727e",
  border: "#e4e8ef",
};

export function AppearanceSettingsClient() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const themes = useMemo(
    () => [
      {
        id: "light",
        label: t("settings.appearance.themes.light.title"),
        description: t("settings.appearance.themes.light.description"),
        icon: Sun,
      },
      {
        id: "dark",
        label: t("settings.appearance.themes.dark.title"),
        description: t("settings.appearance.themes.dark.description"),
        icon: Moon,
      },
      {
        id: "system",
        label: t("settings.appearance.themes.system.title"),
        description: t("settings.appearance.themes.system.description"),
        icon: Monitor,
      },
    ],
    [t]
  );

  // 선택한 테마에 따른 미리보기 색상 결정
  const previewColors = useMemo(() => {
    let previewTheme = theme;
    if (theme === "system" && typeof window !== "undefined") {
      previewTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return previewTheme === "dark" ? darkColors : lightColors;
  }, [theme]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-4 w-20 rounded" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-lg p-2">
          <Palette className="text-primary h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-medium">
            {t("settings.appearance.title")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("settings.appearance.description")}
          </p>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="grid gap-4 sm:grid-cols-3">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.id;

          return (
            <button
              key={themeOption.id}
              type="button"
              onClick={() => setTheme(themeOption.id)}
              className={cn(
                "hover:bg-purple-gray relative flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-colors",
                isSelected
                  ? "border-primary bg-accent"
                  : "border-muted hover:border-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="font-medium">{themeOption.label}</p>
                <p className="text-muted-foreground text-xs">
                  {themeOption.description}
                </p>
              </div>
              {isSelected && (
                <div className="bg-primary absolute top-2 right-2 h-2 w-2 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 테마 미리보기 - 선택한 테마에 따라 색상 변경 */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          {t("settings.appearance.preview")}
        </Label>
        <div
          className="rounded-lg border p-4 transition-colors"
          style={{
            backgroundColor: previewColors.background,
            borderColor: previewColors.border,
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full"
                style={{ backgroundColor: previewColors.primary }}
              />
              <div className="space-y-1">
                <div
                  className="h-3 w-24 rounded"
                  style={{ backgroundColor: previewColors.foreground }}
                />
                <div
                  className="h-2 w-32 rounded"
                  style={{ backgroundColor: previewColors.mutedForeground }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div
                className="h-8 w-20 rounded-md"
                style={{ backgroundColor: previewColors.primary }}
              />
              <div
                className="h-8 w-20 rounded-md"
                style={{
                  backgroundColor: previewColors.background,
                  border: `1px solid ${previewColors.border}`,
                }}
              />
            </div>
            <div className="space-y-2">
              <div
                className="h-2 w-full rounded"
                style={{ backgroundColor: previewColors.muted }}
              />
              <div
                className="h-2 w-3/4 rounded"
                style={{ backgroundColor: previewColors.muted }}
              />
              <div
                className="h-2 w-1/2 rounded"
                style={{ backgroundColor: previewColors.muted }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
