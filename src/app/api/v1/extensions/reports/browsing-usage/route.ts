// src/app/api/v1/extensions/reports/browsing-usage/route.ts
/**
 * Extension Browsing Usage Report API
 * Returns aggregated browsing usage data for reporting
 */

import { auth as getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/extensions/reports/browsing-usage
 * Returns browsing usage report with IP, URL, whitelist/blacklist status, and visit count
 *
 * Query Parameters:
 * - startDate: ISO 8601 date string (required)
 * - endDate: ISO 8601 date string (required)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getAuth();
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = session.user.organizationId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );

    // Validate date parameters
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { success: false, error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Get aggregated data grouped by IP and URL
    const aggregatedData = await prisma.extensionBrowsingLog.groupBy({
      by: ["ipAddress", "url", "isWhitelisted", "isBlacklisted"],
      where: {
        organizationId,
        visitedAt: {
          gte: startDate,
          lte: endDate,
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
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const totalCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT CONCAT("ip_address", "url")) as count
      FROM "extension_browsing_logs"
      WHERE "organization_id" = ${organizationId}
        AND "visited_at" >= ${startDate}
        AND "visited_at" <= ${endDate}
    `;

    const total = Number(totalCountResult[0]?.count || 0);

    // Format response
    const data = aggregatedData.map((item) => ({
      ipAddress: item.ipAddress,
      url: item.url,
      isWhitelisted: item.isWhitelisted,
      isBlacklisted: item.isBlacklisted,
      visitCount: item._count.id,
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Browsing usage report error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch browsing usage report" },
      { status: 500 }
    );
  }
}
