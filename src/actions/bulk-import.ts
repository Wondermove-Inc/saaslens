// src/actions/bulk-import.ts
"use server";

import { auth } from "@/lib/auth";
import {
  parseCSV,
  validateAppCSV,
  validateSubscriptionCSV,
  validateUserCSV,
  type ValidationError,
} from "@/lib/csv";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type { BillingCycle, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface BulkImportResult {
  created: number;
  errors: ValidationError[];
}

// 앱 일괄 등록
async function _bulkImportApps(
  csvContent: string
): Promise<ActionState<BulkImportResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    // 관리자 권한 확인
    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 일괄 등록할 수 있습니다",
      };
    }

    // CSV 파싱
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return {
        success: false,
        message: "등록할 데이터가 없습니다",
      };
    }

    // 유효성 검증
    const { valid, errors } = validateAppCSV(rows);

    if (errors.length > 0 && valid.length === 0) {
      return {
        success: false,
        message: "유효한 데이터가 없습니다",
        data: { created: 0, errors },
      };
    }

    // 앱 생성
    const result = await prisma.app.createMany({
      data: valid.map((row) => ({
        name: row.name,
        category: row.category,
        customWebsite: row.website || null,
        notes: row.vendor
          ? `${row.vendor}${row.description ? ` - ${row.description}` : ""}`
          : row.description || null,
        organizationId: session.user.organizationId!,
        ownerId: session.user.id,
        source: "CSV_IMPORT",
        status: "ACTIVE",
      })),
      skipDuplicates: true,
    });

    revalidatePath("/apps");

    return {
      success: true,
      message: `${result.count}개의 앱이 등록되었습니다`,
      data: { created: result.count, errors },
    };
  } catch (error) {
    logger.error({ err: error }, "앱 일괄 등록 오류");
    return {
      success: false,
      message: "앱 일괄 등록 중 오류가 발생했습니다",
    };
  }
}
export const bulkImportApps = withLogging("bulkImportApps", _bulkImportApps);

// 구독 일괄 등록
async function _bulkImportSubscriptions(
  csvContent: string
): Promise<ActionState<BulkImportResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    // 관리자 권한 확인
    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 일괄 등록할 수 있습니다",
      };
    }

    // CSV 파싱
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return {
        success: false,
        message: "등록할 데이터가 없습니다",
      };
    }

    // 유효성 검증
    const { valid, errors } = validateSubscriptionCSV(rows);

    if (errors.length > 0 && valid.length === 0) {
      return {
        success: false,
        message: "유효한 데이터가 없습니다",
        data: { created: 0, errors },
      };
    }

    // 앱 이름으로 앱 ID 조회
    const appNames = [...new Set(valid.map((row) => row.appName))];
    const apps = await prisma.app.findMany({
      where: {
        organizationId: session.user.organizationId,
        name: { in: appNames },
      },
      select: { id: true, name: true },
    });

    const appNameToId = new Map(apps.map((app) => [app.name, app.id]));

    // 존재하지 않는 앱 확인
    const subscriptionData: Array<{
      appId: string;
      billingCycle: BillingCycle;
      amount: number;
      renewalDate: Date | null;
      startDate: Date;
      totalLicenses: number | null;
      notes: string | null;
      organizationId: string;
    }> = [];
    const notFoundErrors: ValidationError[] = [];

    valid.forEach((row, index) => {
      const appId = appNameToId.get(row.appName);
      if (!appId) {
        notFoundErrors.push({
          row: index + 1,
          field: "appName",
          message: `${index + 1}행: 앱 "${row.appName}"을(를) 찾을 수 없습니다`,
        });
        return;
      }

      subscriptionData.push({
        appId,
        billingCycle: row.billingCycle as BillingCycle,
        amount: row.price ? parseFloat(row.price) : 0,
        renewalDate: row.renewalDate ? new Date(row.renewalDate) : null,
        startDate: new Date(),
        totalLicenses: row.seats ? parseInt(row.seats, 10) : null,
        notes: row.planName ? `플랜: ${row.planName}` : null,
        organizationId: session.user.organizationId!,
      });
    });

    const allErrors = [...errors, ...notFoundErrors];

    if (subscriptionData.length === 0) {
      return {
        success: false,
        message: "등록할 유효한 구독이 없습니다",
        data: { created: 0, errors: allErrors },
      };
    }

    // 구독 생성
    const result = await prisma.subscription.createMany({
      data: subscriptionData,
      skipDuplicates: true,
    });

    revalidatePath("/subscriptions");

    return {
      success: true,
      message: `${result.count}개의 구독이 등록되었습니다`,
      data: { created: result.count, errors: allErrors },
    };
  } catch (error) {
    logger.error({ err: error }, "구독 일괄 등록 오류");
    return {
      success: false,
      message: "구독 일괄 등록 중 오류가 발생했습니다",
    };
  }
}
export const bulkImportSubscriptions = withLogging(
  "bulkImportSubscriptions",
  _bulkImportSubscriptions
);

// 사용자 일괄 등록
async function _bulkImportUsers(
  csvContent: string
): Promise<ActionState<BulkImportResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    // 관리자 권한 확인
    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 일괄 등록할 수 있습니다",
      };
    }

    // CSV 파싱
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return {
        success: false,
        message: "등록할 데이터가 없습니다",
      };
    }

    // 유효성 검증
    const { valid, errors } = validateUserCSV(rows);

    if (errors.length > 0 && valid.length === 0) {
      return {
        success: false,
        message: "유효한 데이터가 없습니다",
        data: { created: 0, errors },
      };
    }

    // 기존 사용자 이메일 조회
    const emails = valid.map((row) => row.email);
    const existingUsers = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        email: { in: emails },
      },
      select: { email: true },
    });

    const existingEmails = new Set(existingUsers.map((u) => u.email));

    // 중복 사용자 필터링
    const newUsers = valid.filter((row) => !existingEmails.has(row.email));
    const duplicateErrors: ValidationError[] = valid
      .filter((row) => existingEmails.has(row.email))
      .map((row, index) => ({
        row: index + 1,
        field: "email",
        message: `이미 존재하는 사용자입니다: ${row.email}`,
      }));

    const allErrors = [...errors, ...duplicateErrors];

    if (newUsers.length === 0) {
      return {
        success: allErrors.length === 0,
        message:
          allErrors.length === 0
            ? "등록할 새 사용자가 없습니다"
            : "유효한 새 사용자가 없습니다",
        data: { created: 0, errors: allErrors },
      };
    }

    // 사용자 생성
    const result = await prisma.user.createMany({
      data: newUsers.map((row) => ({
        email: row.email,
        name: row.name || null,
        role: row.role as UserRole,
        department: row.department || null,
        jobTitle: row.jobTitle || null,
        employeeId: row.employeeId || null,
        organizationId: session.user.organizationId!,
        status: "ACTIVE",
      })),
      skipDuplicates: true,
    });

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        action: "BULK_IMPORT_USERS",
        entityType: "User",
        entityId: session.user.organizationId!,
        userId: session.user.id,
        organizationId: session.user.organizationId!,
        metadata: {
          totalRows: valid.length,
          createdCount: result.count,
          errorCount: allErrors.length,
          importedEmails: newUsers.map((u) => u.email),
        },
      },
    });

    revalidatePath("/users");
    revalidatePath("/settings/team");

    return {
      success: true,
      message: `${result.count}명의 사용자가 등록되었습니다`,
      data: { created: result.count, errors: allErrors },
    };
  } catch (error) {
    logger.error({ err: error }, "사용자 일괄 등록 오류");
    return {
      success: false,
      message: "사용자 일괄 등록 중 오류가 발생했습니다",
    };
  }
}
export const bulkImportUsers = withLogging("bulkImportUsers", _bulkImportUsers);

export interface ChunkImportResult {
  processed: number;
  skipped: number;
  errors: string[];
}

// 사용자 CSV 청크 등록 (진행률 업로드용)
async function _importUsersChunk(
  csvChunk: string
): Promise<ActionState<ChunkImportResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    if (session.user.role !== "ADMIN") {
      return { success: false, message: "관리자만 일괄 등록할 수 있습니다" };
    }

    const rows = parseCSV(csvChunk);

    if (rows.length === 0) {
      return {
        success: true,
        message: "처리할 데이터 없음",
        data: { processed: 0, skipped: 0, errors: [] },
      };
    }

    const { valid, errors } = validateUserCSV(rows);
    const errorMessages = errors.map((e) => e.message);

    if (valid.length === 0) {
      return {
        success: true,
        message: "유효한 데이터 없음",
        data: { processed: 0, skipped: 0, errors: errorMessages },
      };
    }

    // 기존 사용자 이메일 조회 (중복 skip 처리)
    const emails = valid.map((row) => row.email);
    const existingUsers = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        email: { in: emails },
      },
      select: { email: true },
    });

    const existingEmails = new Set(existingUsers.map((u) => u.email));
    const newUsers = valid.filter((row) => !existingEmails.has(row.email));
    const skipped = valid.length - newUsers.length;

    if (newUsers.length === 0) {
      return {
        success: true,
        message: "모두 중복 skip",
        data: { processed: 0, skipped, errors: errorMessages },
      };
    }

    const result = await prisma.user.createMany({
      data: newUsers.map((row) => ({
        email: row.email,
        name: row.name || null,
        role: row.role as UserRole,
        department: row.department || null,
        jobTitle: row.jobTitle || null,
        employeeId: row.employeeId || null,
        organizationId: session.user.organizationId!,
        status: "ACTIVE",
      })),
      skipDuplicates: true,
    });

    revalidatePath("/users");
    revalidatePath("/settings/team");

    return {
      success: true,
      message: `${result.count}명 등록 완료`,
      data: { processed: result.count, skipped, errors: errorMessages },
    };
  } catch (error) {
    logger.error({ err: error }, "사용자 청크 등록 오류");
    return {
      success: false,
      message: "청크 처리 중 오류가 발생했습니다",
    };
  }
}
export const importUsersChunk = withLogging(
  "importUsersChunk",
  _importUsersChunk
);
