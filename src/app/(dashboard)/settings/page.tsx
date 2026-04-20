// src/app/(dashboard)/settings/page.tsx
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { requireOrganization } from "@/lib/auth/require-auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "설정 | SaaS 관리 플랫폼",
  description: "계정 및 조직 설정을 관리합니다",
};

export default async function SettingsPage() {
  const { session, organizationId, userId, role } = await requireOrganization();

  return (
    <SettingsPageClient
      fallbackUser={{
        id: userId,
        email: session.user.email!,
        name: session.user.name,
        organizationId,
        role,
      }}
    />
  );
}
