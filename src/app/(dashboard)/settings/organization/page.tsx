// src/app/(dashboard)/settings/organization/page.tsx
import { OrganizationTabs } from "@/components/settings/organization-tabs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = {
  title: "조직 관리 | SaaS 관리 플랫폼",
  description: "조직 정보를 관리합니다",
};

export default async function OrganizationSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      name: true,
      domain: true,
      logoUrl: true,
      settings: true,
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  return (
    <OrganizationTabs
      organization={{
        name: organization.name,
        domain: organization.domain,
        logoUrl: organization.logoUrl,
        settings: organization.settings as Record<string, unknown> | null,
      }}
    />
  );
}
