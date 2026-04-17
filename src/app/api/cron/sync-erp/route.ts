// src/app/api/cron/sync-erp/route.ts
// DA-99: ERP 결제 데이터 CRON 동기화

import { decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withCronAuth } from "@/lib/middleware";
import {
  getERPAdapter,
  isERPIntegrationType,
  type ERPCredentials,
} from "@/lib/services/erp";
import { NextResponse } from "next/server";

const MAX_DURATION_MS = 55_000; // Platform timeout guard (e.g. Vercel/Railway 60s)

export const GET = withCronAuth(async () => {
  const startTime = Date.now();
  logger.info("[sync-erp] CRON 시작");

  // 활성 ERP 연동 조회
  const integrations = await prisma.integration.findMany({
    where: {
      type: { in: ["SAP_S4HANA", "ORACLE_ERP_CLOUD"] },
      status: "ACTIVE",
    },
  });

  if (integrations.length === 0) {
    logger.info("[sync-erp] 활성 ERP 연동 없음");
    return NextResponse.json({
      message: "No active ERP integrations",
      synced: 0,
    });
  }

  const results: Array<{
    integrationId: string;
    type: string;
    success: boolean;
    itemCount: number;
    error?: string;
  }> = [];

  for (const integration of integrations) {
    // 타임아웃 가드
    if (Date.now() - startTime > MAX_DURATION_MS) {
      logger.warn("[sync-erp] 시간 초과, 나머지 연동 스킵");
      break;
    }

    if (!isERPIntegrationType(integration.type)) continue;

    const adapter = getERPAdapter(integration.type);
    if (!adapter) continue;

    const syncStartTime = new Date();

    try {
      // 크리덴셜 복호화
      const creds = integration.credentials as { encrypted?: string };
      if (!creds?.encrypted) {
        logger.warn(`[sync-erp] ${integration.id}: 암호화된 크리덴셜 없음`);
        results.push({
          integrationId: integration.id,
          type: integration.type,
          success: false,
          itemCount: 0,
          error: "암호화된 크리덴셜 없음",
        });
        continue;
      }

      const erpCredentials = decryptJson<ERPCredentials>(creds.encrypted);

      // 최근 7일 데이터 동기화 (CRON은 매일 실행 전제)
      const now = new Date();
      const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const syncResult = await adapter.fetchPayments(erpCredentials, {
        fromDate,
        toDate: now,
      });

      // PaymentRecord batch 생성 (중복 사전 필터링)
      let created = 0;
      if (syncResult.success && syncResult.items.length > 0) {
        const organizationId = integration.organizationId;
        const batchId = `erp-sync-${integration.id}-${now.toISOString().split("T")[0]}`;

        // 1. documentNumber가 있는 항목들의 중복을 batch로 체크
        const docNumbers = syncResult.items
          .map((item) => item.documentNumber)
          .filter((dn): dn is string => !!dn);

        const existingDocs = new Set<string>();
        if (docNumbers.length > 0) {
          const existingRecords = await prisma.paymentRecord.findMany({
            where: {
              organizationId,
              importBatchId: { startsWith: "erp-sync-" },
              rawData: {
                path: ["documentNumber"],
                string_contains: "", // non-null check
              },
            },
            select: { rawData: true },
          });
          for (const record of existingRecords) {
            const dn = (record.rawData as Record<string, unknown>)
              ?.documentNumber;
            if (typeof dn === "string") existingDocs.add(dn);
          }
        }

        // 2. 중복 제외한 신규 항목만 필터링
        const newItems = syncResult.items.filter(
          (item) =>
            !item.documentNumber || !existingDocs.has(item.documentNumber)
        );

        // 3. createMany로 batch insert
        if (newItems.length > 0) {
          await prisma.paymentRecord.createMany({
            data: newItems.map((item) => ({
              organizationId,
              transactionDate: item.transactionDate,
              merchantName: item.merchantName,
              amount: item.amount,
              currency: item.currency,
              category: item.category,
              memo: item.memo,
              matchStatus: "PENDING" as const,
              importBatchId: batchId,
              rawData: item.rawData as object,
            })),
          });
          created = newItems.length;
        }
      }

      // SyncLog 기록
      await prisma.syncLog.create({
        data: {
          integrationId: integration.id,
          status: syncResult.success ? "SUCCESS" : "FAILED",
          itemsFound: syncResult.totalCount,
          itemsCreated: created,
          itemsUpdated: 0,
          errors: syncResult.errorMessage
            ? ([{ message: syncResult.errorMessage }] as object[])
            : [],
          startedAt: syncStartTime,
          completedAt: new Date(),
        },
      });

      // Integration 상태 업데이트
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          status: syncResult.success ? "ACTIVE" : "ERROR",
          lastError: syncResult.errorMessage || null,
        },
      });

      results.push({
        integrationId: integration.id,
        type: integration.type,
        success: syncResult.success,
        itemCount: created,
        error: syncResult.errorMessage,
      });

      logger.info(
        `[sync-erp] ${integration.type} 동기화 완료: ${created}건 생성`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      logger.error({ err: error }, `[sync-erp] ${integration.id} 동기화 실패`);

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          status: "ERROR",
          lastError: errorMessage,
        },
      });

      results.push({
        integrationId: integration.id,
        type: integration.type,
        success: false,
        itemCount: 0,
        error: errorMessage,
      });
    }

    // 연동 간 500ms 딜레이 (Rate limit 방지)
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const totalCreated = results.reduce((sum, r) => sum + r.itemCount, 0);
  logger.info(
    `[sync-erp] CRON 완료: ${results.length}개 연동, ${totalCreated}건 생성`
  );

  return NextResponse.json({
    message: "ERP sync completed",
    synced: results.length,
    totalCreated,
    results,
  });
});
