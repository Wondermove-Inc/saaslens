// src/app/api/cron/sync-sso/route.ts
/**
 * SSO 동기화 Cron Job
 * Vercel Cron: 매일 자정(UTC) 실행
 *
 * 환경변수:
 * - CRON_SECRET: Vercel Cron 인증 토큰
 */

import { prisma } from "@/lib/db";
import { discoverAppsFromGoogle } from "@/lib/services/discovery";
import {
  GoogleWorkspaceService,
  syncUsersFromGoogle,
} from "@/lib/services/sso";
import type { ServiceAccountCredentials, SyncResult } from "@/types/sso";
import type { Integration } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Integration 자격증명 파싱
function parseCredentials(
  integration: Integration
): ServiceAccountCredentials | null {
  try {
    const credentials = integration.credentials as {
      clientEmail?: string;
      privateKey?: string;
      subject?: string;
    };

    if (
      !credentials.clientEmail ||
      !credentials.privateKey ||
      !credentials.subject
    ) {
      return null;
    }

    return {
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
      subject: credentials.subject,
    };
  } catch {
    return null;
  }
}

interface SyncJobResult {
  integrationId: string;
  organizationId: string;
  type: string;
  userSync?: SyncResult;
  appDiscovery?: SyncResult;
  error?: string;
}

import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";

export const GET = withCronAuth(
  withLogging("cron:sync-sso", async (request: NextRequest) => {
    const startTime = Date.now();
    const results: SyncJobResult[] = [];

    try {
      // 활성화된 모든 Integration 조회
      const integrations = await prisma.integration.findMany({
        where: {
          status: "ACTIVE",
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(
        `[Cron] Starting SSO sync for ${integrations.length} integrations`
      );

      // 각 Integration 처리
      for (const integration of integrations) {
        const jobResult: SyncJobResult = {
          integrationId: integration.id,
          organizationId: integration.organizationId,
          type: integration.type,
        };

        try {
          // Google Workspace만 처리
          if (integration.type !== "GOOGLE_WORKSPACE") {
            logger.info(
              `[Cron] Skipping non-Google integration: ${integration.id}`
            );
            continue;
          }

          // 자격증명 파싱
          const credentials = parseCredentials(integration);
          if (!credentials) {
            jobResult.error = "Invalid credentials";
            results.push(jobResult);
            continue;
          }

          // Google Workspace 서비스 생성
          const googleService = new GoogleWorkspaceService(credentials);

          // 1. 사용자 동기화
          logger.info(
            `[Cron] Syncing users for integration: ${integration.id}`
          );
          const userSyncResult = await syncUsersFromGoogle(
            integration,
            googleService
          );
          jobResult.userSync = userSyncResult;

          // 2. 앱 발견
          logger.info(
            `[Cron] Discovering apps for integration: ${integration.id}`
          );
          const appDiscoveryResult = await discoverAppsFromGoogle(
            integration,
            googleService,
            {
              minUsers: 1,
              matchCatalog: true,
              updateExisting: true,
            }
          );
          jobResult.appDiscovery = appDiscoveryResult;

          // Integration 상태 업데이트
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              lastSyncAt: new Date(),
              lastError: null,
            },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          jobResult.error = errorMessage;

          // Integration 에러 상태 업데이트
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              lastError: errorMessage,
            },
          });

          logger.error(
            { integrationId: integration.id, err: errorMessage },
            "[Cron] Error syncing integration"
          );
        }

        results.push(jobResult);
      }

      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => !r.error).length;
      const errorCount = results.filter((r) => r.error).length;

      logger.info(
        `[Cron] SSO sync completed in ${duration}ms - Success: ${successCount}, Errors: ${errorCount}`
      );

      return NextResponse.json({
        success: true,
        summary: {
          totalIntegrations: integrations.length,
          processed: results.length,
          successful: successCount,
          errors: errorCount,
          duration,
        },
        results,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: errorMessage }, "[Cron] Fatal error in SSO sync");

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          duration: Date.now() - startTime,
        },
        { status: 500 }
      );
    }
  })
);
