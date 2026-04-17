// src/app/(dashboard)/subscriptions/new/page.tsx
import { getApps } from "@/actions/apps";
import { getUsers } from "@/actions/users-read";
import { requireOrganization } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SubscriptionNewPageClient } from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("subscriptions.newPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function NewSubscriptionPage() {
  const { role } = await requireOrganization();
  const isAdmin = role === "ADMIN";

  const [{ items: apps }, { items: users }] = await Promise.all([
    getApps({ limit: 1000 }),
    getUsers({ limit: 1000, filter: { status: "ACTIVE" } }),
  ]);

  // 앱 옵션: teams 포함
  const appOptions = apps.map((app) => ({
    id: app.id,
    name: app.name,
    teams: app.teams ?? [],
  }));

  // 사용자 옵션: ADMIN만 볼 수 있음 (teamId 포함 - 팀별 필터링용)
  const userOptions = isAdmin
    ? users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        teamId: user.team?.id ?? null,
      }))
    : [];

  const t = await getTranslations("subscriptions.newPage");

  return (
    <SubscriptionNewPageClient
      apps={appOptions}
      users={userOptions}
      isAdmin={isAdmin}
      title={t("title")}
    />
  );
}
