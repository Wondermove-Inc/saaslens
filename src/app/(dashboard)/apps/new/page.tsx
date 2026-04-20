// src/app/(dashboard)/apps/new/page.tsx
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppNewPageClient } from "./page.client";

export default async function NewAppPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const t = await getTranslations("apps.new");
  const userRole = session.user.role;
  const userTeamId = session.user.teamId ?? null;

  return (
    <AppNewPageClient
      userRole={userRole}
      userTeamId={userTeamId}
      title={t("pageTitle")}
    />
  );
}
