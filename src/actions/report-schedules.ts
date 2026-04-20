// src/actions/report-schedules.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type {
  ReportFormat,
  ReportSchedule,
  ReportType,
  ScheduleFrequency,
} from "@prisma/client";
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

/**
 * 리포트 일정 목록 조회
 */
export async function getReportSchedules(): Promise<ReportSchedule[]> {
  const { organizationId } = await requireOrganization();

  const schedules = await prisma.reportSchedule.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  return schedules;
}

/**
 * 단일 리포트 일정 조회
 */
export async function getReportSchedule(
  id: string
): Promise<ReportSchedule | null> {
  const { organizationId } = await requireOrganization();

  const schedule = await prisma.reportSchedule.findFirst({
    where: { id, organizationId },
  });

  return schedule;
}

interface CreateReportScheduleInput {
  reportType: ReportType;
  format?: ReportFormat;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
  timezone?: string;
  recipients: string[];
}

/**
 * 다음 발송 시간 계산
 */
function calculateNextSendAt(
  frequency: ScheduleFrequency,
  hour: number,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);

  if (frequency === "DAILY") {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (frequency === "WEEKLY") {
    const targetDay = dayOfWeek ?? 1; // 기본값: 월요일
    const daysUntilTarget = (targetDay - next.getDay() + 7) % 7;
    next.setDate(
      next.getDate() +
        (daysUntilTarget === 0 && next <= now ? 7 : daysUntilTarget)
    );
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }
  } else if (frequency === "MONTHLY") {
    const targetDay = dayOfMonth ?? 1;
    next.setDate(targetDay);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next;
}

/**
 * 리포트 일정 생성
 */
async function _createReportSchedule(
  input: CreateReportScheduleInput
): Promise<ActionState<{ id: string }>> {
  try {
    const { organizationId, userId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    if (!input.recipients || input.recipients.length === 0) {
      return { success: false, message: "수신자를 지정해야 합니다" };
    }

    const hour = input.hour ?? 9;
    const nextSendAt = calculateNextSendAt(
      input.frequency,
      hour,
      input.dayOfWeek,
      input.dayOfMonth
    );

    const schedule = await prisma.reportSchedule.create({
      data: {
        organizationId,
        reportType: input.reportType,
        format: input.format ?? "PDF",
        frequency: input.frequency,
        dayOfWeek: input.dayOfWeek,
        dayOfMonth: input.dayOfMonth,
        hour,
        timezone: input.timezone ?? "Asia/Seoul",
        recipients: input.recipients,
        isActive: true,
        nextSendAt,
        createdById: userId,
      },
    });

    revalidatePath("/settings/reports");

    return { success: true, data: { id: schedule.id } };
  } catch (error) {
    logger.error({ err: error }, "리포트 일정 생성 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "리포트 일정 생성 중 오류가 발생했습니다",
    };
  }
}
export const createReportSchedule = withLogging(
  "createReportSchedule",
  _createReportSchedule
);

interface UpdateReportScheduleInput {
  reportType?: ReportType;
  format?: ReportFormat;
  frequency?: ScheduleFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  hour?: number;
  timezone?: string;
  recipients?: string[];
  isActive?: boolean;
}

/**
 * 리포트 일정 수정
 */
async function _updateReportSchedule(
  id: string,
  input: UpdateReportScheduleInput
): Promise<ActionState> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const existingSchedule = await prisma.reportSchedule.findFirst({
      where: { id, organizationId },
    });

    if (!existingSchedule) {
      return { success: false, message: "리포트 일정을 찾을 수 없습니다" };
    }

    if (input.recipients && input.recipients.length === 0) {
      return { success: false, message: "수신자를 지정해야 합니다" };
    }

    // 발송 시간 관련 필드가 변경되면 nextSendAt 재계산
    let nextSendAt: Date | undefined;
    if (
      input.frequency !== undefined ||
      input.hour !== undefined ||
      input.dayOfWeek !== undefined ||
      input.dayOfMonth !== undefined
    ) {
      const frequency = input.frequency ?? existingSchedule.frequency;
      const hour = input.hour ?? existingSchedule.hour;
      const dayOfWeek =
        input.dayOfWeek ?? existingSchedule.dayOfWeek ?? undefined;
      const dayOfMonth =
        input.dayOfMonth ?? existingSchedule.dayOfMonth ?? undefined;

      nextSendAt = calculateNextSendAt(frequency, hour, dayOfWeek, dayOfMonth);
    }

    await prisma.reportSchedule.update({
      where: { id },
      data: {
        ...(input.reportType && { reportType: input.reportType }),
        ...(input.format && { format: input.format }),
        ...(input.frequency && { frequency: input.frequency }),
        ...(input.dayOfWeek !== undefined && { dayOfWeek: input.dayOfWeek }),
        ...(input.dayOfMonth !== undefined && { dayOfMonth: input.dayOfMonth }),
        ...(input.hour !== undefined && { hour: input.hour }),
        ...(input.timezone && { timezone: input.timezone }),
        ...(input.recipients && { recipients: input.recipients }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(nextSendAt && { nextSendAt }),
      },
    });

    revalidatePath("/settings/reports");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "리포트 일정 수정 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "리포트 일정 수정 중 오류가 발생했습니다",
    };
  }
}
export const updateReportSchedule = withLogging(
  "updateReportSchedule",
  _updateReportSchedule
);

/**
 * 리포트 일정 삭제
 */
async function _deleteReportSchedule(id: string): Promise<ActionState> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const existingSchedule = await prisma.reportSchedule.findFirst({
      where: { id, organizationId },
    });

    if (!existingSchedule) {
      return { success: false, message: "리포트 일정을 찾을 수 없습니다" };
    }

    await prisma.reportSchedule.delete({ where: { id } });

    revalidatePath("/settings/reports");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "리포트 일정 삭제 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "리포트 일정 삭제 중 오류가 발생했습니다",
    };
  }
}
export const deleteReportSchedule = withLogging(
  "deleteReportSchedule",
  _deleteReportSchedule
);
