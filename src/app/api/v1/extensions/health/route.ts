// src/app/api/v1/extensions/health/route.ts
/**
 * Extension Health Check API
 * 토큰 유효성 및 서버 연결 확인
 */

import { withExtensionAuth } from "@/lib/api/extension-auth";
import { withLogging } from "@/lib/logging";
import { NextResponse } from "next/server";

/**
 * GET /api/v1/extensions/health
 * 토큰 유효성 확인 및 서버 상태 응답
 */
export const GET = withLogging(
  "ext:health",
  withExtensionAuth(async (_request, { auth }) => {
    return NextResponse.json({
      success: true,
      data: {
        status: "ok",
        timestamp: Date.now(),
        organizationId: auth.organizationId,
      },
    });
  })
);
