// src/app/(dashboard)/users/offboarded/page.tsx
import { OrgLayout } from "@/components/org/org-layout";
import { TerminatedUsersPageClient } from "@/components/users/terminated-users-page-client";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("users.terminated.page");
  return {
    title: `${t("title")} | SaaS Management Platform`,
    description: t("description"),
  };
}

export default async function TerminatedUsersPage() {
  return (
    <OrgLayout>
      <TerminatedUsersPageClient />
    </OrgLayout>
  );
}
