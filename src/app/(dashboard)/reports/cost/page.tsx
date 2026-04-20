// src/app/(dashboard)/reports/cost/page.tsx
import {
  detectCostAnomalies,
  getCostStatistics,
  getMonthlyCostTrend,
  getTopCostApps,
} from "@/actions/cost-analytics";
import { getTeams } from "@/actions/teams";
import { getUsers } from "@/actions/users-read";
import {
  MonthlyTrendChart,
  SeatAnalysisSection,
} from "@/components/reports/cost";
import { TeamUserFilterRouter } from "@/components/reports/team-user-filter-router";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  AlertTriangle,
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSign,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ExportButtons } from "./_components/export-buttons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.cost.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

// headers 사용으로 정적 프리렌더 불가, 동적 렌더링 강제
// NextAuth 세션 조회 + 실시간 비용 데이터(fetch + headers 사용)로 인해 정적 프리렌더 불가
export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

interface PageProps {
  searchParams: Promise<{
    teamId?: string;
    userId?: string;
  }>;
}

export default async function CostAnalysisPage({ searchParams }: PageProps) {
  const t = await getTranslations("reports.cost");
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

  // 데이터 조회
  const [statisticsResult, trendResult, topAppsResult, anomaliesResult] =
    await Promise.all([
      getCostStatistics({
        teamId: effectiveTeamId ?? undefined,
        userId: effectiveUserId ?? undefined,
      }),
      getMonthlyCostTrend({
        months: 6,
        teamId: effectiveTeamId ?? undefined,
        userId: effectiveUserId ?? undefined,
      }),
      getTopCostApps({
        limit: 5,
        teamId: effectiveTeamId ?? undefined,
        userId: effectiveUserId ?? undefined,
      }),
      detectCostAnomalies({
        teamId: effectiveTeamId ?? undefined,
        userId: effectiveUserId ?? undefined,
      }),
    ]);

  const [teamsResult, usersResult] = await Promise.all([
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

  const statistics = statisticsResult.success
    ? (statisticsResult.data?.statistics ?? null)
    : null;
  const trends = trendResult.success ? trendResult.data?.trends : [];
  const topApps = topAppsResult.success ? topAppsResult.data?.apps : [];
  const anomalies = anomaliesResult.success
    ? anomaliesResult.data?.anomalies
    : [];

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
            statistics={statistics}
            trends={trends || []}
            topApps={topApps || []}
            anomalies={anomalies || []}
            filters={{ teamId: effectiveTeamId, userId: effectiveUserId }}
          />
        )}
      </div>

      {/* 핵심 지표 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">{t("stats.totalCost")}</p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {statistics ? formatCurrency(statistics.totalCost) : "-"}
            </p>
          </div>
          {statistics && statistics.costChange !== 0 && (
            <div className="bg-purple-gray rounded p-2">
              <p
                className={`text-xs ${
                  statistics.costChange > 0
                    ? "text-destructive"
                    : "text-success"
                }`}
              >
                {statistics.costChange > 0 ? (
                  <ArrowUpIcon className="mr-1 inline h-3 w-3" />
                ) : (
                  <ArrowDownIcon className="mr-1 inline h-3 w-3" />
                )}
                {t("stats.vsLastMonth", {
                  value: formatPercentage(statistics.costChange),
                })}
              </p>
            </div>
          )}
        </Card>

        <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">{t("stats.monthlyAverage")}</p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {statistics ? formatCurrency(statistics.monthlyAverage) : "-"}
            </p>
          </div>
          <div className="bg-purple-gray rounded p-2">
            <p className="text-muted-foreground text-xs">
              {t("stats.last30Days")}
            </p>
          </div>
        </Card>

        <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">
              {t("stats.transactionCount")}
            </p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {statistics ? statistics.transactionCount.toLocaleString() : "-"}
            </p>
          </div>
          <div className="bg-purple-gray rounded p-2">
            <p className="text-muted-foreground text-xs">
              {t("stats.thisPeriod")}
            </p>
          </div>
        </Card>

        <Card className="bg-card flex h-full flex-col gap-3 rounded-sm border-none px-3 pt-5 pb-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)]">
          <div className="flex flex-1 flex-col gap-2 px-2">
            <p className="text-primary text-xs">
              {t("stats.anomalyDetection")}
            </p>
            <p className="text-secondary-foreground text-2xl font-medium">
              {t("stats.anomalyCount", { count: anomalies?.length || 0 })}
            </p>
          </div>
          <div className="bg-purple-gray rounded p-2">
            <p className="text-muted-foreground text-xs">
              {t("stats.anomalyThreshold")}
            </p>
          </div>
        </Card>
      </div>

      <TeamUserFilterRouter
        basePath="/reports/cost"
        teamId={effectiveTeamId}
        userId={effectiveUserId}
        teams={filteredTeams}
        users={filteredUsers}
        includeAllOption={!isRestricted}
        teamLocked={isRestricted}
      />

      {/* 월별 추세 */}
      <MonthlyTrendChart
        initialData={trends || []}
        teamId={effectiveTeamId}
        userId={effectiveUserId}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* 앱별 비용 분포 */}
        <Card className="border-border/50 min-h-[450px] rounded-sm shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>{t("distribution.title")}</CardTitle>
            <CardDescription>{t("distribution.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {topApps && topApps.length > 0 ? (
              <div className="space-y-4">
                {topApps.map((app) => (
                  <div
                    key={app.appId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                        <DollarSign className="text-primary h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{app.appName}</p>
                        <p className="text-muted-foreground text-xs">
                          {t("distribution.percentage", {
                            value: app.percentage.toFixed(1),
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(app.totalCost)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center">
                {t("distribution.noData")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 비용 이상 감지 */}
        <Card className="border-border/50 min-h-[450px] rounded-sm shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("anomaly.title")}
              {anomalies && anomalies.length > 0 && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {t("anomaly.count", { count: anomalies.length })}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t("anomaly.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {anomalies && anomalies.length > 0 ? (
              <div className="space-y-4">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.appId}
                    className="hover:bg-purple-gray flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{anomaly.appName}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatCurrency(anomaly.previousCost)} →{" "}
                        {formatCurrency(anomaly.currentCost)}
                      </p>
                    </div>
                    <Badge
                      className={
                        anomaly.severity === "high"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : anomaly.severity === "medium"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }
                    >
                      +{anomaly.changeRate}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-muted-foreground">
                  {t("anomaly.noAnomalies")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seat 분석 섹션 (D-2 + D-4) */}
      <SeatAnalysisSection />
    </div>
  );
}
