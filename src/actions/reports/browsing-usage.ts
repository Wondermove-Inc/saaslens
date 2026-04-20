"use server";

// src/actions/reports/browsing-usage.ts
/**
 * Server Actions for Browsing Usage Report
 * Fetches aggregated browsing log data for the report page
 */

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import { getTranslations } from "next-intl/server";

export interface BrowsingUsageItem {
  id: string;
  url: string;
  domain: string;
  visitedAt: string;
  userName?: string | null;
  userEmail?: string | null;
  userId?: string;
}

export interface BrowsingUsageFilters {
  startDate: Date;
  endDate: Date;
  page?: number;
  limit?: number;
  search?: string;
}

export interface BrowsingUsageResult {
  data: BrowsingUsageItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Get browsing usage report data
 */
export const getBrowsingUsageReport = withLogging(
  "getBrowsingUsageReport",
  async (filters: BrowsingUsageFilters): Promise<BrowsingUsageResult> => {
    const { organizationId } = await requireOrganization();
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);

    // Set end date to end of day
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Build where clause
    const whereClause: {
      organizationId: string;
      visitedAt: { gte: Date; lte: Date };
      OR?: (
        | { url: { contains: string; mode: "insensitive" } }
        | { userId: { in: string[] } }
      )[];
    } = {
      organizationId,
      visitedAt: {
        gte: filters.startDate,
        lte: endDate,
      },
    };

    // Add search filter: URL 또는 사용자(이름/이메일) 동시 검색
    if (filters.search) {
      const matchingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      const matchedUserIds = matchingUsers.map((u) => u.id);

      whereClause.OR = [
        { url: { contains: filters.search, mode: "insensitive" } },
        ...(matchedUserIds.length > 0
          ? [{ userId: { in: matchedUserIds } }]
          : []),
      ];
    }

    // Get total count for pagination
    const total = await prisma.extensionBrowsingLog.count({
      where: whereClause,
    });

    // Get individual browsing logs sorted by latest first
    const logs = await prisma.extensionBrowsingLog.findMany({
      where: whereClause,
      orderBy: { visitedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        url: true,
        domain: true,
        visitedAt: true,
        userId: true,
      },
    });

    // Collect unique userIds for batch lookup
    const userIds = [
      ...new Set(
        logs
          .map((item) => item.userId)
          .filter((id): id is string => !!id && !id.startsWith("system-"))
      ),
    ];

    // Batch fetch user info
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Format response
    const data: BrowsingUsageItem[] = logs.map((item) => {
      const user = userMap.get(item.userId);
      return {
        id: item.id,
        url: item.url,
        domain: item.domain,
        visitedAt: item.visitedAt.toISOString(),
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        userId: item.userId,
      };
    });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
);

/**
 * Get date range presets
 */
export const getDateRangePresets = withLogging(
  "getDateRangePresets",
  async (): Promise<
    Array<{
      value: string;
      label: string;
      startDate: Date;
      endDate: Date;
    }>
  > => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const t = await getTranslations("reports.browsingUsage.presets");

    return [
      {
        value: "30d",
        label: t("30d"),
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: today,
      },
      {
        value: "90d",
        label: t("90d"),
        startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: today,
      },
      {
        value: "1y",
        label: t("1y"),
        startDate: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
        endDate: today,
      },
    ];
  }
);
