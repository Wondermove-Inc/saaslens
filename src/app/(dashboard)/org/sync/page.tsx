// src/app/(dashboard)/org/sync/page.tsx

import { OrgLayout } from "@/components/org/org-layout";
import { OrgSyncForm } from "@/components/org/org-sync-form";
import { requireAdmin } from "@/lib/auth/require-auth";

export async function generateMetadata() {
  return {
    title: "조직 및 사용자 연동 | SaaS Management Platform",
    description:
      "CSV 파일 또는 외부 시스템을 통해 조직 구조와 사용자를 동기화합니다",
  };
}

export default async function OrgSyncPage() {
  await requireAdmin("/dashboard");

  return (
    <OrgLayout>
      <OrgSyncForm />
    </OrgLayout>
  );
}
