// src/app/api/cron/terminated-users-scan/route.ts
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";
import { processTerminatedUsersScan } from "@/lib/services/terminated-users";
import { NextRequest, NextResponse } from "next/server";

export const GET = withCronAuth(
  withLogging("cron:terminated-users-scan", async (request: NextRequest) => {
    try {
      logger.info("[Cron] 퇴사자 미회수 계정 스캔 시작");

      const result = await processTerminatedUsersScan();

      logger.info({ result }, "[Cron] 퇴사자 스캔 완료");

      return NextResponse.json({
        success: result.success,
        processedAt: result.processedAt,
        summary: {
          organizations: result.processedOrganizations,
          terminatedUsers: result.totalTerminatedUsers,
          unrevokedAccess: result.totalUnrevokedAccess,
          emailsSent: result.emailsSent,
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      logger.error({ err: error }, "[Cron] 퇴사자 스캔 오류");

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
