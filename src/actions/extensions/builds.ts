// src/actions/extensions/builds.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type {
  ExtensionBuildItem,
  PaginatedResponse,
  PaginationParams,
  TriggerBuildInput,
} from "@/types/extension";
import { triggerBuildSchema } from "@/types/extension";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * 빌드 프로세스 실행 (API Route 호출)
 * child_process는 Server Action에서 번들링 문제가 있어 API Route로 분리
 */
async function executeBuildProcess(
  buildId: string,
  version: string
): Promise<void> {
  try {
    // 쿠키 가져오기 (인증 정보 전달용)
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    // 내부 self-call은 localhost 사용 (CloudFront/WAF 우회)
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const response = await fetch(
      `${baseUrl}/api/v1/extensions/builds/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify({ buildId, version }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error({ err: error }, "[executeBuildProcess] API Error");
    }
  } catch (error) {
    logger.error({ err: error }, "[executeBuildProcess] Error");
    await prisma.extensionBuild.update({
      where: { id: buildId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "빌드 실행 실패",
      },
    });
  }
}

/**
 * Build 목록 조회
 */
export async function getBuilds(
  params: PaginationParams & { status?: string; platform?: string } = {}
): Promise<ActionState<PaginatedResponse<ExtensionBuildItem>>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { page = 1, limit = 20, status, platform } = params;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: session.user.organizationId,
      ...(status && {
        status: status as "PENDING" | "BUILDING" | "COMPLETED" | "FAILED",
      }),
      ...(platform && {
        platform: platform as
          | "CHROME"
          | "WINDOWS_EXE"
          | "WINDOWS_MSI"
          | "MAC_PKG"
          | "MAC_DMG",
      }),
    };

    const [items, total] = await Promise.all([
      prisma.extensionBuild.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.extensionBuild.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error({ err: error }, "[getBuilds] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "빌드 목록 조회 실패",
    };
  }
}

/**
 * Build 상세 조회
 */
export async function getBuild(
  id: string
): Promise<ActionState<ExtensionBuildItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const build = await prisma.extensionBuild.findUnique({
      where: { id },
    });

    if (!build || build.organizationId !== session.user.organizationId) {
      return { success: false, error: "빌드를 찾을 수 없습니다" };
    }

    return { success: true, data: build };
  } catch (error) {
    logger.error({ err: error }, "[getBuild] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "빌드 조회 실패",
    };
  }
}

/**
 * 새 Build 트리거
 */
async function _triggerBuild(
  input: TriggerBuildInput & { version?: string }
): Promise<ActionState<ExtensionBuildItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 입력 검증
    const validation = triggerBuildSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error:
          validation.error.errors[0]?.message || "입력값이 올바르지 않습니다",
      };
    }

    // 현재는 CHROME 플랫폼만 지원
    if (input.platform !== "CHROME") {
      return {
        success: false,
        error: "현재 Chrome Extension 빌드만 지원됩니다",
      };
    }

    // 최신 빌드 버전 조회
    const latestBuild = await prisma.extensionBuild.findFirst({
      where: {
        organizationId: session.user.organizationId,
        platform: input.platform,
      },
      orderBy: { createdAt: "desc" },
    });

    // 버전 자동 증가 (없으면 1.0.0)
    let version = input.version;
    if (!version) {
      if (latestBuild?.version) {
        const parts = latestBuild.version.split(".");
        const patch = parseInt(parts[2] || "0", 10) + 1;
        version = `${parts[0]}.${parts[1]}.${patch}`;
      } else {
        version = "1.0.0";
      }
    }

    const build = await prisma.extensionBuild.create({
      data: {
        organizationId: session.user.organizationId,
        version,
        platform: input.platform,
        status: "PENDING",
      },
    });

    // 백그라운드에서 빌드 실행 (fire-and-forget)
    executeBuildProcess(build.id, version).catch((err) => {
      logger.error({ err }, "[triggerBuild] Background build error");
    });

    revalidatePath("/extensions/builds");
    return { success: true, data: build };
  } catch (error) {
    logger.error({ err: error }, "[triggerBuild] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "빌드 트리거 실패",
    };
  }
}
export const triggerBuild = withLogging("triggerBuild", _triggerBuild);

/**
 * Build 삭제
 */
async function _deleteBuild(id: string): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 기존 항목 확인
    const existing = await prisma.extensionBuild.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return { success: false, error: "빌드를 찾을 수 없습니다" };
    }

    // 진행 중인 빌드는 삭제 불가
    if (existing.status === "BUILDING") {
      return { success: false, error: "진행 중인 빌드는 삭제할 수 없습니다" };
    }

    await prisma.extensionBuild.delete({
      where: { id },
    });

    revalidatePath("/extensions/builds");
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "[deleteBuild] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "빌드 삭제 실패",
    };
  }
}
export const deleteBuild = withLogging("deleteBuild", _deleteBuild);

/**
 * 실패한 Build 재시도
 */
async function _retryBuild(
  id: string
): Promise<ActionState<ExtensionBuildItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 기존 항목 확인
    const existing = await prisma.extensionBuild.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return { success: false, error: "빌드를 찾을 수 없습니다" };
    }

    // 실패한 빌드만 재시도 가능
    if (existing.status !== "FAILED") {
      return { success: false, error: "실패한 빌드만 재시도할 수 있습니다" };
    }

    const updated = await prisma.extensionBuild.update({
      where: { id },
      data: {
        status: "PENDING",
        errorMessage: null,
        buildLog: null,
      },
    });

    // 백그라운드에서 빌드 실행 (fire-and-forget)
    executeBuildProcess(updated.id, existing.version).catch((err) => {
      logger.error({ err }, "[retryBuild] Background build error");
    });

    revalidatePath("/extensions/builds");
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error }, "[retryBuild] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "빌드 재시도 실패",
    };
  }
}
export const retryBuild = withLogging("retryBuild", _retryBuild);

/**
 * Extension 배포 설정 타입
 */
export type ExtensionDeployMethod = "auto" | "webstore" | "manual";

export interface ExtensionDeploySettings {
  extensionDeployMethod: ExtensionDeployMethod;
  extensionWebstoreUrl: string;
}

/**
 * Extension 배포 설정 조회
 */
export async function getExtensionDeploySettings(): Promise<
  ActionState<ExtensionDeploySettings>
> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown> | null) ?? {};

    return {
      success: true,
      data: {
        extensionDeployMethod:
          (settings.extensionDeployMethod as ExtensionDeployMethod) || "manual",
        extensionWebstoreUrl: (settings.extensionWebstoreUrl as string) || "",
      },
    };
  } catch (error) {
    logger.error({ err: error }, "[getExtensionDeploySettings] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "배포 설정 조회 실패",
    };
  }
}

/**
 * Extension 배포 설정 업데이트
 */
async function _updateExtensionDeploySettings(input: {
  extensionDeployMethod: ExtensionDeployMethod;
  extensionWebstoreUrl?: string;
}): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 관리자 권한 확인
    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        error: "관리자만 배포 설정을 변경할 수 있습니다",
      };
    }

    // 유효성 검사
    const validMethods: ExtensionDeployMethod[] = [
      "auto",
      "webstore",
      "manual",
    ];
    if (!validMethods.includes(input.extensionDeployMethod)) {
      return { success: false, error: "올바르지 않은 배포 방식입니다" };
    }

    if (
      input.extensionDeployMethod === "webstore" &&
      !input.extensionWebstoreUrl?.trim()
    ) {
      return {
        success: false,
        error: "웹스토어 URL을 입력해주세요",
      };
    }

    // 현재 settings 조회 후 merge
    const current = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { settings: true },
    });
    const currentSettings =
      (current?.settings as Record<string, unknown> | null) ?? {};

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        settings: {
          ...currentSettings,
          extensionDeployMethod: input.extensionDeployMethod,
          extensionWebstoreUrl:
            input.extensionDeployMethod === "webstore"
              ? input.extensionWebstoreUrl?.trim() || ""
              : currentSettings.extensionWebstoreUrl || "",
        },
      },
    });

    revalidatePath("/extensions/builds");
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "[updateExtensionDeploySettings] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "배포 설정 업데이트 실패",
    };
  }
}
export const updateExtensionDeploySettings = withLogging(
  "updateExtensionDeploySettings",
  _updateExtensionDeploySettings
);

/**
 * 초기 빌드 자동 생성 (로그인 시 빌드가 없는 경우)
 * JWT 콜백에서 호출 가능 - cookies() 사용 없이 prisma 직접 사용
 */
export async function triggerInitialBuild(
  organizationId: string
): Promise<void> {
  try {
    const build = await prisma.extensionBuild.create({
      data: {
        organizationId,
        version: "1.0.0",
        platform: "CHROME",
        status: "PENDING",
      },
    });

    // 내부 self-call은 localhost 사용 (CloudFront/WAF 우회)
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const internalSecret = process.env.AUTH_SECRET || "dev-secret-123";

    fetch(`${baseUrl}/api/v1/extensions/builds/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        buildId: build.id,
        version: "1.0.0",
        organizationId,
      }),
    }).catch((err) => {
      logger.error({ err }, "[triggerInitialBuild] Background build error");
    });
  } catch (error) {
    logger.error({ err: error }, "[triggerInitialBuild] Error");
  }
}

/**
 * 최신 완료된 빌드 조회 (수동 배포 시 다운로드용)
 */
export async function getLatestBuild(): Promise<
  ActionState<ExtensionBuildItem | null>
> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const build = await prisma.extensionBuild.findFirst({
      where: {
        organizationId: session.user.organizationId,
        status: "COMPLETED",
        platform: "CHROME",
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: build || null };
  } catch (error) {
    logger.error({ err: error }, "[getLatestBuild] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "최신 빌드 조회 실패",
    };
  }
}
