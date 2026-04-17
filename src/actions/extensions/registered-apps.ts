// src/actions/extensions/registered-apps.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractWildcardPattern } from "@/lib/utils/domain-extractor";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * 등록 앱 리스트 아이템 타입
 */
export type RegisteredAppItem = {
  id: string;
  appId: string;
  appName: string;
  logoUrl: string | null;
  category: string | null;
  website: string | null;
  pattern: string;
  isEnabled: boolean;
  source: "AUTO" | "MANUAL";
  registeredAt: Date;
};

/**
 * 등록 앱 리스트 응답 타입
 */
export type RegisteredAppsResponse = {
  items: RegisteredAppItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * 등록 앱 리스트 조회
 * - 구독 관리 앱에서 URL 정보를 가져와 화이트리스트 패턴으로 표시
 */
export async function getRegisteredApps(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ActionState<RegisteredAppsResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;

    // 앱 목록 조회 (URL이 있는 앱만)
    const whereClause = {
      organizationId: session.user.organizationId,
      status: "ACTIVE" as const,
      OR: [
        { customWebsite: { not: null } },
        { catalog: { website: { not: null } } },
      ],
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { customWebsite: { contains: search, mode: "insensitive" as const } },
          {
            catalog: {
              website: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }),
    };

    const [apps, total] = await Promise.all([
      prisma.app.findMany({
        where: whereClause,
        include: {
          catalog: {
            select: {
              website: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.app.count({ where: whereClause }),
    ]);

    // 기존 화이트리스트 조회 (앱 URL과 매칭 확인용)
    const whitelists = await prisma.extensionWhitelist.findMany({
      where: { organizationId: session.user.organizationId },
      select: { pattern: true, enabled: true, source: true },
    });

    const whitelistMap = new Map(
      whitelists.map((w) => [
        w.pattern,
        { enabled: w.enabled, source: w.source },
      ])
    );

    // 앱을 등록 앱 아이템으로 변환
    const items: RegisteredAppItem[] = apps
      .map((app) => {
        const website = app.customWebsite || app.catalog?.website;
        if (!website) return null;

        const pattern = extractWildcardPattern(website);
        if (!pattern) return null;

        const whitelistInfo = whitelistMap.get(pattern);

        return {
          id: app.id,
          appId: app.id,
          appName: app.name,
          logoUrl: app.customLogoUrl || app.catalog?.logoUrl || null,
          category: app.category,
          website,
          pattern,
          isEnabled: whitelistInfo?.enabled ?? true,
          source: whitelistInfo?.source === "MANUAL" ? "MANUAL" : "AUTO",
          registeredAt: app.createdAt,
        } as RegisteredAppItem;
      })
      .filter((item): item is RegisteredAppItem => item !== null);

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
    console.error("[getRegisteredApps] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "등록 앱 리스트 조회 실패",
    };
  }
}

/**
 * 등록 앱 화이트리스트 동기화
 * - 구독 앱 URL을 화이트리스트에 자동 추가
 */
export async function syncRegisteredAppsToWhitelist(): Promise<
  ActionState<{ synced: number }>
> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 활성 앱에서 URL 조회
    const apps = await prisma.app.findMany({
      where: {
        organizationId: session.user.organizationId,
        status: "ACTIVE",
        OR: [
          { customWebsite: { not: null } },
          { catalog: { website: { not: null } } },
        ],
      },
      include: {
        catalog: {
          select: { website: true },
        },
      },
    });

    let syncedCount = 0;

    for (const app of apps) {
      const website = app.customWebsite || app.catalog?.website;
      if (!website) continue;

      const pattern = extractWildcardPattern(website);
      if (!pattern) continue;

      // 기존 화이트리스트 확인
      const existing = await prisma.extensionWhitelist.findUnique({
        where: {
          organizationId_pattern: {
            organizationId: session.user.organizationId,
            pattern,
          },
        },
      });

      if (!existing) {
        // 새로 추가
        await prisma.extensionWhitelist.create({
          data: {
            organizationId: session.user.organizationId,
            pattern,
            name: app.name,
            source: "ADMIN_IMPORT",
            enabled: true,
          },
        });
        syncedCount++;
      }
    }

    revalidatePath("/extensions/registered-apps");
    revalidatePath("/extensions/whitelist");

    return {
      success: true,
      data: { synced: syncedCount },
      message: `${syncedCount}개의 앱이 화이트리스트에 동기화되었습니다.`,
    };
  } catch (error) {
    console.error("[syncRegisteredAppsToWhitelist] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "동기화 실패",
    };
  }
}

/**
 * 등록 앱 활성화/비활성화 토글
 */
export async function toggleRegisteredAppStatus(
  appId: string,
  enabled: boolean
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 앱 조회
    const app = await prisma.app.findUnique({
      where: { id: appId },
      include: {
        catalog: { select: { website: true } },
      },
    });

    if (!app || app.organizationId !== session.user.organizationId) {
      return { success: false, error: "앱을 찾을 수 없습니다" };
    }

    const website = app.customWebsite || app.catalog?.website;
    if (!website) {
      return { success: false, error: "앱에 URL이 없습니다" };
    }

    const pattern = extractWildcardPattern(website);
    if (!pattern) {
      return { success: false, error: "유효하지 않은 URL입니다" };
    }

    // 화이트리스트 업데이트 또는 생성
    await prisma.extensionWhitelist.upsert({
      where: {
        organizationId_pattern: {
          organizationId: session.user.organizationId,
          pattern,
        },
      },
      update: { enabled },
      create: {
        organizationId: session.user.organizationId,
        pattern,
        name: app.name,
        source: "ADMIN_IMPORT",
        enabled,
      },
    });

    revalidatePath("/extensions/registered-apps");
    revalidatePath("/extensions/whitelist");

    return {
      success: true,
      message: enabled ? "활성화되었습니다" : "비활성화되었습니다",
    };
  } catch (error) {
    console.error("[toggleRegisteredAppStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "상태 변경 실패",
    };
  }
}

/**
 * 수동 등록 앱 추가 스키마 (use server 파일에서는 async 함수만 export 가능하므로 내부 사용만)
 */
const addManualRegisteredAppSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요").max(100),
  pattern: z.string().min(1, "도메인 패턴을 입력하세요").max(255),
});

/**
 * 수동 등록 앱 추가
 */
export async function addManualRegisteredApp(input: {
  name: string;
  pattern: string;
}): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const validation = addManualRegisteredAppSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error:
          validation.error.errors[0]?.message || "입력값이 올바르지 않습니다",
      };
    }

    // 화이트리스트에 추가
    await prisma.extensionWhitelist.create({
      data: {
        organizationId: session.user.organizationId,
        pattern: input.pattern,
        name: input.name,
        source: "MANUAL",
        enabled: true,
      },
    });

    revalidatePath("/extensions/registered-apps");
    revalidatePath("/extensions/whitelist");

    return { success: true, message: "추가되었습니다" };
  } catch (error) {
    console.error("[addManualRegisteredApp] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "추가 실패",
    };
  }
}

/**
 * 등록 앱 삭제 (화이트리스트에서 제거)
 */
export async function removeRegisteredApp(
  pattern: string
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    await prisma.extensionWhitelist.delete({
      where: {
        organizationId_pattern: {
          organizationId: session.user.organizationId,
          pattern,
        },
      },
    });

    revalidatePath("/extensions/registered-apps");
    revalidatePath("/extensions/whitelist");

    return { success: true, message: "삭제되었습니다" };
  } catch (error) {
    console.error("[removeRegisteredApp] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "삭제 실패",
    };
  }
}
