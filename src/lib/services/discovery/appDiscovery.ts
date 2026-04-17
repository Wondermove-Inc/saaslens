// src/lib/services/discovery/appDiscovery.ts
/**
 * Google Workspace OAuth 토큰 기반 앱 발견 서비스
 * 사용자들이 승인한 OAuth 앱을 수집하여 SaaS 앱으로 등록
 */

import { prisma } from "@/lib/db";
import type {
  AppDiscoveryOptions,
  DiscoveredApp,
  GoogleOAuthToken,
  GoogleWorkspaceUser,
  SyncError,
  SyncResult,
} from "@/types/sso";
import type { Integration } from "@prisma/client";
import { GoogleWorkspaceService } from "../sso/googleWorkspace";

// 필터링할 Google 시스템 앱 clientId 패턴
const GOOGLE_SYSTEM_APPS = [
  "google.com",
  "googleapis.com",
  "accounts.google.com",
];

/**
 * 사용자별 OAuth 토큰을 앱 단위로 집계
 */
export function processDiscoveredApps(
  usersWithTokens: { user: GoogleWorkspaceUser; tokens: GoogleOAuthToken[] }[]
): DiscoveredApp[] {
  const appMap = new Map<string, DiscoveredApp>();

  for (const { user, tokens } of usersWithTokens) {
    for (const token of tokens) {
      // Google 시스템 앱 필터링
      if (
        GOOGLE_SYSTEM_APPS.some((pattern) => token.clientId.includes(pattern))
      ) {
        continue;
      }

      const existing = appMap.get(token.clientId);

      if (existing) {
        existing.users.push({
          email: user.primaryEmail,
        });
        existing.userCount = existing.users.length;
      } else {
        appMap.set(token.clientId, {
          clientId: token.clientId,
          name: token.displayText,
          scopes: token.scopes,
          users: [{ email: user.primaryEmail }],
          userCount: 1,
        });
      }
    }
  }

  return Array.from(appMap.values());
}

/**
 * Google Workspace에서 앱 발견 실행
 */
export async function discoverAppsFromGoogle(
  integration: Integration,
  googleService: GoogleWorkspaceService,
  options: AppDiscoveryOptions = {}
): Promise<SyncResult> {
  const { minUsers = 1, matchCatalog = true, updateExisting = true } = options;

  const startTime = Date.now();
  const errors: SyncError[] = [];
  let itemsFound = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let syncLogId: string | undefined;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 동기화 로그 생성
      const syncLog = await tx.syncLog.create({
        data: {
          integrationId: integration.id,
          status: "RUNNING",
          startedAt: new Date(),
          itemsFound: 0,
          itemsCreated: 0,
          itemsUpdated: 0,
        },
      });
      syncLogId = syncLog.id;

      // 사용자 목록 조회
      const users = await googleService.listUsers();

      // 각 사용자의 OAuth 토큰 수집
      const usersWithTokens: {
        user: GoogleWorkspaceUser;
        tokens: GoogleOAuthToken[];
      }[] = [];

      for (const user of users) {
        try {
          const tokens = await googleService.listTokens(user.primaryEmail);
          if (tokens.length > 0) {
            usersWithTokens.push({ user, tokens });
          }
        } catch (tokenError) {
          // 개별 사용자 토큰 조회 실패는 무시하고 계속 진행
          errors.push({
            code: "TOKEN_FETCH_ERROR",
            message:
              tokenError instanceof Error
                ? tokenError.message
                : "Unknown error",
            entity: "User",
            entityId: user.primaryEmail,
          });
        }
      }

      // 앱 집계
      const discoveredApps = processDiscoveredApps(usersWithTokens);

      // 최소 사용자 수 필터링
      const filteredApps = discoveredApps.filter(
        (app) => app.userCount >= minUsers
      );
      itemsFound = filteredApps.length;

      // 각 앱 처리
      for (const discoveredApp of filteredApps) {
        try {
          // SaaS 카탈로그 매칭 (옵션)
          let catalogId: string | null = null;
          if (matchCatalog) {
            const catalog = await tx.saaSCatalog.findFirst({
              where: {
                OR: [
                  { name: { equals: discoveredApp.name, mode: "insensitive" } },
                  { patterns: { some: { pattern: discoveredApp.clientId } } },
                ],
              },
            });
            catalogId = catalog?.id || null;
          }

          // 기존 앱 확인
          const existingApp = await tx.app.findFirst({
            where: {
              organizationId: integration.organizationId,
              OR: [
                { name: discoveredApp.name },
                { notes: { contains: discoveredApp.clientId } },
              ],
            },
          });

          let appId: string;

          if (!existingApp) {
            // 새 앱 생성
            const newApp = await tx.app.create({
              data: {
                name: discoveredApp.name,
                organization: {
                  connect: { id: integration.organizationId },
                },
                source: "SSO_DISCOVERY",
                status: "ACTIVE",
                catalog: catalogId ? { connect: { id: catalogId } } : undefined,
                discoveredAt: new Date(),
                notes: `OAuth Client ID: ${discoveredApp.clientId}`,
              },
            });
            appId = newApp.id;
            itemsCreated++;
          } else if (updateExisting) {
            // 기존 앱 업데이트
            appId = existingApp.id;
            itemsUpdated++;
          } else {
            appId = existingApp.id;
          }

          // 사용자-앱 접근 기록 생성
          for (const appUser of discoveredApp.users) {
            const dbUser = await tx.user.findUnique({
              where: { email: appUser.email },
            });

            if (
              dbUser &&
              dbUser.organizationId === integration.organizationId
            ) {
              await tx.userAppAccess.upsert({
                where: {
                  userId_appId: {
                    userId: dbUser.id,
                    appId,
                  },
                },
                create: {
                  userId: dbUser.id,
                  appId,
                  source: "SSO_LOG",
                  lastUsedAt: new Date(),
                },
                update: {
                  lastUsedAt: new Date(),
                },
              });
            }
          }
        } catch (appError) {
          errors.push({
            code: "APP_PROCESS_ERROR",
            message:
              appError instanceof Error ? appError.message : "Unknown error",
            entity: "App",
            entityId: discoveredApp.clientId,
          });
        }
      }

      // 동기화 완료 로그 업데이트
      await tx.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: errors.length > 0 ? "PARTIAL" : "SUCCESS",
          itemsFound,
          itemsCreated,
          itemsUpdated,
          errors:
            errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
          completedAt: new Date(),
        },
      });

      // Integration 마지막 동기화 시간 업데이트
      await tx.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastError: errors.length > 0 ? errors[0].message : null,
        },
      });

      const finalStatus = errors.length > 0 ? "PARTIAL" : "SUCCESS";
      return {
        status: finalStatus as "PARTIAL" | "SUCCESS",
        itemsFound,
        itemsCreated,
        itemsUpdated,
        errors,
        duration: Date.now() - startTime,
      };
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // 실패 로그 업데이트
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: "FAILED",
          errors: [{ code: "DISCOVERY_FAILED", message: errorMessage }],
          completedAt: new Date(),
        },
      });
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastError: errorMessage,
      },
    });

    return {
      status: "FAILED",
      itemsFound: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: [
        {
          code: "DISCOVERY_FAILED",
          message: errorMessage,
        },
      ],
      duration: Date.now() - startTime,
    };
  }
}
