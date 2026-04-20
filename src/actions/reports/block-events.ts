"use server";

// src/actions/reports/block-events.ts
/**
 * Server Actions for Block Events Report
 * Fetches blocked URL events for the report page
 */

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";

export interface BlockEventItem {
  id: string;
  url: string;
  domain: string;
  blockReason: string;
  blockedAt: string;
  userName?: string | null;
  userEmail?: string | null;
}

export interface BlockEventsFilters {
  startDate: Date;
  endDate: Date;
  page?: number;
  limit?: number;
  search?: string;
}

export interface BlockEventsResult {
  data: BlockEventItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Get block events report data
 */
export const getBlockEventsReport = withLogging(
  "getBlockEventsReport",
  async (filters: BlockEventsFilters): Promise<BlockEventsResult> => {
    const { organizationId } = await requireOrganization();
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);

    // Set end date to end of day
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Build where clause
    const whereClause: {
      organizationId: string;
      blockedAt: { gte: Date; lte: Date };
      OR?: (
        | { url: { contains: string; mode: "insensitive" } }
        | { userId: { in: string[] } }
      )[];
    } = {
      organizationId,
      blockedAt: {
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

    // Get block events with user info
    const blockEvents = await prisma.extensionBlockLog.findMany({
      where: whereClause,
      select: {
        id: true,
        url: true,
        domain: true,
        blockReason: true,
        blockedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        blockedAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.extensionBlockLog.count({
      where: whereClause,
    });

    // Format response
    const data: BlockEventItem[] = blockEvents.map((event) => ({
      id: event.id,
      url: event.url,
      domain: event.domain,
      blockReason: event.blockReason,
      blockedAt: event.blockedAt.toISOString(),
      userName: event.user?.name ?? null,
      userEmail: event.user?.email ?? null,
    }));

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
 * Get block statistics summary
 */
export const getBlockStatsSummary = withLogging(
  "getBlockStatsSummary",
  async (
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalBlocks: number;
    uniqueDomains: number;
    topBlockedDomains: Array<{ domain: string; count: number }>;
  }> => {
    const { organizationId } = await requireOrganization();

    // Set end date to end of day
    const endDateAdjusted = new Date(endDate);
    endDateAdjusted.setHours(23, 59, 59, 999);

    // Get total blocks
    const totalBlocks = await prisma.extensionBlockLog.count({
      where: {
        organizationId,
        blockedAt: {
          gte: startDate,
          lte: endDateAdjusted,
        },
      },
    });

    // Get unique domains count
    const uniqueDomainsResult = await prisma.extensionBlockLog.groupBy({
      by: ["domain"],
      where: {
        organizationId,
        blockedAt: {
          gte: startDate,
          lte: endDateAdjusted,
        },
      },
    });
    const uniqueDomains = uniqueDomainsResult.length;

    // Get top blocked domains
    const topBlockedDomainsResult = await prisma.extensionBlockLog.groupBy({
      by: ["domain"],
      where: {
        organizationId,
        blockedAt: {
          gte: startDate,
          lte: endDateAdjusted,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const topBlockedDomains = topBlockedDomainsResult.map((item) => ({
      domain: item.domain,
      count: item._count.id,
    }));

    return {
      totalBlocks,
      uniqueDomains,
      topBlockedDomains,
    };
  }
);
