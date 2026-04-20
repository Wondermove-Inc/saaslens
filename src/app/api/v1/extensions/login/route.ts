// src/app/api/v1/extensions/login/route.ts
/**
 * Extension Login Capture API
 * 로그인 정보 캡처 및 HIBP 침해 체크
 */

import { withExtensionAuth } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { bridgeLoginToAppAccess } from "@/lib/services/discovery/login-access-bridge";
import { checkCredentialHIBP } from "@/lib/services/hibp/breach-checker";
import { loginCaptureSchema } from "@/types/extension-api";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/extensions/login
 * 로그인 정보 캡처 및 저장
 * 선택적으로 HIBP 침해 체크 수행
 */
export const POST = withLogging(
  "ext:login",
  withExtensionAuth(async (request: NextRequest, { auth }) => {
    try {
      const body = await request.json();
      const parseResult = loginCaptureSchema.safeParse(body);

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
        device_id,
        domain,
        username,
        password_hash,
        auth_type,
        captured_at,
      } = parseResult.data;

      // HIBP 체크 수행 (비동기, 실패해도 로그인 이벤트는 저장)
      let hibpResult = {
        checked: false,
        breached: false,
        count: undefined as number | undefined,
      };
      try {
        const hibpCheck = await checkCredentialHIBP(password_hash);
        hibpResult = {
          checked: hibpCheck.checked,
          breached: hibpCheck.breached,
          count: hibpCheck.count,
        };
      } catch (hibpError) {
        logger.error({ err: hibpError }, "HIBP check failed");
      }

      // 로그인 이벤트 저장
      const loginEvent = await prisma.extensionLoginEvent.create({
        data: {
          organizationId: auth.organizationId,
          deviceId: device_id,
          domain,
          username,
          passwordHash: password_hash,
          authType: auth_type,
          capturedAt: new Date(captured_at),
          hibpChecked: hibpResult.checked,
          hibpBreached: hibpResult.breached,
          hibpBreachCount: hibpResult.count,
        },
        select: {
          id: true,
        },
      });

      // 비차단 브릿지 호출: 로그인 도메인 → UserAppAccess 연결
      bridgeLoginToAppAccess({
        domain,
        deviceId: device_id,
        organizationId: auth.organizationId,
        capturedAt: new Date(captured_at),
      }).catch((err) => logger.error({ err, domain }, "Login bridge failed"));

      return NextResponse.json({
        success: true,
        data: {
          id: loginEvent.id,
          hibp: {
            checked: hibpResult.checked,
            breached: hibpResult.breached,
            breach_count: hibpResult.count,
          },
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Login capture error");
      return NextResponse.json(
        { success: false, error: "Failed to capture login" },
        { status: 500 }
      );
    }
  })
);
