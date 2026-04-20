// src/app/(dashboard)/payments/cards/page.tsx
import { getCorporateCards } from "@/actions/corporate-cards";
import { getTeams } from "@/actions/teams";
import { getUsers } from "@/actions/users-read";
import { PageHeader } from "@/components/common/page-header";
import { requireRole } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CardsPageClient } from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cards.page");
  return {
    title: `${t("title")} | SaaS 관리 플랫폼`,
    description: t("description"),
  };
}

export default async function CardsPage() {
  const { role } = await requireRole(["ADMIN", "MEMBER"]);

  const [cards, teamsResult, usersResult] = await Promise.all([
    getCorporateCards(),
    getTeams(),
    getUsers({ filter: { status: "ACTIVE" }, limit: 1000 }),
  ]);

  const teams =
    teamsResult.success && teamsResult.data
      ? teamsResult.data.map((t) => ({ id: t.id, name: t.name }))
      : [];

  const users = usersResult.items.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    teamId: u.team?.id ?? null,
    teamName: u.team?.name ?? null,
  }));

  const t = await getTranslations("cards.page");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <CardsPageClient
        initialCards={cards}
        isAdmin={role === "ADMIN"}
        teams={teams}
        users={users}
      />
    </div>
  );
}
