// src/app/api/cron/renewal-alerts/route.ts
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";
import { processRenewalAlerts } from "@/lib/services/notification";
import { NextRequest, NextResponse } from "next/server";

export const GET = withCronAuth(
  withLogging("cron:renewal-alerts", async (request: NextRequest) => {
    try {
      logger.info("[Cron] 갱신 알림 처리 시작");

      const result = await processRenewalAlerts();

      logger.info({ result }, "[Cron] 갱신 알림 처리 완료");

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error({ err: error }, "[Cron] 갱신 알림 처리 오류");

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
