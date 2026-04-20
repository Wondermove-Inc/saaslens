// src/app/(dashboard)/subscriptions/[id]/edit/page.tsx
import { getApps } from "@/actions/apps";
import { getSubscriptionCached } from "@/actions/subscriptions";
import { getUsers } from "@/actions/users-read";
import { requireOrganization } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SubscriptionEditPageClient } from "./page.client";

interface SubscriptionEditPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SubscriptionEditPageProps): Promise<Metadata> {
  const { id } = await params;
  const subscription = await getSubscriptionCached(id);

  if (!subscription) {
    return { title: "구독을 찾을 수 없음" };
  }

  return {
    title: `${subscription.appName} 구독 수정 | SaaS 관리 플랫폼`,
    description: `${subscription.appName} 구독 정보를 수정합니다`,
  };
}

export default async function SubscriptionEditPage({
  params,
}: SubscriptionEditPageProps) {
  const { id } = await params;
  const { role } = await requireOrganization();
  const isAdmin = role === "ADMIN";

  const [subscription, { items: apps }, { items: users }] = await Promise.all([
    getSubscriptionCached(id),
    getApps({ limit: 1000 }),
    getUsers({ limit: 1000, filter: { status: "ACTIVE" } }),
  ]);

  if (!subscription) {
    notFound();
  }

  const appOptions = apps.map((app) => ({
    id: app.id,
    name: app.name,
    teams: app.teams ?? [],
  }));

  const userOptions = isAdmin
    ? users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        teamId: user.team?.id ?? null,
      }))
    : [];

  const t = await getTranslations("subscriptions");

  return (
    <SubscriptionEditPageClient
      apps={appOptions}
      users={userOptions}
      isAdmin={isAdmin}
      subscription={subscription}
      title={`${subscription.appName} ${t("actions.edit")}`}
    />
  );
}
