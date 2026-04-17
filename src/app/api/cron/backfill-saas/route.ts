/**
 * SaaS 매칭 백필 Cron
 *
 * - 미매칭/저신뢰 결제 내역을 LLM으로 재매칭
 * - CardTransaction: matchedAppId가 없는 건만 처리
 * - PaymentRecord: matchedAppId가 없고 상태가 PENDING/UNMATCHED인 건만 처리
 *
 * 사용: Vercel Cron 등에서 GET 호출 (CRON_SECRET 필요, dev에서는 패스)
 */

import { prisma } from "@/lib/db";
import { matchMerchantWithLLM } from "@/lib/services/saas-matcher";
import { PaymentMatchStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const BATCH_LIMIT = 50;

async function processPaymentRecords() {
  const targets = await prisma.paymentRecord.findMany({
    where: {
      matchedAppId: null,
      matchStatus: {
        in: [PaymentMatchStatus.PENDING, PaymentMatchStatus.UNMATCHED],
      },
    },
    orderBy: { createdAt: "desc" },
    take: BATCH_LIMIT,
  });

  let processed = 0;
  let matched = 0;

  for (const record of targets) {
    const llmMatch = await matchMerchantWithLLM({
      organizationId: record.organizationId,
      merchantName: record.merchantName,
      memo: record.memo || null,
      storeBizNo: null,
      amount: Number(record.amount),
      currency: record.currency,
    });

    const data: Record<string, unknown> = {
      matchConfidence: llmMatch?.confidence ?? null,
      matchSource: llmMatch?.matchSource ?? "LLM",
    };

    if (llmMatch?.appId) {
      data.matchedAppId = llmMatch.appId;
      data.matchStatus = PaymentMatchStatus.AUTO_MATCHED;
      matched++;
    } else {
      data.matchStatus = PaymentMatchStatus.UNMATCHED;
    }

    await prisma.paymentRecord.update({
      where: { id: record.id },
      data,
    });

    processed++;
  }

  return { processed, matched };
}

async function processCardTransactions() {
  const targets = await prisma.cardTransaction.findMany({
    where: { matchedAppId: null },
    include: { corporateCard: true },
    orderBy: { createdAt: "desc" },
    take: BATCH_LIMIT,
  });

  let processed = 0;
  let matched = 0;

  for (const tx of targets) {
    const llmMatch = await matchMerchantWithLLM({
      organizationId: tx.organizationId,
      merchantName: tx.useStore,
      memo: tx.useDiv || null,
      storeBizNo: tx.storeBizNo || null,
      amount: Number(tx.useAmt),
      currency: "KRW",
    });

    const data: Record<string, unknown> = {
      matchConfidence: llmMatch?.confidence ?? null,
      matchSource: llmMatch?.matchSource ?? "LLM",
    };

    if (llmMatch?.appId) {
      data.matchedAppId = llmMatch.appId;
      matched++;
    }

    await prisma.cardTransaction.update({
      where: { id: tx.id },
      data,
    });

    processed++;
  }

  return { processed, matched };
}

import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";

export const GET = withCronAuth(
  withLogging("cron:backfill-saas", async (request: NextRequest) => {
    try {
      const [paymentSummary, cardSummary] = await Promise.all([
        processPaymentRecords(),
        processCardTransactions(),
      ]);

      const summary = {
        paymentsProcessed: paymentSummary.processed,
        paymentsMatched: paymentSummary.matched,
        cardsProcessed: cardSummary.processed,
        cardsMatched: cardSummary.matched,
      };

      logger.info({ summary }, "[Cron][backfill-saas] summary");

      return NextResponse.json({ success: true, summary });
    } catch (error) {
      logger.error({ err: error }, "[Cron][backfill-saas] error");
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "unknown error",
        },
        { status: 500 }
      );
    }
  })
);
