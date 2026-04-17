// src/actions/integrations-read.ts
"use server";

/**
 * Integration 조회 관련 Server Actions
 */

import { getCachedSession } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type { IntegrationMetadata, IntegrationWithStats } from "@/types/sso";
import type { Integration } from "@prisma/client";
import { redirect } from "next/navigation";

import type { GetIntegrationsParams, SyncLogEntry } from "./integrations.types";

/**
 * Integration 목록 조회
 * 페이지에서 직접 호출되므로 인증 실패 시 redirect 사용
 */
export async function getIntegrations(
  params: GetIntegrationsParams = {}
): Promise<{
  items: Integration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const session = await getCachedSession();
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  const {
    filter = {},
    sort = { sortBy: "createdAt", sortOrder: "desc" },
    page = 1,
    limit = 20,
  } = params;
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.user.organizationId,
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.type ? { type: filter.type as Integration["type"] } : {}),
    ...(filter.search
      ? { metadata: { path: ["domain"], string_contains: filter.search } }
      : {}),
  };

  const orderBy = sort.sortBy
    ? { [sort.sortBy]: sort.sortOrder || "desc" }
    : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.integration.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.integration.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 단일 Integration 조회 (통계 포함)
 * - 인증/권한 실패 시 ActionState로 응답
 */
export async function getIntegration(
  integrationId: string
): Promise<ActionState<{ integration: IntegrationWithStats }>> {
  const session = await getCachedSession();
  if (!session?.user?.organizationId) {
    return { success: false, message: "인증이 필요합니다" };
  }

  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) {
    return { success: false, message: "연동을 찾을 수 없습니다" };
  }

  if (integration.organizationId !== session.user.organizationId) {
    return { success: false, message: "접근 권한이 없습니다" };
  }

  // 동기화 통계 조회
  const [syncCount, lastSync] = await Promise.all([
    prisma.syncLog.count({
      where: { integrationId },
    }),
    prisma.syncLog.findFirst({
      where: { integrationId },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return {
    success: true,
    data: {
      integration: {
        ...integration,
        metadata: integration.metadata as IntegrationMetadata,
        syncCount,
        lastSyncResult: lastSync
          ? {
              status: lastSync.status,
              itemsFound: lastSync.itemsFound,
              itemsCreated: lastSync.itemsCreated,
              itemsUpdated: lastSync.itemsUpdated,
              errors:
                (lastSync.errors as { code: string; message: string }[]) || [],
            }
          : undefined,
      },
    },
  };
}

/**
 * 동기화 로그 조회
 */
export async function getSyncLogs(
  integrationId: string,
  limit: number = 10
): Promise<ActionState<{ logs: SyncLogEntry[] }>> {
  const session = await getCachedSession();
  if (!session?.user?.organizationId) {
    return { success: false, message: "인증이 필요합니다" };
  }

  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) {
    return { success: false, message: "연동을 찾을 수 없습니다" };
  }

  if (integration.organizationId !== session.user.organizationId) {
    return { success: false, message: "접근 권한이 없습니다" };
  }

  const logs = await prisma.syncLog.findMany({
    where: { integrationId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  // Date를 ISO 문자열로 직렬화
  return {
    success: true,
    data: {
      logs: logs.map((log) => ({
        id: log.id,
        status: log.status as SyncLogEntry["status"],
        itemsFound: log.itemsFound,
        itemsCreated: log.itemsCreated,
        itemsUpdated: log.itemsUpdated,
        errors: log.errors as SyncLogEntry["errors"],
        startedAt: log.startedAt.toISOString(),
        completedAt: log.completedAt?.toISOString() ?? null,
      })),
    },
  };
}
