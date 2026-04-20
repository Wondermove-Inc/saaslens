// src/actions/subscriptions/subscription-crud-write.ts
"use server";

/**
 * Subscription 생성/수정/삭제 관련 Server Actions
 */

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import { SubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createSubscriptionSchema,
  isRedirectError,
  updateSubscriptionSchema,
} from "./subscription-crud.types";

/**
 * 구독 생성
 */
async function _createSubscription(
  _prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  try {
    const { organizationId, userId, role } = await requireOrganization();

    // 권한 검증: VIEWER는 구독 생성 불가
    if (role === "VIEWER") {
      return { success: false, message: "구독 생성 권한이 없습니다" };
    }

    // assignedUserIds, teamIds 처리 (FormData에서 배열 추출)
    const assignedUserIds = formData.getAll("assignedUserIds") as string[];
    const teamIds = formData.getAll("teamIds") as string[];

    const rawData = {
      appId: formData.get("appId") as string,
      billingCycle: formData.get("billingCycle") as string,
      billingType: (formData.get("billingType") as string) || "FLAT_RATE",
      amount: formData.get("amount") as string,
      perSeatPrice: formData.get("perSeatPrice") as string | null,
      currency: (formData.get("currency") as string) || "KRW",
      totalLicenses: formData.get("totalLicenses") as string | null,
      usedLicenses: formData.get("usedLicenses") as string | null,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string | null,
      renewalDate: formData.get("renewalDate") as string | null,
      autoRenewal:
        formData.get("autoRenewal") === "true" ||
        formData.get("autoRenewal") === "on",
      renewalAlert30:
        formData.get("renewalAlert30") === "true" ||
        formData.get("renewalAlert30") === "on",
      renewalAlert60:
        formData.get("renewalAlert60") === "true" ||
        formData.get("renewalAlert60") === "on",
      renewalAlert90:
        formData.get("renewalAlert90") === "true" ||
        formData.get("renewalAlert90") === "on",
      contractUrl: formData.get("contractUrl") as string | null,
      notes: formData.get("notes") as string | null,
      // Team/User 배정
      teamId: (formData.get("teamId") as string) || null,
      teamIds: teamIds.filter(Boolean),
      assignedUserIds: assignedUserIds.filter(Boolean),
    };

    const result = createSubscriptionSchema.safeParse(rawData);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = result.data;

    const app = await prisma.app.findFirst({
      where: { id: data.appId, organizationId },
    });

    if (!app) {
      return { success: false, message: "앱을 찾을 수 없습니다" };
    }

    // SMP-134: teamId 검증 → 없으면 자동 생성 (deprecated single teamId + new teamIds)
    const allTeamIds =
      data.teamIds.length > 0 ? data.teamIds : data.teamId ? [data.teamId] : [];
    if (allTeamIds.length > 0) {
      for (const tid of allTeamIds) {
        const appTeam = await prisma.appTeam.findFirst({
          where: { appId: data.appId, teamId: tid },
        });
        if (!appTeam) {
          await prisma.appTeam.create({
            data: { appId: data.appId, teamId: tid, assignedBy: userId },
          });
        }
      }
    }

    // assignedUserIds 권한 검증: ADMIN만 사용자 배정 가능
    if (data.assignedUserIds.length > 0 && role !== "ADMIN") {
      return {
        success: false,
        message: "사용자 배정은 관리자만 가능합니다",
      };
    }

    // assignedUserIds 유효성 검증: 조직 내 사용자인지 확인
    if (data.assignedUserIds.length > 0) {
      const validUsers = await prisma.user.findMany({
        where: {
          id: { in: data.assignedUserIds },
          organizationId,
        },
        select: { id: true, teamId: true },
      });
      if (validUsers.length !== data.assignedUserIds.length) {
        return {
          success: false,
          message: "유효하지 않은 사용자가 포함되어 있습니다",
        };
      }

      // SMP-134: 유저 배정 시 팀-앱 자동 연결
      const userTeamIds = validUsers
        .filter((u) => u.teamId != null)
        .map((u) => u.teamId as string);
      if (userTeamIds.length > 0) {
        const existingAppTeams = await prisma.appTeam.findMany({
          where: { appId: data.appId, teamId: { in: userTeamIds } },
          select: { teamId: true },
        });
        const existingTeamIds = new Set(
          existingAppTeams.map((at) => at.teamId)
        );
        const missingTeamIds = [
          ...new Set(userTeamIds.filter((id) => !existingTeamIds.has(id))),
        ];
        if (missingTeamIds.length > 0) {
          await prisma.appTeam.createMany({
            data: missingTeamIds.map((teamId) => ({
              appId: data.appId,
              teamId,
              assignedBy: userId,
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    // usedLicenses 자동 동기화: 배정된 유저 수로 설정
    const autoUsedLicenses =
      data.assignedUserIds.length > 0
        ? data.assignedUserIds.length
        : data.usedLicenses || null;

    const subscription = await prisma.subscription.create({
      data: {
        appId: data.appId,
        organizationId,
        billingCycle: data.billingCycle,
        billingType: data.billingType,
        amount: parseFloat(data.amount),
        perSeatPrice:
          rawData.perSeatPrice && rawData.perSeatPrice !== ""
            ? parseFloat(rawData.perSeatPrice)
            : null,
        currency: data.currency,
        totalLicenses: data.totalLicenses || null,
        usedLicenses: autoUsedLicenses,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        autoRenewal: data.autoRenewal,
        renewalAlert30: data.renewalAlert30,
        renewalAlert60: data.renewalAlert60,
        renewalAlert90: data.renewalAlert90,
        contractUrl: data.contractUrl || null,
        notes: data.notes || null,
        // Dual-write: keep backward compat teamId as first teamId
        teamId: allTeamIds[0] || data.teamId || null,
      },
    });

    // SubscriptionTeam 생성 (다중 팀 배정)
    if (allTeamIds.length > 0) {
      await prisma.subscriptionTeam.createMany({
        data: allTeamIds.map((tid) => ({
          subscriptionId: subscription.id,
          teamId: tid,
          assignedBy: userId,
        })),
        skipDuplicates: true,
      });
    }

    // SubscriptionUser 생성
    if (data.assignedUserIds.length > 0) {
      await prisma.subscriptionUser.createMany({
        data: data.assignedUserIds.map((uid) => ({
          subscriptionId: subscription.id,
          userId: uid,
          assignedBy: userId,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "CREATE_SUBSCRIPTION",
        entityType: "Subscription",
        entityId: subscription.id,
        userId,
        organizationId,
        metadata: { appName: app.name, amount: data.amount },
      },
    });

    revalidatePath("/subscriptions");
    revalidatePath(`/apps/${data.appId}`);

    return { success: true, data: { id: subscription.id } };
  } catch (error) {
    logger.error({ err: error }, "구독 생성 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "구독 생성 중 오류가 발생했습니다",
    };
  }
}
export const createSubscription = withLogging(
  "createSubscription",
  _createSubscription
);

/**
 * 구독 수정
 */
async function _updateSubscription(
  id: string,
  _prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  try {
    const { organizationId, userId, role } = await requireOrganization();

    // 권한 검증: ADMIN만 구독 수정 가능
    if (role !== "ADMIN") {
      return { success: false, message: "구독 수정 권한이 없습니다" };
    }

    const existingSubscription = await prisma.subscription.findFirst({
      where: { id, organizationId },
    });

    if (!existingSubscription) {
      return { success: false, message: "구독을 찾을 수 없습니다" };
    }

    // assignedUserIds, teamIds 처리 (FormData에서 배열 추출)
    const assignedUserIds = formData.getAll("assignedUserIds") as string[];
    const teamIds = formData.getAll("teamIds") as string[];

    const rawData = {
      appId: existingSubscription.appId,
      status:
        (formData.get("status") as SubscriptionStatus) ||
        existingSubscription.status,
      billingCycle: formData.get("billingCycle") as string,
      billingType:
        (formData.get("billingType") as string) ||
        existingSubscription.billingType,
      amount: formData.get("amount") as string,
      perSeatPrice: formData.get("perSeatPrice") as string | null,
      currency:
        (formData.get("currency") as string) || existingSubscription.currency,
      totalLicenses: formData.get("totalLicenses") as string | null,
      usedLicenses: formData.get("usedLicenses") as string | null,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string | null,
      renewalDate: formData.get("renewalDate") as string | null,
      autoRenewal:
        formData.get("autoRenewal") === "true" ||
        formData.get("autoRenewal") === "on",
      renewalAlert30:
        formData.get("renewalAlert30") === "true" ||
        formData.get("renewalAlert30") === "on",
      renewalAlert60:
        formData.get("renewalAlert60") === "true" ||
        formData.get("renewalAlert60") === "on",
      renewalAlert90:
        formData.get("renewalAlert90") === "true" ||
        formData.get("renewalAlert90") === "on",
      contractUrl: formData.get("contractUrl") as string | null,
      notes: formData.get("notes") as string | null,
      // Team/User 배정
      teamId: (formData.get("teamId") as string) || null,
      teamIds: teamIds.filter(Boolean),
      assignedUserIds: assignedUserIds.filter(Boolean),
    };

    const result = updateSubscriptionSchema.safeParse(rawData);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = result.data;

    // SMP-134: teamId 검증 → 없으면 자동 생성 (deprecated single teamId + new teamIds)
    const allTeamIds =
      data.teamIds.length > 0 ? data.teamIds : data.teamId ? [data.teamId] : [];
    if (allTeamIds.length > 0) {
      for (const tid of allTeamIds) {
        const appTeam = await prisma.appTeam.findFirst({
          where: { appId: existingSubscription.appId, teamId: tid },
        });
        if (!appTeam) {
          await prisma.appTeam.create({
            data: {
              appId: existingSubscription.appId,
              teamId: tid,
              assignedBy: userId,
            },
          });
        }
      }
    }

    // assignedUserIds 유효성 검증: 조직 내 사용자인지 확인
    if (data.assignedUserIds.length > 0) {
      const validUsers = await prisma.user.findMany({
        where: {
          id: { in: data.assignedUserIds },
          organizationId,
        },
        select: { id: true, teamId: true },
      });
      if (validUsers.length !== data.assignedUserIds.length) {
        return {
          success: false,
          message: "유효하지 않은 사용자가 포함되어 있습니다",
        };
      }

      // SMP-134: 유저 배정 시 팀-앱 자동 연결
      const userTeamIds = validUsers
        .filter((u) => u.teamId != null)
        .map((u) => u.teamId as string);
      if (userTeamIds.length > 0) {
        const existingAppTeams = await prisma.appTeam.findMany({
          where: {
            appId: existingSubscription.appId,
            teamId: { in: userTeamIds },
          },
          select: { teamId: true },
        });
        const existingTeamIds = new Set(
          existingAppTeams.map((at) => at.teamId)
        );
        const missingTeamIds = [
          ...new Set(userTeamIds.filter((id) => !existingTeamIds.has(id))),
        ];
        if (missingTeamIds.length > 0) {
          await prisma.appTeam.createMany({
            data: missingTeamIds.map((teamId) => ({
              appId: existingSubscription.appId,
              teamId,
              assignedBy: userId,
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    // usedLicenses 자동 동기화: 배정된 유저 수로 설정
    const autoUsedLicenses =
      data.assignedUserIds.length > 0
        ? data.assignedUserIds.length
        : data.usedLicenses || null;

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        status: data.status || existingSubscription.status,
        billingCycle: data.billingCycle,
        billingType: data.billingType,
        amount: parseFloat(data.amount),
        perSeatPrice:
          rawData.perSeatPrice && rawData.perSeatPrice !== ""
            ? parseFloat(rawData.perSeatPrice)
            : null,
        currency: data.currency,
        totalLicenses: data.totalLicenses || null,
        usedLicenses: autoUsedLicenses,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        autoRenewal: data.autoRenewal,
        renewalAlert30: data.renewalAlert30,
        renewalAlert60: data.renewalAlert60,
        renewalAlert90: data.renewalAlert90,
        contractUrl: data.contractUrl || null,
        notes: data.notes || null,
        // Dual-write: keep backward compat teamId as first teamId
        teamId: allTeamIds[0] || data.teamId || null,
      },
    });

    // SubscriptionTeam 동기화 (delete-recreate 패턴)
    await prisma.subscriptionTeam.deleteMany({ where: { subscriptionId: id } });
    if (allTeamIds.length > 0) {
      await prisma.subscriptionTeam.createMany({
        data: allTeamIds.map((tid) => ({
          subscriptionId: id,
          teamId: tid,
          assignedBy: userId,
        })),
        skipDuplicates: true,
      });
    }

    // SubscriptionUser 동기화 (delete-recreate 패턴)
    await prisma.subscriptionUser.deleteMany({
      where: { subscriptionId: id },
    });
    if (data.assignedUserIds.length > 0) {
      await prisma.subscriptionUser.createMany({
        data: data.assignedUserIds.map((uid) => ({
          subscriptionId: id,
          userId: uid,
          assignedBy: userId,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "UPDATE_SUBSCRIPTION",
        entityType: "Subscription",
        entityId: subscription.id,
        userId,
        organizationId,
        metadata: { amount: data.amount },
      },
    });

    revalidatePath("/subscriptions");
    revalidatePath(`/subscriptions/${id}`);

    return { success: true, data: { id: subscription.id } };
  } catch (error) {
    logger.error({ err: error }, "구독 수정 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "구독 수정 중 오류가 발생했습니다",
    };
  }
}
export const updateSubscription = withLogging(
  "updateSubscription",
  _updateSubscription
);

/**
 * 구독 삭제
 */
async function _deleteSubscription(id: string): Promise<ActionState> {
  try {
    const { organizationId, userId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const existingSubscription = await prisma.subscription.findFirst({
      where: { id, organizationId },
      include: { app: { select: { name: true } } },
    });

    if (!existingSubscription) {
      return { success: false, message: "구독을 찾을 수 없습니다" };
    }

    await prisma.subscription.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE_SUBSCRIPTION",
        entityType: "Subscription",
        entityId: id,
        userId,
        organizationId,
        metadata: { appName: existingSubscription.app.name },
      },
    });

    revalidatePath("/subscriptions");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "구독 삭제 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "구독 삭제 중 오류가 발생했습니다",
    };
  }
}
export const deleteSubscription = withLogging(
  "deleteSubscription",
  _deleteSubscription
);
