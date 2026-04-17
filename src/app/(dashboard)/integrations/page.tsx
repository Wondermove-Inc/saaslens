// src/app/(dashboard)/integrations/page.tsx
import { IntegrationsPageClient } from "@/components/integrations/integrations-page-client";
import { requireOrganization, type UserRole } from "@/lib/auth/require-auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "연동 관리 | SaaS 관리 플랫폼",
  description: "SSO/IdP 연동을 관리합니다",
};

export default async function IntegrationsPage() {
  const { role } = await requireOrganization();

  const canManage = role === "ADMIN";

  return (
    <IntegrationsPageClient canManage={canManage} role={role as UserRole} />
  );
}
