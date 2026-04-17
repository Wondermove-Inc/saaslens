// src/app/api/v1/payments/import-stream/route.ts
/**
 * 결제 CSV 업로드 SSE 스트리밍 API
 * - 각 레코드 처리 시마다 프로그레스 이벤트를 SSE로 전송
 * - 클라이언트는 EventSource 또는 fetch + ReadableStream으로 수신
 */

import type { PaymentImportResult } from "@/actions/payments/payment-import";
import { withApiAuth } from "@/lib/api/auth-middleware";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parsePaymentCSV } from "@/lib/payment-csv";
import {
  type AppMatch,
  type CatalogWithPatterns,
} from "@/lib/services/payment/merchant-matcher";
import { normalizeMerchantName } from "@/lib/services/payment/merchant-matcher.utils";
import { processPaymentRecords } from "@/lib/services/payment/process-payment-records";
import { checkNonSaaSCache } from "@/lib/services/saas-matcher";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// SSE 이벤트 타입
type SseEvent =
  | { type: "start"; total: number }
  | {
      type: "processing";
      index: number;
      total: number;
      merchantName: string;
      amount: number;
    }
  | { type: "saving" }
  | { type: "complete"; result: PaymentImportResult }
  | { type: "error"; message: string };

function formatSse(event: SseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { organizationId } = session.user;

    // 요청 바디 파싱
    let csvContent: string;
    let teamId: string | undefined;
    let userId: string | undefined;

    try {
      const body = await request.json();
      csvContent = body.csvContent;
      teamId = body.teamId || undefined;
      userId = body.userId || undefined;
    } catch {
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    if (!csvContent) {
      return NextResponse.json(
        { error: "CSV 내용이 필요합니다" },
        { status: 400 }
      );
    }

    // 상호 배타 검증
    if (teamId && userId) {
      return NextResponse.json(
        { error: "팀 배정과 유저 배정 중 하나만 선택할 수 있습니다" },
        { status: 400 }
      );
    }

    // teamId 유효성 검증
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: { id: teamId, organizationId },
      });
      if (!team) {
        return NextResponse.json(
          { error: "유효하지 않은 팀입니다" },
          { status: 400 }
        );
      }
    }

    // userId 유효성 검증
    if (userId) {
      const user = await prisma.user.findFirst({
        where: { id: userId, organizationId },
      });
      if (!user) {
        return NextResponse.json(
          { error: "유효하지 않은 사용자입니다" },
          { status: 400 }
        );
      }
    }

    // CSV 파싱
    const parseResult = parsePaymentCSV(csvContent);
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { error: parseResult.error || "CSV 파싱에 실패했습니다" },
        { status: 400 }
      );
    }
    if (parseResult.data.length === 0) {
      return NextResponse.json(
        { error: "가져올 결제 내역이 없습니다" },
        { status: 400 }
      );
    }

    // SSE 스트림 시작
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: SseEvent) => {
          controller.enqueue(new TextEncoder().encode(formatSse(event)));
        };

        try {
          // 매칭 데이터 조회
          const [apps, catalogs, customPatterns] = await Promise.all([
            prisma.app.findMany({
              where: { organizationId },
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
              where: { organizationId, isActive: true },
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
                (p: {
                  pattern: string;
                  matchType: string;
                  confidence: number;
                }) => ({
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

          // 중복 검사
          const approvalNumbers = parseResult
            .data!.map((row) => row.approvalNumber)
            .filter((num): num is string => !!num);

          const existingApprovals = await prisma.paymentRecord.findMany({
            where: {
              organizationId,
              approvalNumber: { in: approvalNumbers },
            },
            select: { approvalNumber: true },
          });

          const existingSet = new Set(
            existingApprovals.map((r) => r.approvalNumber).filter(Boolean)
          );

          const newRows = parseResult.data!.filter(
            (row) => !row.approvalNumber || !existingSet.has(row.approvalNumber)
          );
          const duplicateCount = parseResult.data!.length - newRows.length;

          if (newRows.length === 0) {
            send({
              type: "complete",
              result: {
                imported: 0,
                matched: 0,
                unmatched: 0,
                duplicates: duplicateCount,
                batchId,
              },
            });
            controller.close();
            return;
          }

          // Non-SaaS 캐시 조회
          const normalizedNames = newRows.map((r) =>
            normalizeMerchantName(r.merchantName)
          );
          const nonSaaSSet = await checkNonSaaSCache(
            organizationId,
            normalizedNames
          );

          // start 이벤트 전송
          send({ type: "start", total: newRows.length });

          // 레코드 처리 (onProgress로 SSE 이벤트 전송)
          const { paymentRecords, matchedCount } = await processPaymentRecords({
            newRows,
            appMatches,
            catalogsWithPatterns,
            customPatterns,
            organizationId,
            teamId,
            userId,
            nonSaaSSet,
            batchId,
            onProgress: ({ index, total, merchantName, amount }) => {
              send({ type: "processing", index, total, merchantName, amount });
            },
          });

          // saving 이벤트 전송
          send({ type: "saving" });

          // DB에 저장
          const dbResult = await prisma.paymentRecord.createMany({
            data: paymentRecords as never[],
          });

          revalidatePath("/payments");

          // complete 이벤트 전송
          send({
            type: "complete",
            result: {
              imported: dbResult.count,
              matched: matchedCount,
              unmatched: dbResult.count - matchedCount,
              duplicates: duplicateCount,
              batchId,
              errors: parseResult.errors?.map((e) => ({
                row: e.row,
                message: e.message,
              })),
            },
          });
        } catch (error) {
          logger.error({ err: error }, "결제 CSV 스트리밍 오류");
          send({
            type: "error",
            message: "결제 내역 가져오기 중 오류가 발생했습니다",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
  { allowRoles: ["ADMIN"] }
);
