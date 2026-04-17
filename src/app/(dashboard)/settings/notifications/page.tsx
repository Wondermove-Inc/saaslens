// src/app/(dashboard)/settings/notifications/page.tsx
import { getOrganizationNotificationSettings } from "@/actions/organization-notification-settings";
import { NotificationSettingsForm } from "@/components/settings";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "알림 설정 | SaaS 관리 플랫폼",
  description: "조직의 알림 수신 설정을 관리합니다",
};

export default async function NotificationsSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const settings = await getOrganizationNotificationSettings();

  return <NotificationSettingsForm initialSettings={settings} />;
}
