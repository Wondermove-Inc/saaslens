// src/app/(dashboard)/settings/appearance/page.tsx
import { AppearanceSettingsClient } from "@/components/settings/appearance-settings-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "외관 설정 | SaaS 관리 플랫폼",
  description: "테마 및 표시 설정을 관리합니다",
};

export default function AppearanceSettingsPage() {
  return <AppearanceSettingsClient />;
}
