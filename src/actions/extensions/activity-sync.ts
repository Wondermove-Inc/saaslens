// src/actions/extensions/activity-sync.ts
"use server";

/**
 * 소급 동기화: 기존 ExtensionLoginEvent → UserAppAccess 일괄 변환
 * ADMIN 권한 필요
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { matchDomainToApp } from "@/lib/services/discovery/domain-matcher";

const BATCH_SIZE = 100;

export interface SyncResult {
  totalEvents: number;
  matchedEvents: number;
  createdAccesses: number;
  unmatchedDomains: string[];
}

/**
 * 기존 ExtensionLoginEvent 레코드를 일괄 처리하여
 * UserAppAccess 레코드를 생성/갱신합니다.
 */
export const syncLoginEventsToAppAccess = withLogging(
  "ext:activity-sync",
  async (): Promise<SyncResult> => {
    const session = await auth();
    if (!session?.user?.organizationId) {
      throw new Error("인증이 필요합니다");
    }
    if (session.user.role !== "ADMIN") {
      throw new Error("관리자만 접근할 수 있습니다");
    }

    const organizationId = session.user.organizationId;

    // 디바이스 → 사용자 매핑 캐시
    const deviceUserCache = new Map<string, string | null>();

    // 도메인 → 매칭 결과 캐시
    const domainMatchCache = new Map<
      string,
      { appId: string; appName: string } | null
    >();

    const unmatchedDomains = new Set<string>();
    let totalEvents = 0;
    let matchedEvents = 0;
    let createdAccesses = 0;

    // 배치로 이벤트 처리
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const events = await prisma.extensionLoginEvent.findMany({
        where: { organizationId },
        select: {
          id: true,
          domain: true,
          deviceId: true,
          userId: true,
          capturedAt: true,
        },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      });

      if (events.length === 0) {
        hasMore = false;
        break;
      }

      cursor = events[events.length - 1].id;
      if (events.length < BATCH_SIZE) hasMore = false;

      totalEvents += events.length;

      for (const event of events) {
        // userId 해결
        let userId = event.userId;

        if (!userId) {
          if (!deviceUserCache.has(event.deviceId)) {
            const device = await prisma.extensionDevice.findUnique({
              where: { deviceKey: event.deviceId },
              select: { userId: true },
            });
            deviceUserCache.set(event.deviceId, device?.userId ?? null);
          }
          userId = deviceUserCache.get(event.deviceId) ?? null;
        }

        if (!userId) continue;

        // 도메인 매칭
        if (!domainMatchCache.has(event.domain)) {
          const match = await matchDomainToApp(event.domain, organizationId);
          domainMatchCache.set(
            event.domain,
            match ? { appId: match.appId, appName: match.appName } : null
          );
        }

        const matchResult = domainMatchCache.get(event.domain);
        if (!matchResult) {
          unmatchedDomains.add(event.domain);
          continue;
        }

        matchedEvents++;

        // UserAppAccess upsert
        const existing = await prisma.userAppAccess.findUnique({
          where: {
            userId_appId: {
              userId,
              appId: matchResult.appId,
            },
          },
          select: { source: true, lastUsedAt: true },
        });

        if (existing) {
          // 기존 레코드: lastUsedAt이 더 최신이면 갱신
          if (!existing.lastUsedAt || event.capturedAt > existing.lastUsedAt) {
            await prisma.userAppAccess.update({
              where: {
                userId_appId: {
                  userId,
                  appId: matchResult.appId,
                },
              },
              data: { lastUsedAt: event.capturedAt },
            });
          }
        } else {
          await prisma.userAppAccess.create({
            data: {
              userId,
              appId: matchResult.appId,
              source: "EXTENSION_LOGIN",
              lastUsedAt: event.capturedAt,
            },
          });
          createdAccesses++;
        }
      }
    }

    logger.info(
      {
        organizationId,
        totalEvents,
        matchedEvents,
        createdAccesses,
        unmatchedCount: unmatchedDomains.size,
      },
      "Activity sync completed"
    );

    return {
      totalEvents,
      matchedEvents,
      createdAccesses,
      unmatchedDomains: Array.from(unmatchedDomains),
    };
  }
);
