// src/app/api/cron/auto-renewal/route.ts
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";
import { processAutoRenewals } from "@/lib/services/subscription/autoRenew";
import { NextRequest, NextResponse } from "next/server";

export const GET = withCronAuth(
  withLogging("cron:auto-renewal", async (request: NextRequest) => {
    try {
      logger.info("[Cron] 자동 갱신일 업데이트 시작");

      const result = await processAutoRenewals();

      logger.info({ result }, "[Cron] 자동 갱신일 업데이트 완료");

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error({ err: error }, "[Cron] 자동 갱신일 업데이트 오류");

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
