// src/app/api/v1/extensions/heartbeat/route.ts
/**
 * Extension Heartbeat API
 * 디바이스 lastSeenAt 업데이트 및 메타데이터 갱신
 */

import { withExtensionAuth } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import { heartbeatSchema } from "@/types/extension-api";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/extensions/heartbeat
 * Heartbeat 수신 → lastSeenAt 업데이트
 */
export const POST = withExtensionAuth(
  async (request: NextRequest, { auth }) => {
    try {
      const body = await request.json();
      const parseResult = heartbeatSchema.safeParse(body);

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

      const { device_id, extension_version, browser_info, os_info } =
        parseResult.data;

      // ExtensionDevice 업데이트 (없으면 생성)
      await prisma.extensionDevice.upsert({
        where: { deviceKey: device_id },
        create: {
          deviceKey: device_id,
          organizationId: auth.organizationId,
          lastSeenAt: new Date(),
          extensionVersion: extension_version,
          browserInfo: browser_info,
          osInfo: os_info,
        },
        update: {
          lastSeenAt: new Date(),
          ...(extension_version && { extensionVersion: extension_version }),
          ...(browser_info && { browserInfo: browser_info }),
          ...(os_info && { osInfo: os_info }),
        },
      });

      return NextResponse.json({
        success: true,
        data: { timestamp: Date.now() },
      });
    } catch (error) {
      console.error("Heartbeat error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to process heartbeat" },
        { status: 500 }
      );
    }
  }
);
