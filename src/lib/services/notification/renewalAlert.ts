// src/lib/services/notification/renewalAlert.ts
import { prisma } from "@/lib/db";
import type { AlertType } from "@prisma/client";
import { sendRenewalAlertEmail } from "./email";

// 갱신일까지 남은 일수에 따른 AlertType 매핑
function getAlertType(days: number): AlertType {
  if (days === 30) return "DAYS_30";
  if (days === 60) return "DAYS_60";
  if (days === 90) return "DAYS_90";
  throw new Error(`Invalid days: ${days}`);
}

// 갱신 예정 구독 타입
export type UpcomingRenewal = Awaited<
  ReturnType<typeof findUpcomingRenewals>
>[number];

// 갱신 예정 구독 조회
export async function findUpcomingRenewals(daysUntilRenewal: 30 | 60 | 90) {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysUntilRenewal);

  // 날짜 범위 설정 (±1일)
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + 1);

  const alertField =
    daysUntilRenewal === 30
      ? "renewalAlert30"
      : daysUntilRenewal === 60
        ? "renewalAlert60"
        : "renewalAlert90";

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      renewalDate: {
        gte: startDate,
        lte: endDate,
      },
      [alertField]: true,
    },
    include: {
      app: {
        select: {
          name: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return subscriptions;
}

// 단일 알림 발송 결과
export interface SendAlertResult {
  subscriptionId: string;
  sent: number;
  failed: number;
  skipped?: boolean;
  error?: string;
}

// 단일 구독에 대한 갱신 알림 발송
export async function sendRenewalAlert(
  subscription: UpcomingRenewal,
  daysUntilRenewal: 30 | 60 | 90
): Promise<SendAlertResult> {
  const alertType = getAlertType(daysUntilRenewal);

  // 이미 발송된 알림인지 확인
  const existingAlert = await prisma.renewalAlert.findFirst({
    where: {
      subscriptionId: subscription.id,
      alertType,
      sentAt: { not: null },
    },
  });

  if (existingAlert) {
    return {
      subscriptionId: subscription.id,
      sent: 0,
      failed: 0,
      skipped: true,
    };
  }

  // 조직의 관리자 목록 조회
  const admins = await prisma.user.findMany({
    where: {
      organizationId: subscription.organization.id,
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: {
      email: true,
    },
  });

  if (admins.length === 0) {
    return {
      subscriptionId: subscription.id,
      sent: 0,
      failed: 0,
      error: "관리자 없음",
    };
  }

  let sent = 0;
  let failed = 0;

  // 각 관리자에게 이메일 발송
  for (const admin of admins) {
    const result = await sendRenewalAlertEmail({
      to: admin.email,
      appName: subscription.app.name,
      renewalDate: subscription.renewalDate!,
      daysUntilRenewal,
      amount: Number(subscription.amount),
      currency: subscription.currency,
      organizationName: subscription.organization.name,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  // 알림 기록 저장
  const scheduledFor = subscription.renewalDate!;
  await prisma.renewalAlert.upsert({
    where: {
      subscriptionId_alertType: {
        subscriptionId: subscription.id,
        alertType,
      },
    },
    create: {
      subscriptionId: subscription.id,
      alertType,
      scheduledFor,
      sentAt: new Date(),
    },
    update: {
      sentAt: new Date(),
    },
  });

  return {
    subscriptionId: subscription.id,
    sent,
    failed,
  };
}

// 전체 갱신 알림 처리 결과
export interface ProcessResult {
  processedAt: Date;
  alerts: {
    days30: { found: number; sent: number };
    days60: { found: number; sent: number };
    days90: { found: number; sent: number };
  };
  errors: string[];
}

// 모든 갱신 알림 처리
export async function processRenewalAlerts(): Promise<ProcessResult> {
  const result: ProcessResult = {
    processedAt: new Date(),
    alerts: {
      days30: { found: 0, sent: 0 },
      days60: { found: 0, sent: 0 },
      days90: { found: 0, sent: 0 },
    },
    errors: [],
  };

  // 30일 알림
  try {
    const renewals30 = await findUpcomingRenewals(30);
    result.alerts.days30.found = renewals30.length;

    for (const subscription of renewals30) {
      const alertResult = await sendRenewalAlert(subscription, 30);
      result.alerts.days30.sent += alertResult.sent;
      if (alertResult.error) {
        result.errors.push(
          `30일 알림 실패 (${subscription.id}): ${alertResult.error}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `30일 알림 처리 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
    );
  }

  // 60일 알림
  try {
    const renewals60 = await findUpcomingRenewals(60);
    result.alerts.days60.found = renewals60.length;

    for (const subscription of renewals60) {
      const alertResult = await sendRenewalAlert(subscription, 60);
      result.alerts.days60.sent += alertResult.sent;
      if (alertResult.error) {
        result.errors.push(
          `60일 알림 실패 (${subscription.id}): ${alertResult.error}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `60일 알림 처리 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
    );
  }

  // 90일 알림
  try {
    const renewals90 = await findUpcomingRenewals(90);
    result.alerts.days90.found = renewals90.length;

    for (const subscription of renewals90) {
      const alertResult = await sendRenewalAlert(subscription, 90);
      result.alerts.days90.sent += alertResult.sent;
      if (alertResult.error) {
        result.errors.push(
          `90일 알림 실패 (${subscription.id}): ${alertResult.error}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `90일 알림 처리 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
    );
  }

  return result;
}
