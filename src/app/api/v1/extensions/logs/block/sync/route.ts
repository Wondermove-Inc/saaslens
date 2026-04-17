// src/app/api/v1/extensions/logs/block/sync/route.ts
/**
 * Extension Block Log Sync API
 * Receives and stores blocked URL events from extension
 */

import { withExtensionAuth } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { blockLogSyncSchema } from "@/types/extension-api";
import { NextRequest, NextResponse } from "next/server";

/**
 * Extract client IP address from request headers
 */
function extractClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  return (
    forwarded?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown"
  );
}

/**
 * POST /api/v1/extensions/logs/block/sync
 * Sync block logs from extension to database
 */
export const POST = withLogging(
  "ext:logs-block-sync",
  withExtensionAuth(async (request: NextRequest, { auth }) => {
    try {
      const body = await request.json();
      const parseResult = blockLogSyncSchema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              parseResult.error.errors[0]?.message || "Invalid request body",
          },
          { status: 400 }
        );
      }

      const { device_id, user_id: payloadUserId, logs } = parseResult.data;
      const clientIP = extractClientIP(request);

      // Resolve userId: payload > device lookup > system fallback
      let userId = payloadUserId;
      if (!userId) {
        const device = await prisma.extensionDevice.findFirst({
          where: {
            deviceKey: device_id,
            organizationId: auth.organizationId,
          },
          select: { userId: true },
        });
        userId = device?.userId || `system-${auth.organizationId}`;
      }

      // Batch insert logs
      let syncedCount = 0;

      for (const log of logs) {
        try {
          await prisma.extensionBlockLog.create({
            data: {
              organizationId: auth.organizationId,
              userId,
              deviceId: device_id,
              url: log.url,
              domain: log.domain,
              ipAddress: clientIP,
              blockReason: log.block_reason,
              blockedAt: new Date(log.blocked_at),
            },
          });
          syncedCount++;
        } catch (insertError) {
          logger.error({ err: insertError }, "Failed to insert block log");
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          syncedCount,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Block log sync error");
      return NextResponse.json(
        { success: false, error: "Failed to sync block logs" },
        { status: 500 }
      );
    }
  })
);
