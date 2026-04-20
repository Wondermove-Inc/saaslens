// src/app/api/v1/extensions/usage/sync/route.ts
/**
 * Extension Usage Sync API
 * 도메인별 사용량 데이터 동기화
 */

import { withExtensionAuth } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { usageSyncSchema } from "@/types/extension-api";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/extensions/usage/sync
 * Extension에서 수집한 사용량 데이터를 DB에 저장
 */
export const POST = withLogging(
  "ext:usage-sync",
  withExtensionAuth(async (request: NextRequest, { auth }) => {
    try {
      const body = await request.json();
      const parseResult = usageSyncSchema.safeParse(body);

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

      const {
        deviceId,
        userId: payloadUserId,
        dailyUsage,
        syncTimestamp,
      } = parseResult.data;
      let syncedCount = 0;

      // Resolve userId: payload > device lookup
      let resolvedUserId = payloadUserId;
      if (!resolvedUserId) {
        const device = await prisma.extensionDevice.findFirst({
          where: { deviceKey: deviceId, organizationId: auth.organizationId },
          select: { userId: true },
        });
        resolvedUserId = device?.userId || undefined;
      }

      // 각 일별 사용량 처리
      for (const daily of dailyUsage) {
        const date = new Date(daily.date);

        // 도메인별 사용량 upsert
        for (const [domain, domainData] of Object.entries(daily.domains)) {
          // 세션 기반 visit count 계산
          const visitCount = domainData.sessions.length;
          const totalSeconds = Math.round(domainData.totalSeconds);

          await prisma.extensionUsage.upsert({
            where: {
              organizationId_deviceId_domain_date: {
                organizationId: auth.organizationId,
                deviceId,
                domain,
                date,
              },
            },
            create: {
              organizationId: auth.organizationId,
              deviceId,
              userId: resolvedUserId,
              domain,
              date,
              visitCount,
              totalSeconds,
            },
            update: {
              visitCount: { increment: visitCount },
              totalSeconds: { increment: totalSeconds },
              ...(resolvedUserId && { userId: resolvedUserId }),
            },
          });
          syncedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          syncedCount,
          syncedAt: syncTimestamp,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Usage sync error");
      return NextResponse.json(
        { success: false, error: "Failed to sync usage data" },
        { status: 500 }
      );
    }
  })
);
