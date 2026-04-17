// src/actions/discovery-insights.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { AppSource, AppStatus } from "@prisma/client";

export interface DiscoverySourceStat {
  source: AppSource;
  count: number;
}

export interface DiscoveryItem {
  id: string;
  name: string;
  source: AppSource;
  status: AppStatus;
  discoveredAt: Date;
  category: string | null;
}

export interface DiscoveryInsights {
  totalApps: number;
  shadowIt: number;
  pendingReview: number;
  newly7: number;
  newly30: number;
  sourceStats: DiscoverySourceStat[];
  recent: DiscoveryItem[];
}

/**
 * 앱 발견/인벤토리 인사이트 조회
 */
export async function getDiscoveryInsights(): Promise<DiscoveryInsights> {
  const { organizationId } = await requireOrganization();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const apps = await prisma.app.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      status: true,
      source: true,
      discoveredAt: true,
      createdAt: true,
      category: true,
    },
  });

  const totalApps = apps.length;
  const shadowIt = apps.filter(
    (app) =>
      app.status === AppStatus.PENDING_REVIEW ||
      app.status === AppStatus.BLOCKED ||
      app.source !== AppSource.MANUAL
  ).length;
  const pendingReview = apps.filter(
    (app) => app.status === AppStatus.PENDING_REVIEW
  ).length;

  const newly7 = apps.filter((app) => {
    const d = app.discoveredAt ?? app.createdAt;
    return d >= sevenDaysAgo;
  }).length;
  const newly30 = apps.filter((app) => {
    const d = app.discoveredAt ?? app.createdAt;
    return d >= thirtyDaysAgo;
  }).length;

  const sourceStatsMap = new Map<AppSource, number>();
  apps.forEach((app) => {
    sourceStatsMap.set(app.source, (sourceStatsMap.get(app.source) || 0) + 1);
  });
  const sourceStats: DiscoverySourceStat[] = Object.values(AppSource).map(
    (source) => ({
      source,
      count: sourceStatsMap.get(source as AppSource) || 0,
    })
  );

  const recent = apps
    .sort((a, b) => {
      const da = (a.discoveredAt ?? a.createdAt).getTime();
      const db = (b.discoveredAt ?? b.createdAt).getTime();
      return db - da;
    })
    .slice(0, 8)
    .map((app) => ({
      id: app.id,
      name: app.name,
      source: app.source,
      status: app.status,
      discoveredAt: app.discoveredAt ?? app.createdAt,
      category: app.category,
    }));

  return {
    totalApps,
    shadowIt,
    pendingReview,
    newly7,
    newly30,
    sourceStats,
    recent,
  };
}
