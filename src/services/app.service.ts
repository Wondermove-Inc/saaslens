// src/services/app.service.ts
// SMP-203: App CRUD 비즈니스 로직 — Server Action + Write Tool 공용 서비스 레이어

import { prisma } from "@/lib/db";
import { matchPaymentsToNewApp } from "@/lib/services/payment/payment-matching";

// ==================== Types ====================

export interface AppServiceContext {
  organizationId: string;
  userId: string;
  role: string;
  teamId?: string;
}

export interface CreateAppInput {
  name: string;
  category?: string | null;
  customLogoUrl?: string | null;
  customWebsite?: string | null;
  notes?: string | null;
  tags?: string | null;
  ownerId?: string | null;
  catalogId?: string | null;
  teamIds?: string[];
}

export interface UpdateAppInput {
  name?: string;
  category?: string | null;
  customLogoUrl?: string | null;
  customWebsite?: string | null;
  notes?: string | null;
  tags?: string | null;
  ownerId?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "PENDING_REVIEW" | "BLOCKED";
  teamIds?: string[];
}

export interface ServiceResult<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

// ==================== Create ====================

export async function createApp(
  ctx: AppServiceContext,
  input: CreateAppInput
): Promise<ServiceResult<{ id: string; matchedPaymentCount?: number }>> {
  // 권한 검증
  if (ctx.role === "VIEWER") {
    return { success: false, message: "앱 생성 권한이 없습니다" };
  }

  // 중복 이름 체크
  const existingApp = await prisma.app.findFirst({
    where: { organizationId: ctx.organizationId, name: input.name },
  });
  if (existingApp) {
    return { success: false, message: "이미 등록된 앱 이름입니다" };
  }

  // ownerId 검증
  if (input.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: input.ownerId, organizationId: ctx.organizationId },
    });
    if (!owner) {
      return {
        success: false,
        message: "지정된 소유자가 조직에 속하지 않습니다",
      };
    }
  }

  // teamIds 검증
  if (input.teamIds && input.teamIds.length > 0) {
    const teams = await prisma.team.findMany({
      where: { id: { in: input.teamIds }, organizationId: ctx.organizationId },
    });
    if (teams.length !== input.teamIds.length) {
      return {
        success: false,
        message: "유효하지 않은 팀이 포함되어 있습니다",
      };
    }
  }

  // 태그 파싱
  const tags = input.tags
    ? input.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // 앱 생성
  const app = await prisma.app.create({
    data: {
      name: input.name,
      category: input.category || null,
      customLogoUrl: input.customLogoUrl || null,
      customWebsite: input.customWebsite || null,
      notes: input.notes || null,
      tags,
      ownerId: input.ownerId || null,
      catalogId: input.catalogId || null,
      organizationId: ctx.organizationId,
    },
  });

  // AppTeam 레코드 생성
  if (input.teamIds && input.teamIds.length > 0) {
    await prisma.appTeam.createMany({
      data: input.teamIds.map((teamId) => ({
        appId: app.id,
        teamId,
        assignedBy: ctx.userId,
      })),
    });
  }

  // 결제 매칭
  let matchedPaymentCount = 0;
  try {
    const matchResult = await matchPaymentsToNewApp(
      app.id,
      app.name,
      ctx.organizationId
    );
    matchedPaymentCount = matchResult.matchedCount;
  } catch {
    // 실패해도 앱 생성은 성공
  }

  // 감사 로그
  await prisma.auditLog.create({
    data: {
      action: "CREATE_APP",
      entityType: "App",
      entityId: app.id,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      metadata: { appName: app.name, matchedPaymentCount },
    },
  });

  return { success: true, data: { id: app.id, matchedPaymentCount } };
}

// ==================== Update ====================

export async function updateApp(
  ctx: AppServiceContext,
  id: string,
  input: UpdateAppInput
): Promise<ServiceResult<{ id: string }>> {
  // 권한 검증
  if (ctx.role !== "ADMIN") {
    return { success: false, message: "앱 수정 권한이 없습니다" };
  }

  // 앱 존재 여부
  const existingApp = await prisma.app.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!existingApp) {
    return { success: false, message: "앱을 찾을 수 없습니다" };
  }

  // 중복 이름 체크 (이름 변경 시)
  if (input.name && input.name !== existingApp.name) {
    const duplicateApp = await prisma.app.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: input.name,
        id: { not: id },
      },
    });
    if (duplicateApp) {
      return { success: false, message: "이미 등록된 앱 이름입니다" };
    }
  }

  // ownerId 검증
  if (input.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: input.ownerId, organizationId: ctx.organizationId },
    });
    if (!owner) {
      return {
        success: false,
        message: "지정된 소유자가 조직에 속하지 않습니다",
      };
    }
  }

  // teamIds 검증
  if (input.teamIds && input.teamIds.length > 0) {
    const teams = await prisma.team.findMany({
      where: { id: { in: input.teamIds }, organizationId: ctx.organizationId },
    });
    if (teams.length !== input.teamIds.length) {
      return {
        success: false,
        message: "유효하지 않은 팀이 포함되어 있습니다",
      };
    }
  }

  // 태그 파싱
  const tags = input.tags
    ? input.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // 앱 수정
  const app = await prisma.app.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      status: input.status || existingApp.status,
      category:
        input.category !== undefined ? input.category || null : undefined,
      customLogoUrl:
        input.customLogoUrl !== undefined
          ? input.customLogoUrl || null
          : undefined,
      customWebsite:
        input.customWebsite !== undefined
          ? input.customWebsite || null
          : undefined,
      notes: input.notes !== undefined ? input.notes || null : undefined,
      ...(input.tags !== undefined && { tags }),
      ownerId: input.ownerId !== undefined ? input.ownerId || null : undefined,
    },
  });

  // AppTeam 동기화
  if (input.teamIds !== undefined) {
    await prisma.appTeam.deleteMany({ where: { appId: id } });
    if (input.teamIds.length > 0) {
      await prisma.appTeam.createMany({
        data: input.teamIds.map((teamId) => ({
          appId: id,
          teamId,
          assignedBy: ctx.userId,
        })),
      });
    }
  }

  // 감사 로그
  await prisma.auditLog.create({
    data: {
      action: "UPDATE_APP",
      entityType: "App",
      entityId: app.id,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      metadata: { appName: app.name },
    },
  });

  return { success: true, data: { id: app.id } };
}

// ==================== Delete ====================

export async function deleteApp(
  ctx: AppServiceContext,
  id: string
): Promise<ServiceResult> {
  // 권한 검증
  if (ctx.role !== "ADMIN") {
    return { success: false, message: "관리자 권한이 필요합니다" };
  }

  // 앱 존재 여부
  const existingApp = await prisma.app.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!existingApp) {
    return { success: false, message: "앱을 찾을 수 없습니다" };
  }

  // 삭제
  await prisma.app.delete({ where: { id } });

  // 감사 로그
  await prisma.auditLog.create({
    data: {
      action: "DELETE_APP",
      entityType: "App",
      entityId: id,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      metadata: { appName: existingApp.name },
    },
  });

  return { success: true };
}
