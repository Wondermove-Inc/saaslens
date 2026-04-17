"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { parsePaymentCSV } from "@/lib/payment-csv";
import {
  type AppMatch,
  type CatalogWithPatterns,
} from "@/lib/services/payment/merchant-matcher";
import { normalizeMerchantName } from "@/lib/services/payment/merchant-matcher.utils";
import { processPaymentRecords } from "@/lib/services/payment/process-payment-records";
import {
  completeSyncHistory,
  createSyncHistory,
} from "@/lib/services/payment/sync-history-service";
import { checkNonSaaSCache } from "@/lib/services/saas-matcher";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export interface PaymentImportResult {
  imported: number;
  matched: number;
  unmatched: number;
  duplicates: number;
  batchId: string;
  errors?: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * 결제 CSV 가져오기 옵션 (SMP-78)
 * - teamId와 userId는 상호 배타적 (둘 중 하나만 선택 가능)
 */
export interface PaymentImportOptions {
  teamId?: string;
  userId?: string;
  fileName?: string;
}

/**
 * 결제 CSV 가져오기
 */
async function _importPaymentCSV(
  csvContent: string,
  options?: PaymentImportOptions
): Promise<ActionState<PaymentImportResult>> {
  // syncHistoryId는 에러 핸들러에서도 접근 가능해야 하므로 외부에 선언
  let syncHistoryId: string | undefined;

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

    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "관리자만 결제 내역을 가져올 수 있습니다",
      };
    }

    // SMP-78: Team/User 배정 검증
    const { teamId, userId, fileName } = options || {};

    // SyncHistory 생성 (보조 기능, 실패해도 메인 흐름에 영향 없음)
    try {
      const syncHistory = await createSyncHistory({
        organizationId: session.user.organizationId,
        type: "CSV_IMPORT",
        triggeredBy: "USER",
        userId: session.user.id,
        fileName,
      });
      syncHistoryId = syncHistory.id;
    } catch (syncHistoryError) {
      logger.warn({ err: syncHistoryError }, "SyncHistory 생성 실패 (무시)");
    }

    // 상호 배타 검증: teamId와 userId 둘 다 있으면 에러
    if (teamId && userId) {
      return {
        success: false,
        message: "팀 배정과 유저 배정 중 하나만 선택할 수 있습니다",
      };
    }

    // teamId 유효성 검증
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          organizationId: session.user.organizationId,
        },
      });
      if (!team) {
        return {
          success: false,
          message: "유효하지 않은 팀입니다",
        };
      }
    }

    // userId 유효성 검증
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: session.user.organizationId,
        },
      });
      if (!user) {
        return {
          success: false,
          message: "유효하지 않은 사용자입니다",
        };
      }
    }

    // CSV 파싱
    const parseResult = parsePaymentCSV(csvContent);

    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        message: parseResult.error || "CSV 파싱에 실패했습니다",
      };
    }

    if (parseResult.data.length === 0) {
      return {
        success: false,
        message: "가져올 결제 내역이 없습니다",
      };
    }

    // 매칭을 위한 앱 및 카탈로그 데이터 조회
    const [apps, catalogs, customPatterns] = await Promise.all([
      prisma.app.findMany({
        where: { organizationId: session.user.organizationId },
        select: { id: true, name: true, catalogId: true },
      }),
      prisma.saaSCatalog.findMany({
        include: {
          patterns: {
            select: { pattern: true, matchType: true, confidence: true },
          },
        },
      }),
      prisma.merchantPattern.findMany({
        where: {
          organizationId: session.user.organizationId,
          isActive: true,
        },
        orderBy: { priority: "desc" },
      }),
    ]);

    const appMatches: AppMatch[] = apps.map(
      (app: { id: string; name: string; catalogId: string | null }) => ({
        id: app.id,
        name: app.name,
        catalogId: app.catalogId,
      })
    );

    const catalogsWithPatterns: CatalogWithPatterns[] = catalogs.map(
      (cat: {
        id: string;
        name: string;
        slug: string;
        patterns: Array<{
          pattern: string;
          matchType: string;
          confidence: number;
        }>;
      }) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        patterns: cat.patterns.map(
          (p: { pattern: string; matchType: string; confidence: number }) => ({
            pattern: p.pattern,
            matchType: p.matchType as
              | "EXACT"
              | "DOMAIN"
              | "SUBDOMAIN"
              | "REGEX",
            confidence: p.confidence,
          })
        ),
      })
    );

    // 배치 ID 생성
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 승인번호 기준 중복 검사
    const approvalNumbers = parseResult.data
      .map((row) => row.approvalNumber)
      .filter((num): num is string => !!num);

    const existingApprovals = await prisma.paymentRecord.findMany({
      where: {
        organizationId: session.user.organizationId,
        approvalNumber: { in: approvalNumbers },
      },
      select: { approvalNumber: true },
    });

    const existingSet = new Set(
      existingApprovals.map((r) => r.approvalNumber).filter(Boolean)
    );

    // 중복 제외한 데이터만 처리
    const newRows = parseResult.data.filter(
      (row) => !row.approvalNumber || !existingSet.has(row.approvalNumber)
    );
    const duplicateCount = parseResult.data.length - newRows.length;

    if (newRows.length === 0) {
      return {
        success: true,
        message: `모든 결제 내역이 이미 등록되어 있습니다 (중복 ${duplicateCount}건)`,
        data: {
          imported: 0,
          matched: 0,
          unmatched: 0,
          duplicates: duplicateCount,
          batchId,
        },
      };
    }

    // Non-SaaS 캐시 조회 (LLM 호출 최적화)
    const normalizedNames = newRows.map((r) =>
      normalizeMerchantName(r.merchantName)
    );
    const nonSaaSSet = await checkNonSaaSCache(
      session.user.organizationId,
      normalizedNames
    );

    // 결제 내역 처리 및 매칭 (공용 함수 사용)
    const { paymentRecords, matchedCount } = await processPaymentRecords({
      newRows,
      appMatches,
      catalogsWithPatterns,
      customPatterns,
      organizationId: session.user.organizationId!,
      teamId: teamId || undefined,
      userId: userId || undefined,
      nonSaaSSet,
      batchId,
    });

    // DB에 저장
    const result = await prisma.paymentRecord.createMany({
      data: paymentRecords as never[],
    });

    revalidatePath("/payments");

    const message =
      duplicateCount > 0
        ? `${result.count}개의 결제 내역을 가져왔습니다 (중복 ${duplicateCount}건 제외)`
        : `${result.count}개의 결제 내역을 가져왔습니다`;

    // SyncHistory 완료 처리 (보조 기능)
    try {
      if (syncHistoryId) {
        await completeSyncHistory(syncHistoryId, {
          status: "SUCCESS",
          totalRecords: result.count,
          successCount: result.count,
          failedCount: 0,
          matchedCount,
          unmatchedCount: result.count - matchedCount,
        });
      }
    } catch (syncHistoryError) {
      logger.warn(
        { err: syncHistoryError },
        "SyncHistory 완료 처리 실패 (무시)"
      );
    }

    return {
      success: true,
      message,
      data: {
        imported: result.count,
        matched: matchedCount,
        unmatched: result.count - matchedCount,
        duplicates: duplicateCount,
        batchId,
        errors: parseResult.errors?.map((e) => ({
          row: e.row,
          message: e.message,
        })),
      },
    };
  } catch (error) {
    logger.error({ err: error }, "결제 내역 가져오기 오류");

    // SyncHistory 실패 처리 (보조 기능)
    try {
      if (syncHistoryId) {
        await completeSyncHistory(syncHistoryId, {
          status: "FAILED",
          totalRecords: 0,
          successCount: 0,
          failedCount: 0,
          matchedCount: 0,
          unmatchedCount: 0,
          errorMessage:
            error instanceof Error ? error.message : "알 수 없는 오류",
        });
      }
    } catch (syncHistoryError) {
      logger.warn(
        { err: syncHistoryError },
        "SyncHistory 실패 처리 오류 (무시)"
      );
    }

    return {
      success: false,
      message: "결제 내역 가져오기 중 오류가 발생했습니다",
    };
  }
}
export const importPaymentCSV = withLogging(
  "importPaymentCSV",
  _importPaymentCSV
);
