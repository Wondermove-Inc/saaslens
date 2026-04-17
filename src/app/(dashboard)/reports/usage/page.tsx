// src/app/(dashboard)/reports/usage/page.tsx
import { getDateRangePresets } from "@/actions/reports/browsing-usage";
import { getTeams } from "@/actions/teams";
import { getUsageReport } from "@/actions/usage-analytics";
import { getUsers } from "@/actions/users-read";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { UsageReportPageClient } from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.usage.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

interface PageProps {
  searchParams: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
    teamId?: string;
    userId?: string;
  }>;
}

export default async function UsageReportPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const isRestricted = session.user.role !== "ADMIN";

  // 기본값 설정 (최근 30일)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const period = (params.period as "30d" | "90d" | "1y" | "custom") || "30d";
  const startDate =
    params.startDate || thirtyDaysAgo.toISOString().split("T")[0];
  const endDate = params.endDate || today.toISOString().split("T")[0];
  const requestedTeamId = params.teamId ?? null;
  const requestedUserId = params.userId ?? null;
  const effectiveTeamId = isRestricted
    ? (session.user.teamId ?? null)
    : requestedTeamId;
  const effectiveUserId =
    isRestricted && !session.user.teamId ? session.user.id : requestedUserId;

  const filters = {
    period,
    startDate,
    endDate,
    teamId: effectiveTeamId ?? undefined,
    userId: effectiveUserId ?? undefined,
  };

  // 초기 데이터 로드
  const [reportData, teamsResult, usersResult, presets] = await Promise.all([
    getUsageReport(filters),
    getTeams(),
    getUsers({ limit: 1000 }),
    getDateRangePresets(),
  ]);

  const teamOptions = teamsResult.success
    ? (teamsResult.data ?? []).map((team) => ({ id: team.id, name: team.name }))
    : [];
  const userOptions = usersResult.items.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    teamId: user.team?.id ?? null,
    teamName: user.team?.name ?? null,
  }));

  const filteredTeams = isRestricted
    ? teamOptions.filter((team) => team.id === session.user.teamId)
    : teamOptions;
  const filteredUsers = isRestricted
    ? session.user.teamId
      ? userOptions.filter((user) => user.teamId === session.user.teamId)
      : userOptions.filter((user) => user.id === session.user.id)
    : userOptions;

  return (
    <div className="space-y-4">
      <UsageReportPageClient
        initialData={reportData}
        initialFilters={filters}
        teams={filteredTeams}
        users={filteredUsers}
        canExport={session.user.role !== "VIEWER"}
        includeAllOption={!isRestricted}
        presets={presets.map((p) => ({ value: p.value, label: p.label }))}
      />
    </div>
  );
}
