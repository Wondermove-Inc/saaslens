// src/actions/super-admin/extension-builds.ts
"use server";

import { requireSuperAdmin } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export interface ExtensionBuildSummary {
  id: string;
  version: string;
  platform: string;
  status: string;
  downloadUrl: string | null;
  fileSize: number | null;
  createdAt: Date;
  completedAt: Date | null;
  isLatest: boolean;
}

/**
 * 현재 테넌트의 Extension 빌드 목록 조회
 * @param input.organizationId - 조회할 테넌트 ID (없으면 첫 번째 org, Phase 2 확장성)
 */
async function _listExtensionBuilds(input?: {
  organizationId?: string;
}): Promise<ActionState<ExtensionBuildSummary[]>> {
  await requireSuperAdmin();

  const targetOrgId = input?.organizationId;
  const org = targetOrgId
    ? await prisma.organization.findUnique({
        where: { id: targetOrgId },
        select: { id: true },
      })
    : await prisma.organization.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

  if (!org) {
    return { success: false, message: "테넌트 정보를 찾을 수 없습니다." };
  }

  const builds = await prisma.extensionBuild.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // 가장 최신 COMPLETED 빌드 ID 찾기
  const latestCompleted = builds.find((b) => b.status === "COMPLETED");

  return {
    success: true,
    data: builds.map((build) => ({
      id: build.id,
      version: build.version,
      platform: build.platform,
      status: build.status,
      downloadUrl: build.downloadUrl,
      fileSize: build.fileSize,
      createdAt: build.createdAt,
      completedAt: build.completedAt,
      isLatest: build.id === latestCompleted?.id,
    })),
  };
}

export const listExtensionBuilds = withLogging(
  "listExtensionBuilds",
  _listExtensionBuilds
);

/**
 * Extension 빌드 트리거
 * @param input.organizationId - 빌드할 테넌트 ID (없으면 첫 번째 org, Phase 2 확장성)
 */
async function _triggerExtensionBuild(input?: {
  organizationId?: string;
}): Promise<ActionState<{ buildId: string; version: string }>> {
  await requireSuperAdmin();

  const targetOrgId = input?.organizationId;
  const org = targetOrgId
    ? await prisma.organization.findUnique({
        where: { id: targetOrgId },
        select: { id: true },
      })
    : await prisma.organization.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

  if (!org) {
    return { success: false, message: "테넌트 정보를 찾을 수 없습니다." };
  }

  // 현재 버전 계산 (최신 빌드 버전 + 1)
  const latestBuild = await prisma.extensionBuild.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    select: { version: true },
  });

  let nextVersion = "1.0.0";
  if (latestBuild?.version) {
    const parts = latestBuild.version.split(".").map(Number);
    parts[2] = (parts[2] ?? 0) + 1;
    nextVersion = parts.join(".");
  }

  // 1. PENDING 레코드 먼저 생성
  const build = await prisma.extensionBuild.create({
    data: {
      organizationId: org.id,
      version: nextVersion,
      platform: "CHROME",
      status: "PENDING",
    },
  });

  // 2. x-internal-secret 인증으로 올바른 endpoint 호출 (fire-and-forget)
  // 내부 호출은 localhost 사용 (Pod 내부에서 외부 URL 호출 시 DNS/TLS 이슈)
  const internalSecret = process.env.AUTH_SECRET || "dev-secret-123";
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

  fetch(`${baseUrl}/api/v1/extensions/builds/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify({
      buildId: build.id,
      version: nextVersion,
      organizationId: org.id,
    }),
  }).catch((err) => {
    logger.error({ err }, "[triggerExtensionBuild] Background build error");
    prisma.extensionBuild
      .update({
        where: { id: build.id },
        data: { status: "FAILED", errorMessage: "빌드 요청 실패" },
      })
      .catch(() => {});
  });

  // 3. 즉시 성공 반환 (fire-and-forget)
  revalidatePath("/super-admin/extension-builds");
  return {
    success: true,
    message: `빌드가 시작되었습니다. (v${nextVersion})`,
    data: { buildId: build.id, version: nextVersion },
  };
}

export const triggerExtensionBuild = withLogging(
  "triggerExtensionBuild",
  _triggerExtensionBuild
);
