// src/lib/services/notification/weeklyDigest.ts
import { prisma } from "@/lib/db";
import {
  sendWeeklyDigestEmail,
  type WeeklyDigestEmailParams,
} from "@/lib/services/notification/email";

interface OrganizationSettings {
  notifications?: {
    emailEnabled?: boolean;
    weeklyDigest?: boolean;
  };
}

export interface WeeklyDigestJobResult {
  success: boolean;
  processedOrganizations: number;
  emailsSent: number;
  errors: string[];
}

/**
 * 주간 요약 Cron 처리
 */
export async function processWeeklyDigest(): Promise<WeeklyDigestJobResult> {
  const result: WeeklyDigestJobResult = {
    success: true,
    processedOrganizations: 0,
    emailsSent: 0,
    errors: [],
  };

  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        settings: true,
        users: {
          where: { role: "ADMIN", status: "ACTIVE" },
          select: { email: true },
        },
      },
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    for (const org of organizations) {
      const settings = org.settings as OrganizationSettings;
      const weeklyDigest = settings?.notifications?.weeklyDigest ?? false;
      const emailEnabled = settings?.notifications?.emailEnabled ?? true;

      if (!weeklyDigest || !emailEnabled) continue;

      const adminEmails = org.users
        .map((u) => u.email)
        .filter((e): e is string => Boolean(e));
      if (adminEmails.length === 0) {
        result.errors.push(`${org.id}: 관리자 이메일이 없습니다`);
        continue;
      }

      result.processedOrganizations += 1;

      const stats = await collectOrgStats(org.id, startDate, endDate);
      const weekRange = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;

      const emailParams: Omit<WeeklyDigestEmailParams, "to"> = {
        organizationName: org.name,
        weekRange,
        stats,
      };

      for (const email of adminEmails) {
        const sendResult = await sendWeeklyDigestEmail({
          ...emailParams,
          to: email,
        });

        if (sendResult.success) {
          result.emailsSent += 1;
        } else {
          result.errors.push(
            `${org.id}: ${email} 발송 실패 - ${sendResult.error || "알 수 없는 오류"}`
          );
        }
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : "주간 요약 처리 중 오류"
    );
  }

  return result;
}

async function collectOrgStats(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  const [newApps, unmatchedPayments, upcomingRenewals, pendingConfirmations] =
    await Promise.all([
      prisma.app.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.cardTransaction.count({
        where: {
          organizationId,
          transactionType: "APPROVAL", // 승인내역 기준 카운트
          createdAt: { gte: startDate, lte: endDate },
          matchedAppId: null,
        },
      }),
      prisma.subscription.count({
        where: {
          organizationId,
          status: "ACTIVE",
          renewalDate: {
            not: null,
            lte: addDays(endDate, 30),
          },
        },
      }),
      prisma.vendorInferenceLog.count({
        where: {
          organizationId,
          confidence: { gte: 0.5, lte: 0.8 },
          isSaaS: true,
          app: { status: "PENDING_REVIEW" },
        },
      }),
    ]);

  return {
    newApps,
    unmatchedPayments,
    upcomingRenewals,
    pendingConfirmations,
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
