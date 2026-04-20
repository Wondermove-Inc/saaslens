// src/app/(dashboard)/reports/renewal/page.tsx
import { getRenewalReportData } from "@/actions/dashboard";
import { getTeams } from "@/actions/teams";
import { getUsers } from "@/actions/users-read";
import { RenewalCalendarSection } from "@/components/reports/renewal";
import { TeamUserFilterRouter } from "@/components/reports/team-user-filter-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ExportButtons } from "./_components/export-buttons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.renewal.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function formatCurrency(
  amount: number,
  currency: string = "KRW",
  locale: string = "ko"
): string {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date, locale: string = "ko"): string {
  return new Date(date).toLocaleDateString(
    locale === "ko" ? "ko-KR" : "en-US",
    {
      month: "2-digit",
      day: "2-digit",
    }
  );
}

interface PageProps {
  searchParams: Promise<{
    teamId?: string;
    userId?: string;
  }>;
}

export default async function RenewalReportPage({ searchParams }: PageProps) {
  const t = await getTranslations("reports.renewal");
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const isRestricted = session.user.role !== "ADMIN";
  const requestedTeamId = params.teamId ?? null;
  const requestedUserId = params.userId ?? null;
  const effectiveTeamId = isRestricted
    ? (session.user.teamId ?? null)
    : requestedTeamId;
  const effectiveUserId =
    isRestricted && !session.user.teamId ? session.user.id : requestedUserId;

  const [data, teamsResult, usersResult] = await Promise.all([
    getRenewalReportData({
      teamId: effectiveTeamId ?? undefined,
      userId: effectiveUserId ?? undefined,
    }),
    getTeams(),
    getUsers({ limit: 1000 }),
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

  const renderRenewalList = (
    title: string,
    items: typeof data.within7Days,
    emptyMessage: string
  ) => (
    <Card className="border-border/50 rounded rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
              >
                <div>
                  <p className="font-medium">{item.appName}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(item.renewalDate, locale)} ·{" "}
                    {t("daysLeft", { days: item.daysUntilRenewal })}
                  </p>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(item.amount, item.currency, locale)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("page.title")}
          </h1>
        </div>
        {session.user.role !== "VIEWER" && (
          <ExportButtons
            data={data}
            filters={{ teamId: effectiveTeamId, userId: effectiveUserId }}
          />
        )}
      </div>

      {/* 핵심 지표 - Bento 스타일 KPI 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">{t("stats.totalCount")}</p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {t("count", { count: data.totalCount })}
            </p>
          </div>
          {/* <div className="bg-purple-gray rounded p-2">
            <p className="text-muted-foreground text-xs">
              {t("stats.totalCountDesc")}
            </p>
          </div> */}
        </Card>

        <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">{t("stats.totalCost")}</p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {formatCurrency(data.totalRenewalCost, "KRW", locale)}
            </p>
          </div>
          {/* <div className="bg-purple-gray rounded p-2">
            <p className="text-muted-foreground text-xs">
              {t("stats.totalCostDesc")}
            </p>
          </div> */}
        </Card>

        <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">{t("stats.within7Days")}</p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {t("count", { count: data.within7Days.length })}
            </p>
          </div>
          {/* <div className="bg-purple-gray rounded p-2">
            <p className="text-muted-foreground text-xs">
              {t("stats.within7DaysDesc")}
            </p>
          </div> */}
        </Card>

        <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">{t("stats.within30Days")}</p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {t("count", {
                count: data.within7Days.length + data.within30Days.length,
              })}
            </p>
          </div>
          {/* <div className="bg-purple-gray rounded p-2">
            <p className="text-muted-foreground text-xs">
              {t("stats.within30DaysDesc")}
            </p>
          </div> */}
        </Card>
      </div>

      <TeamUserFilterRouter
        basePath="/reports/renewal"
        teamId={effectiveTeamId}
        userId={effectiveUserId}
        teams={filteredTeams}
        users={filteredUsers}
        includeAllOption={!isRestricted}
        teamLocked={isRestricted}
      />

      {/* 캘린더 기반 갱신 일정 */}
      <RenewalCalendarSection
        renewals={[...data.within7Days, ...data.within30Days]}
      />

      {/* 기간별 갱신 리스트 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {renderRenewalList(
          t("sections.within7Days"),
          data.within7Days,
          t("sections.empty.within7Days")
        )}
        {renderRenewalList(
          t("sections.within30Days"),
          data.within30Days,
          t("sections.empty.within30Days")
        )}
        {renderRenewalList(
          t("sections.within90Days"),
          data.within90Days,
          t("sections.empty.within90Days")
        )}
      </div>
    </div>
  );
}
