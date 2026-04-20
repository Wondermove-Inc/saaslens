// src/app/api/cron/send-reports/route.ts
/**
 * 예약된 리포트 발송 Cron Job
 * Vercel Cron으로 매시간 실행
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";
import { sendReportEmail } from "@/lib/services/report/email-sender";
import { NextRequest, NextResponse } from "next/server";

export const GET = withCronAuth(
  withLogging("cron:send-reports", async (request: NextRequest) => {
    const now = new Date();
    // 멱등성 보장: 1시간 이내 중복 실행 방지
    const idempotencyWindow = new Date(now.getTime() - 60 * 60 * 1000); // 1시간 전

    const results: {
      id: string;
      status: "success" | "error" | "skipped";
      error?: string;
    }[] = [];

    try {
      // 발송 예정인 스케줄 조회 (멱등성 체크 포함)
      const dueSchedules = await prisma.reportSchedule.findMany({
        where: {
          isActive: true,
          nextSendAt: {
            lte: now,
          },
          // 멱등성: 1시간 이내에 이미 발송된 스케줄 제외
          OR: [{ lastSentAt: null }, { lastSentAt: { lt: idempotencyWindow } }],
        },
        include: {
          organization: {
            select: { name: true },
          },
        },
      });

      logger.info(`Found ${dueSchedules.length} schedules to process`);

      // 각 스케줄 처리
      for (const schedule of dueSchedules) {
        try {
          // 멱등성 재확인 (경합 조건 방지)
          const freshSchedule = await prisma.reportSchedule.findUnique({
            where: { id: schedule.id },
            select: { lastSentAt: true },
          });

          if (
            freshSchedule?.lastSentAt &&
            freshSchedule.lastSentAt >= idempotencyWindow
          ) {
            logger.info(
              `Skipping schedule ${schedule.id} - already processed recently`
            );
            results.push({ id: schedule.id, status: "skipped" });
            continue;
          }

          // 다음 발송 시간 계산 (먼저 계산해두기)
          const nextSendAt = calculateNextSendAt(schedule);

          // 먼저 스케줄 업데이트 (발송 전 잠금 효과)
          await prisma.reportSchedule.update({
            where: { id: schedule.id },
            data: {
              lastSentAt: now,
              nextSendAt,
            },
          });

          // 리포트 생성 및 이메일 발송
          await sendReportEmail({
            scheduleId: schedule.id,
            organizationId: schedule.organizationId,
            organizationName: schedule.organization.name,
            reportType: schedule.reportType,
            format: schedule.format,
            recipients: schedule.recipients,
          });

          results.push({ id: schedule.id, status: "success" });
          logger.info(`Successfully sent report for schedule ${schedule.id}`);
        } catch (error) {
          logger.error(
            { err: error, scheduleId: schedule.id },
            "Failed to send report for schedule"
          );
          results.push({
            id: schedule.id,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return NextResponse.json({
        success: true,
        processed: dueSchedules.length,
        results,
        timestamp: now.toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, "Cron job failed");
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  })
);

/**
 * 다음 발송 시간 계산
 */
function calculateNextSendAt(schedule: {
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hour: number;
  timezone: string;
}): Date {
  const now = new Date();
  const next = new Date(now);

  // 기본적으로 발송 시간 설정
  next.setHours(schedule.hour, 0, 0, 0);

  switch (schedule.frequency) {
    case "DAILY":
      // 다음 날
      next.setDate(next.getDate() + 1);
      break;

    case "WEEKLY":
      // 다음 주 같은 요일
      const daysUntilNext =
        schedule.dayOfWeek !== null
          ? (schedule.dayOfWeek - now.getDay() + 7) % 7 || 7
          : 7;
      next.setDate(next.getDate() + daysUntilNext);
      break;

    case "MONTHLY":
      // 다음 달 같은 날
      next.setMonth(next.getMonth() + 1);
      if (schedule.dayOfMonth !== null) {
        const lastDay = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0
        ).getDate();
        next.setDate(Math.min(schedule.dayOfMonth, lastDay));
      }
      break;

    default:
      // 기본값: 다음 주
      next.setDate(next.getDate() + 7);
  }

  return next;
}
