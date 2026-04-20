// src/actions/renewal-alerts.ts
"use server";

import { getCachedSession, requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type { AlertType } from "@prisma/client";
import { revalidatePath } from "next/cache";

function isRedirectError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.includes("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.includes("NEXT_NOT_FOUND"))
  );
}

interface RenewalAlertWithSubscription {
  id: string;
  subscriptionId: string;
  alertType: AlertType;
  scheduledFor: Date;
  sentAt: Date | null;
  createdAt: Date;
  subscription: {
    id: string;
    app: { name: string };
    renewalDate: Date | null;
    amount: number | { toNumber: () => number }; // Prisma Decimal 호환
    currency: string;
  };
}

interface GetRenewalAlertsOptions {
  sentOnly?: boolean;
  subscriptionId?: string;
}

/**
 * 갱신 알림 목록 조회
 */
export async function getRenewalAlerts(
  options: GetRenewalAlertsOptions = {}
): Promise<RenewalAlertWithSubscription[]> {
  const { organizationId } = await requireOrganization();

  const { sentOnly, subscriptionId } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    subscription: {
      organizationId,
    },
  };

  if (sentOnly === false) {
    where.sentAt = null;
  }

  if (subscriptionId) {
    where.subscriptionId = subscriptionId;
  }

  const alerts = await prisma.renewalAlert.findMany({
    where,
    include: {
      subscription: {
        select: {
          id: true,
          app: { select: { name: true } },
          renewalDate: true,
          amount: true,
          currency: true,
        },
      },
    },
    orderBy: { scheduledFor: "asc" },
  });

  return alerts as RenewalAlertWithSubscription[];
}

interface CreateRenewalAlertInput {
  subscriptionId: string;
  alertType: AlertType;
  scheduledFor: Date;
}

/**
 * 갱신 알림 생성
 */
async function _createRenewalAlert(
  input: CreateRenewalAlertInput
): Promise<ActionState<{ id: string }>> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }

    const organizationId = session.user.organizationId;

    // 구독 존재 확인
    const subscription = await prisma.subscription.findFirst({
      where: { id: input.subscriptionId, organizationId },
    });

    if (!subscription) {
      return { success: false, message: "구독을 찾을 수 없습니다" };
    }

    const alert = await prisma.renewalAlert.create({
      data: {
        subscriptionId: input.subscriptionId,
        alertType: input.alertType,
        scheduledFor: input.scheduledFor,
      },
    });

    revalidatePath("/subscriptions");
    revalidatePath(`/subscriptions/${input.subscriptionId}`);

    return { success: true, data: { id: alert.id } };
  } catch (error) {
    logger.error({ err: error }, "갱신 알림 생성 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "갱신 알림 생성 중 오류가 발생했습니다",
    };
  }
}
export const createRenewalAlert = withLogging(
  "createRenewalAlert",
  _createRenewalAlert
);

/**
 * 알림을 발송 완료로 표시
 */
async function _markAlertAsSent(alertId: string): Promise<ActionState> {
  try {
    const { organizationId } = await requireOrganization();

    const alert = await prisma.renewalAlert.findFirst({
      where: { id: alertId },
      include: { subscription: { select: { organizationId: true } } },
    });

    if (!alert || alert.subscription.organizationId !== organizationId) {
      return { success: false, message: "알림을 찾을 수 없습니다" };
    }

    await prisma.renewalAlert.update({
      where: { id: alertId },
      data: { sentAt: new Date() },
    });

    revalidatePath("/subscriptions");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "알림 발송 상태 업데이트 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "알림 발송 상태 업데이트 중 오류가 발생했습니다",
    };
  }
}
export const markAlertAsSent = withLogging("markAlertAsSent", _markAlertAsSent);

/**
 * 갱신 알림 삭제
 */
async function _deleteRenewalAlert(alertId: string): Promise<ActionState> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const alert = await prisma.renewalAlert.findFirst({
      where: { id: alertId },
      include: { subscription: { select: { organizationId: true } } },
    });

    if (!alert || alert.subscription.organizationId !== organizationId) {
      return { success: false, message: "알림을 찾을 수 없습니다" };
    }

    await prisma.renewalAlert.delete({ where: { id: alertId } });

    revalidatePath("/subscriptions");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "갱신 알림 삭제 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "갱신 알림 삭제 중 오류가 발생했습니다",
    };
  }
}
export const deleteRenewalAlert = withLogging(
  "deleteRenewalAlert",
  _deleteRenewalAlert
);

/**
 * 갱신 알림 자동 생성
 * 활성 구독의 갱신 설정에 따라 알림을 자동으로 생성합니다.
 */
async function _generateRenewalAlerts(): Promise<
  ActionState<{ created: number }>
> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const now = new Date();

    // 활성 구독 중 갱신일이 설정된 것들 조회
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        renewalDate: { not: null },
      },
      include: {
        renewalAlerts: {
          select: { alertType: true },
        },
      },
    });

    const alertsToCreate: {
      subscriptionId: string;
      alertType: AlertType;
      scheduledFor: Date;
    }[] = [];

    for (const subscription of subscriptions) {
      if (!subscription.renewalDate) continue;

      const existingTypes = new Set(
        subscription.renewalAlerts.map((a) => a.alertType)
      );

      // 30일 전 알림
      if (subscription.renewalAlert30 && !existingTypes.has("DAYS_30")) {
        const scheduledFor = new Date(subscription.renewalDate);
        scheduledFor.setDate(scheduledFor.getDate() - 30);
        if (scheduledFor > now) {
          alertsToCreate.push({
            subscriptionId: subscription.id,
            alertType: "DAYS_30",
            scheduledFor,
          });
        }
      }

      // 60일 전 알림
      if (subscription.renewalAlert60 && !existingTypes.has("DAYS_60")) {
        const scheduledFor = new Date(subscription.renewalDate);
        scheduledFor.setDate(scheduledFor.getDate() - 60);
        if (scheduledFor > now) {
          alertsToCreate.push({
            subscriptionId: subscription.id,
            alertType: "DAYS_60",
            scheduledFor,
          });
        }
      }

      // 90일 전 알림
      if (subscription.renewalAlert90 && !existingTypes.has("DAYS_90")) {
        const scheduledFor = new Date(subscription.renewalDate);
        scheduledFor.setDate(scheduledFor.getDate() - 90);
        if (scheduledFor > now) {
          alertsToCreate.push({
            subscriptionId: subscription.id,
            alertType: "DAYS_90",
            scheduledFor,
          });
        }
      }
    }

    if (alertsToCreate.length > 0) {
      await prisma.renewalAlert.createMany({
        data: alertsToCreate,
        skipDuplicates: true,
      });
    }

    revalidatePath("/subscriptions");

    return { success: true, data: { created: alertsToCreate.length } };
  } catch (error) {
    logger.error({ err: error }, "갱신 알림 자동 생성 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "갱신 알림 자동 생성 중 오류가 발생했습니다",
    };
  }
}
export const generateRenewalAlerts = withLogging(
  "generateRenewalAlerts",
  _generateRenewalAlerts
);
