// src/app/api/v1/extensions/reports/block-events/route.ts
/**
 * Extension Block Events Report API
 * Returns blocked URL events for reporting
 */

import { auth as getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/extensions/reports/block-events
 * Returns block events report with IP, URL, block reason, and blocked time
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

    // Get block events
    const blockEvents = await prisma.extensionBlockLog.findMany({
      where: {
        organizationId,
        blockedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        ipAddress: true,
        url: true,
        domain: true,
        blockReason: true,
        blockedAt: true,
      },
      orderBy: {
        blockedAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.extensionBlockLog.count({
      where: {
        organizationId,
        blockedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Format response
    const data = blockEvents.map((event) => ({
      id: event.id,
      ipAddress: event.ipAddress,
      url: event.url,
      domain: event.domain,
      blockReason: event.blockReason,
      blockedAt: event.blockedAt.toISOString(),
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
    logger.error({ err: error }, "Block events report error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch block events report" },
      { status: 500 }
    );
  }
}
