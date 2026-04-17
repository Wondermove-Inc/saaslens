// src/actions/os-default-apps.ts
"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type {
  CreateOsDefaultAppInput,
  OsDefaultAppRecord,
} from "@/types/dashboard2";
import type { DevicePlatform, OsDefaultApp } from "@prisma/client";

/**
 * 활성화된 OS 기본 앱 목록 조회 (플랫폼별)
 */
export async function getOsDefaultApps(
  platform?: DevicePlatform
): Promise<OsDefaultAppRecord[]> {
  const apps = await prisma.osDefaultApp.findMany({
    where: {
      isActive: true,
      ...(platform && { platform }),
    },
    orderBy: { name: "asc" },
  });

  return apps.map((app) => ({
    id: app.id,
    name: app.name,
    bundleId: app.bundleId,
    namePattern: app.namePattern,
    platform: app.platform as OsDefaultAppRecord["platform"],
    category: app.category,
    description: app.description,
    isActive: app.isActive,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  }));
}

/**
 * DeviceApp이 OS 기본 앱인지 판별
 *
 * 판별 우선순위:
 * 1. bundleId 매칭 (가장 정확)
 * 2. namePattern 정규식 매칭
 * 3. name 완전 일치 (대소문자 무시)
 */
export function isOsDefaultApp(
  deviceApp: { name: string; bundleIdentifier?: string | null },
  osDefaultApps: OsDefaultApp[],
  platform: DevicePlatform
): boolean {
  const platformApps = osDefaultApps.filter((app) => app.platform === platform);

  for (const defaultApp of platformApps) {
    // 1순위: bundleId 매칭 (가장 정확)
    if (
      defaultApp.bundleId &&
      deviceApp.bundleIdentifier &&
      deviceApp.bundleIdentifier.toLowerCase() ===
        defaultApp.bundleId.toLowerCase()
    ) {
      return true;
    }

    // 2순위: namePattern 정규식 매칭
    if (defaultApp.namePattern) {
      try {
        const regex = new RegExp(defaultApp.namePattern, "i");
        if (regex.test(deviceApp.name)) {
          return true;
        }
      } catch {
        // 잘못된 정규식 무시
      }
    }

    // 3순위: 이름 완전 일치 (대소문자 무시)
    if (deviceApp.name.toLowerCase() === defaultApp.name.toLowerCase()) {
      return true;
    }
  }

  return false;
}

/**
 * 여러 플랫폼 중 하나라도 OS 기본 앱이면 true 반환
 */
export function checkIsOsDefault(
  app: { name: string; bundleIdentifier?: string | null },
  osDefaultApps: OsDefaultApp[],
  platforms: DevicePlatform[]
): boolean {
  return platforms.some((platform) =>
    isOsDefaultApp(app, osDefaultApps, platform)
  );
}

/**
 * OsDefaultApp 생성 (Admin 전용)
 */
async function _createOsDefaultApp(
  data: CreateOsDefaultAppInput
): Promise<ActionState<OsDefaultAppRecord>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "인증이 필요합니다." };
  }

  if (session.user.role !== "ADMIN") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }

  try {
    const app = await prisma.osDefaultApp.create({
      data: {
        name: data.name,
        bundleId: data.bundleId,
        namePattern: data.namePattern,
        platform: data.platform,
        category: data.category,
        description: data.description,
      },
    });

    revalidatePath("/settings/os-default-apps");

    return {
      success: true,
      data: {
        id: app.id,
        name: app.name,
        bundleId: app.bundleId,
        namePattern: app.namePattern,
        platform: app.platform as OsDefaultAppRecord["platform"],
        category: app.category,
        description: app.description,
        isActive: app.isActive,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return { success: false, error: "이미 등록된 앱입니다." };
    }
    return { success: false, error: "OS 기본 앱 생성에 실패했습니다." };
  }
}
export const createOsDefaultApp = withLogging(
  "createOsDefaultApp",
  _createOsDefaultApp
);

/**
 * OsDefaultApp 수정 (Admin 전용)
 */
async function _updateOsDefaultApp(
  id: string,
  data: Partial<CreateOsDefaultAppInput> & { isActive?: boolean }
): Promise<ActionState<OsDefaultAppRecord>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "인증이 필요합니다." };
  }

  if (session.user.role !== "ADMIN") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }

  try {
    const app = await prisma.osDefaultApp.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.bundleId !== undefined && { bundleId: data.bundleId }),
        ...(data.namePattern !== undefined && {
          namePattern: data.namePattern,
        }),
        ...(data.platform && { platform: data.platform }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    revalidatePath("/settings/os-default-apps");

    return {
      success: true,
      data: {
        id: app.id,
        name: app.name,
        bundleId: app.bundleId,
        namePattern: app.namePattern,
        platform: app.platform as OsDefaultAppRecord["platform"],
        category: app.category,
        description: app.description,
        isActive: app.isActive,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return { success: false, error: "앱을 찾을 수 없습니다." };
    }
    return { success: false, error: "OS 기본 앱 수정에 실패했습니다." };
  }
}
export const updateOsDefaultApp = withLogging(
  "updateOsDefaultApp",
  _updateOsDefaultApp
);

/**
 * OsDefaultApp 삭제 (Admin 전용)
 */
async function _deleteOsDefaultApp(id: string): Promise<ActionState<void>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "인증이 필요합니다." };
  }

  if (session.user.role !== "ADMIN") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }

  try {
    await prisma.osDefaultApp.delete({
      where: { id },
    });

    revalidatePath("/settings/os-default-apps");

    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return { success: false, error: "앱을 찾을 수 없습니다." };
    }
    return { success: false, error: "OS 기본 앱 삭제에 실패했습니다." };
  }
}
export const deleteOsDefaultApp = withLogging(
  "deleteOsDefaultApp",
  _deleteOsDefaultApp
);
