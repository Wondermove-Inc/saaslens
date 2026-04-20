// src/app/api/cron/cost-anomaly-scan/route.ts
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";
import { processCostAnomalyScan } from "@/lib/services/cost";
import { NextRequest, NextResponse } from "next/server";

export const GET = withCronAuth(
  withLogging("cron:cost-anomaly-scan", async (request: NextRequest) => {
    try {
      logger.info("[Cron] 비용 이상 감지 스캔 시작");

      const result = await processCostAnomalyScan();

      logger.info({ result }, "[Cron] 비용 이상 감지 스캔 완료");

      return NextResponse.json({
        success: result.success,
        processedAt: result.processedAt,
        summary: {
          organizations: result.processedOrganizations,
          anomalies: result.anomaliesFound,
          emailsSent: result.emailsSent,
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      logger.error({ err: error }, "[Cron] 비용 이상 감지 스캔 오류");

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
