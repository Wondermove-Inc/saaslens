// src/actions/apps.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { matchPaymentsToNewApp } from "@/lib/services/payment/payment-matching";
import type { ActionState, PaginatedResponse } from "@/types";
import type {
  AppDetail,
  AppFilterOptions,
  AppListItem,
  AppSortOptions,
} from "@/types/app";
import { AppStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function isRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const hasRedirectDigest =
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.includes("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.includes("NEXT_NOT_FOUND"));

  const hasRedirectMessage = error.message?.includes("NEXT_REDIRECT") ?? false;

  return hasRedirectDigest || hasRedirectMessage;
}

// URL 또는 상대 경로(/로 시작) 검증 함수
const isValidUrlOrPath = (val: string | null | undefined) => {
  if (!val || val === "") return true;
  if (val.startsWith("/")) return true; // 상대 경로 허용
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
};

// Validation schemas
const createAppSchema = z.object({
  name: z
    .string()
    .min(2, "앱 이름은 2자 이상이어야 합니다")
    .max(100, "앱 이름은 100자 이하여야 합니다"),
  category: z.string().nullish(),
  customLogoUrl: z
    .string()
    .nullish()
    .refine(isValidUrlOrPath, { message: "유효한 URL을 입력하세요" }),
  customWebsite: z
    .string()
    .url("유효한 URL을 입력하세요")
    .nullish()
    .or(z.literal("")),
  notes: z.string().max(1000, "메모는 1000자 이하여야 합니다").nullish(),
  tags: z.string().nullish(),
  ownerId: z.string().nullish(),
  catalogId: z.string().nullish(),
  teamIds: z.array(z.string()).optional(),
});

const updateAppSchema = createAppSchema.extend({
  status: z.nativeEnum(AppStatus).nullish(),
});

interface GetAppsParams {
  filter?: AppFilterOptions;
  sort?: AppSortOptions;
  page?: number;
  limit?: number;
}

/**
 * 앱 목록 조회
 */
export async function getApps(
  params: GetAppsParams = {}
): Promise<PaginatedResponse<AppListItem>> {
  const { organizationId, role, teamId } = await requireOrganization();

  const {
    filter = {},
    sort = { sortBy: "createdAt", sortOrder: "desc" },
    page = 1,
    limit = 20,
  } = params;

  // MEMBER/VIEWER는 본인 팀 앱만 조회 가능
  if (role === "MEMBER" || role === "VIEWER") {
    if (!teamId) {
      // 팀 미소속 시 빈 결과 반환
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  const skip = (page - 1) * limit;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId };

  // MEMBER/VIEWER는 본인 팀에 배정된 앱만 조회
  if ((role === "MEMBER" || role === "VIEWER") && teamId) {
    where.teams = { some: { teamId } };
  }

  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.source) {
    where.source = filter.source;
  }
  if (filter.category) {
    where.category = filter.category;
  }
  if (filter.ownerId) {
    where.ownerId = filter.ownerId;
  }
  if (filter.search) {
    where.name = { contains: filter.search, mode: "insensitive" };
  }
  // ADMIN만 teamIds 필터 사용 가능 (이미 MEMBER/VIEWER는 본인 팀으로 제한됨)
  if (role === "ADMIN" && filter.teamIds && filter.teamIds.length > 0) {
    where.teams = {
      some: { teamId: { in: filter.teamIds } },
    };
  }

  // Build orderBy
  const orderBy = sort.sortBy
    ? { [sort.sortBy]: sort.sortOrder || "desc" }
    : { createdAt: "desc" as const };

  const [apps, total] = await Promise.all([
    prisma.app.findMany({
      where,
      include: {
        catalog: { select: { logoUrl: true, category: true } },
        owner: { select: { name: true, email: true } },
        teams: { include: { team: { select: { id: true, name: true } } } },
        _count: { select: { subscriptions: true, userAccesses: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.app.count({ where }),
  ]);

  const items: AppListItem[] = apps.map((app) => ({
    id: app.id,
    name: app.name,
    status: app.status,
    source: app.source,
    category: app.category || app.catalog?.category || null,
    customLogoUrl: app.customLogoUrl,
    catalogLogoUrl: app.catalog?.logoUrl ?? null,
    ownerName: app.owner?.name ?? null,
    ownerEmail: app.owner?.email ?? null,
    subscriptionCount: app._count.subscriptions,
    userAccessCount: app._count.userAccesses,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    teams: app.teams.map((at) => ({ id: at.team.id, name: at.team.name })),
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 앱 상세 조회
 */
export async function getApp(id: string): Promise<AppDetail | null> {
  const { organizationId, role, teamId } = await requireOrganization();

  const app = await prisma.app.findFirst({
    where: { id, organizationId },
    include: {
      catalog: { select: { logoUrl: true, category: true } },
      owner: { select: { name: true, email: true } },
      teams: { include: { team: { select: { id: true, name: true } } } },
      _count: { select: { subscriptions: true, userAccesses: true } },
    },
  });

  if (!app) {
    return null;
  }

  // MEMBER/VIEWER는 본인 팀에 배정된 앱만 조회 가능
  if (role === "MEMBER" || role === "VIEWER") {
    const isTeamApp = teamId && app.teams.some((at) => at.teamId === teamId);
    if (!isTeamApp) {
      return null; // 권한 없음 → Not Found로 처리
    }
  }

  return {
    id: app.id,
    name: app.name,
    status: app.status,
    source: app.source,
    category: app.category || app.catalog?.category || null,
    catalogId: app.catalogId,
    customLogoUrl: app.customLogoUrl,
    catalogLogoUrl: app.catalog?.logoUrl ?? null,
    customWebsite: app.customWebsite,
    notes: app.notes,
    tags: app.tags,
    riskScore: app.riskScore,
    discoveredAt: app.discoveredAt,
    ownerName: app.owner?.name ?? null,
    ownerEmail: app.owner?.email ?? null,
    subscriptionCount: app._count.subscriptions,
    userAccessCount: app._count.userAccesses,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    teams: app.teams.map((at) => ({ id: at.team.id, name: at.team.name })),
  };
}

/**
 * 앱 생성
 */
async function _createApp(
  _prevState: ActionState<{ id: string; matchedPaymentCount?: number }>,
  formData: FormData
): Promise<ActionState<{ id: string; matchedPaymentCount?: number }>> {
  try {
    const { organizationId, userId, role } = await requireOrganization();

    // 권한 검증: VIEWER는 앱 생성 불가
    if (role === "VIEWER") {
      return { success: false, message: "앱 생성 권한이 없습니다" };
    }

    // Parse form data
    const teamIdsRaw = formData.getAll("teamIds") as string[];
    const rawData = {
      name: formData.get("name") as string,
      category: formData.get("category") as string | null,
      customLogoUrl: formData.get("customLogoUrl") as string | null,
      customWebsite: formData.get("customWebsite") as string | null,
      notes: formData.get("notes") as string | null,
      tags: formData.get("tags") as string | null,
      ownerId: formData.get("ownerId") as string | null,
      catalogId: formData.get("catalogId") as string | null,
      teamIds: teamIdsRaw.filter(Boolean),
    };

    // Validate
    const result = createAppSchema.safeParse(rawData);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = result.data;

    // Check for duplicate name
    const existingApp = await prisma.app.findFirst({
      where: { organizationId, name: data.name },
    });

    if (existingApp) {
      return { success: false, message: "이미 등록된 앱 이름입니다" };
    }

    // Validate ownerId belongs to same organization
    if (data.ownerId) {
      const owner = await prisma.user.findFirst({
        where: { id: data.ownerId, organizationId },
      });
      if (!owner) {
        return {
          success: false,
          message: "지정된 소유자가 조직에 속하지 않습니다",
        };
      }
    }

    // Validate teamIds belong to same organization
    if (data.teamIds && data.teamIds.length > 0) {
      const teams = await prisma.team.findMany({
        where: { id: { in: data.teamIds }, organizationId },
      });
      if (teams.length !== data.teamIds.length) {
        return {
          success: false,
          message: "유효하지 않은 팀이 포함되어 있습니다",
        };
      }
    }

    // Parse tags
    const tags = data.tags
      ? data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // Create app
    const app = await prisma.app.create({
      data: {
        name: data.name,
        category: data.category || null,
        customLogoUrl: data.customLogoUrl || null,
        customWebsite: data.customWebsite || null,
        notes: data.notes || null,
        tags,
        ownerId: data.ownerId || null,
        catalogId: data.catalogId || null,
        organizationId,
      },
    });

    // Create AppTeam records
    if (data.teamIds && data.teamIds.length > 0) {
      await prisma.appTeam.createMany({
        data: data.teamIds.map((teamId) => ({
          appId: app.id,
          teamId,
          assignedBy: userId,
        })),
      });
    }

    // Match existing payment records to the new app
    let matchedPaymentCount = 0;
    try {
      const matchResult = await matchPaymentsToNewApp(
        app.id,
        app.name,
        organizationId
      );
      matchedPaymentCount = matchResult.matchedCount;
    } catch (error) {
      // Log but don't fail app creation (graceful degradation)
      console.error("Payment matching error:", error);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "CREATE_APP",
        entityType: "App",
        entityId: app.id,
        userId,
        organizationId,
        metadata: { appName: app.name, matchedPaymentCount },
      },
    });

    revalidatePath("/apps");

    return { success: true, data: { id: app.id, matchedPaymentCount } };
  } catch (error) {
    logger.error({ err: error }, "앱 생성 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "앱 생성 중 오류가 발생했습니다",
    };
  }
}
export const createApp = withLogging("createApp", _createApp);

/**
 * 앱 수정
 */
async function _updateApp(
  id: string,
  _prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  try {
    const { organizationId, userId, role } = await requireOrganization();

    // 권한 검증: ADMIN만 앱 수정 가능
    if (role !== "ADMIN") {
      return { success: false, message: "앱 수정 권한이 없습니다" };
    }

    // Check if app exists
    const existingApp = await prisma.app.findFirst({
      where: { id, organizationId },
    });

    if (!existingApp) {
      return { success: false, message: "앱을 찾을 수 없습니다" };
    }

    // Parse form data
    const teamIdsRaw = formData.getAll("teamIds") as string[];
    const rawData = {
      name: formData.get("name") as string,
      status: formData.get("status") as AppStatus | null,
      category: formData.get("category") as string | null,
      customLogoUrl: formData.get("customLogoUrl") as string | null,
      customWebsite: formData.get("customWebsite") as string | null,
      notes: formData.get("notes") as string | null,
      tags: formData.get("tags") as string | null,
      ownerId: formData.get("ownerId") as string | null,
      teamIds: teamIdsRaw.filter(Boolean),
    };

    // Validate
    const result = updateAppSchema.safeParse(rawData);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = result.data;

    // Check for duplicate name (if name changed)
    if (data.name !== existingApp.name) {
      const duplicateApp = await prisma.app.findFirst({
        where: { organizationId, name: data.name, id: { not: id } },
      });

      if (duplicateApp) {
        return { success: false, message: "이미 등록된 앱 이름입니다" };
      }
    }

    // Validate ownerId belongs to same organization
    if (data.ownerId) {
      const owner = await prisma.user.findFirst({
        where: { id: data.ownerId, organizationId },
      });
      if (!owner) {
        return {
          success: false,
          message: "지정된 소유자가 조직에 속하지 않습니다",
        };
      }
    }

    // Validate teamIds belong to same organization
    if (data.teamIds && data.teamIds.length > 0) {
      const teams = await prisma.team.findMany({
        where: { id: { in: data.teamIds }, organizationId },
      });
      if (teams.length !== data.teamIds.length) {
        return {
          success: false,
          message: "유효하지 않은 팀이 포함되어 있습니다",
        };
      }
    }

    // Parse tags
    const tags = data.tags
      ? data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // Update app
    const app = await prisma.app.update({
      where: { id },
      data: {
        name: data.name,
        status: data.status || existingApp.status,
        category: data.category || null,
        customLogoUrl: data.customLogoUrl || null,
        customWebsite: data.customWebsite || null,
        notes: data.notes || null,
        tags,
        ownerId: data.ownerId || null,
      },
    });

    // Sync AppTeam records (delete existing and recreate)
    await prisma.appTeam.deleteMany({
      where: { appId: id },
    });

    if (data.teamIds && data.teamIds.length > 0) {
      await prisma.appTeam.createMany({
        data: data.teamIds.map((teamId) => ({
          appId: id,
          teamId,
          assignedBy: userId,
        })),
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "UPDATE_APP",
        entityType: "App",
        entityId: app.id,
        userId,
        organizationId,
        metadata: { appName: app.name },
      },
    });

    revalidatePath("/apps");
    revalidatePath(`/apps/${id}`);

    return { success: true, data: { id: app.id } };
  } catch (error) {
    logger.error({ err: error }, "앱 수정 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "앱 수정 중 오류가 발생했습니다",
    };
  }
}
export const updateApp = withLogging("updateApp", _updateApp);

/**
 * 앱 삭제
 */
async function _deleteApp(id: string): Promise<ActionState> {
  try {
    const { organizationId, userId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    // Check if app exists
    const existingApp = await prisma.app.findFirst({
      where: { id, organizationId },
    });

    if (!existingApp) {
      return { success: false, message: "앱을 찾을 수 없습니다" };
    }

    // Delete app (cascade will delete related subscriptions and user accesses)
    await prisma.app.delete({ where: { id } });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "DELETE_APP",
        entityType: "App",
        entityId: id,
        userId,
        organizationId,
        metadata: { appName: existingApp.name },
      },
    });

    revalidatePath("/apps");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "앱 삭제 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "앱 삭제 중 오류가 발생했습니다",
    };
  }
}
export const deleteApp = withLogging("deleteApp", _deleteApp);
