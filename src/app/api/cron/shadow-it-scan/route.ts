// src/app/api/cron/shadow-it-scan/route.ts
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";
import { processShadowITScan } from "@/lib/services/security";
import { NextRequest, NextResponse } from "next/server";

export const GET = withCronAuth(
  withLogging("cron:shadow-it-scan", async (request: NextRequest) => {
    try {
      logger.info("[Cron] Shadow IT 스캔 시작");

      const result = await processShadowITScan();

      logger.info({ result }, "[Cron] Shadow IT 스캔 완료");

      return NextResponse.json({
        success: result.success,
        processedAt: result.processedAt,
        summary: {
          organizations: result.processedOrganizations,
          shadowApps: result.totalShadowApps,
          emailsSent: result.emailsSent,
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      logger.error({ err: error }, "[Cron] Shadow IT 스캔 오류");

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        },
        { status: 500 }
      );
    }
  })
);
