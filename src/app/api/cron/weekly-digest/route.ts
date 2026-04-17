// src/app/api/cron/weekly-digest/route.ts
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";
import { processWeeklyDigest } from "@/lib/services/notification/weeklyDigest";
import { NextRequest, NextResponse } from "next/server";

export const GET = withCronAuth(
  withLogging("cron:weekly-digest", async (request: NextRequest) => {
    try {
      const result = await processWeeklyDigest();
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "주간 요약 처리 실패",
        },
        { status: 500 }
      );
    }
  })
);
