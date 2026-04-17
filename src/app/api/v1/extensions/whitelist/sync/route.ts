// src/app/api/v1/extensions/whitelist/sync/route.ts
/**
 * Extension Whitelist Sync API
 * GET: 조직의 화이트리스트 도메인 조회
 * POST: 사용자 추가 도메인 동기화
 */

import { withExtensionAuth } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { whitelistSyncPostSchema } from "@/types/extension-api";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/extensions/whitelist/sync
 * 활성화된 화이트리스트 도메인 반환
 */
export const GET = withLogging(
  "ext:whitelist-sync",
  withExtensionAuth(async (_request, { auth }) => {
    const whitelistItems = await prisma.extensionWhitelist.findMany({
      where: {
        organizationId: auth.organizationId,
        enabled: true,
      },
      select: {
        pattern: true,
        name: true,
        enabled: true,
      },
      orderBy: { addedAt: "asc" },
    });

    return NextResponse.json({
      whitelist: whitelistItems,
    });
  })
);

/**
 * POST /api/v1/extensions/whitelist/sync
 * 사용자가 Extension에서 추가한 도메인 동기화
 * source: USER_EXTENSION으로 저장 (현재 스키마에서는 MANUAL로 대체)
 */
export const POST = withLogging(
  "ext:whitelist-sync-post",
  withExtensionAuth(async (request: NextRequest, { auth }) => {
    try {
      const body = await request.json();
      const parseResult = whitelistSyncPostSchema.safeParse(body);

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

      const { whitelist } = parseResult.data;

      // 사용자 추가 도메인만 처리 (source가 'user'인 것)
      const userDomains = whitelist.filter((d) => d.source === "user");
      let syncedCount = 0;

      for (const domain of userDomains) {
        await prisma.extensionWhitelist.upsert({
          where: {
            organizationId_pattern: {
              organizationId: auth.organizationId,
              pattern: domain.pattern,
            },
          },
          create: {
            organizationId: auth.organizationId,
            pattern: domain.pattern,
            name: domain.name,
            enabled: domain.enabled,
            source: "MANUAL", // 스키마에서 USER_EXTENSION 미지원으로 MANUAL 사용
          },
          update: {
            name: domain.name,
            enabled: domain.enabled,
          },
        });
        syncedCount++;
      }

      return NextResponse.json({
        success: true,
        data: {
          syncedCount,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Whitelist sync error");
      return NextResponse.json(
        { success: false, error: "Failed to sync whitelist" },
        { status: 500 }
      );
    }
  })
);
