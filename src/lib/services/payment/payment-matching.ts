// src/lib/services/payment/payment-matching.ts
import { prisma } from "@/lib/db";
import {
  calculateMatchConfidence,
  normalizeMerchantName,
} from "./merchant-matcher.utils";

/**
 * Default confidence threshold for auto-matching
 */
export const DEFAULT_MATCH_THRESHOLD = 0.7;

/**
 * Maximum number of records to scan in a single call
 */
export const MAX_SCAN_LIMIT = 1000;

/**
 * Result of payment matching operation
 */
export interface MatchPaymentsResult {
  /** Number of records successfully matched */
  matchedCount: number;
  /** Total number of unmatched records scanned */
  totalScanned: number;
  /** Number of PaymentRecords matched (optional) */
  paymentRecordsMatched?: number;
  /** Number of CardTransactions matched (optional) */
  cardTransactionsMatched?: number;
  /** Any errors encountered during matching (non-fatal) */
  errors?: string[];
}

/**
 * Matches unmatched PaymentRecords and CardTransactions to a newly created app.
 *
 * Uses existing 4-Layer matching engine to calculate confidence scores.
 * Only records with confidence >= threshold are matched.
 *
 * @param appId - The ID of the newly created app
 * @param appName - The name of the app (used for matching)
 * @param organizationId - The organization ID to scope the search
 * @param threshold - Minimum confidence score for matching (default: 0.7)
 * @returns Promise<MatchPaymentsResult>
 *
 * @example
 * const result = await matchPaymentsToNewApp(
 *   'app-123',
 *   'Datadog',
 *   'org-456',
 *   0.7
 * );
 * // result: { matchedCount: 5, totalScanned: 100, paymentRecordsMatched: 3, cardTransactionsMatched: 2 }
 */
export async function matchPaymentsToNewApp(
  appId: string,
  appName: string,
  organizationId: string,
  threshold: number = DEFAULT_MATCH_THRESHOLD
): Promise<MatchPaymentsResult> {
  const normalizedAppName = normalizeMerchantName(appName);
  const errors: string[] = [];

  // 1. Query unmatched PaymentRecords
  const unmatchedPaymentRecords = await prisma.paymentRecord.findMany({
    where: {
      organizationId,
      matchedAppId: null,
    },
    select: {
      id: true,
      merchantName: true,
    },
    take: MAX_SCAN_LIMIT,
  });

  // 2. Query unmatched CardTransactions
  const unmatchedCardTransactions = await prisma.cardTransaction.findMany({
    where: {
      organizationId,
      matchedAppId: null,
    },
    select: {
      id: true,
      useStore: true,
    },
    take: MAX_SCAN_LIMIT,
  });

  const totalScanned =
    unmatchedPaymentRecords.length + unmatchedCardTransactions.length;

  if (totalScanned === 0) {
    return { matchedCount: 0, totalScanned: 0 };
  }

  // 3. Calculate confidence for PaymentRecords
  const paymentRecordsToUpdate: Array<{ id: string; confidence: number }> = [];

  for (const record of unmatchedPaymentRecords) {
    const confidence = calculateMatchConfidence(
      record.merchantName,
      normalizedAppName
    );

    if (confidence >= threshold) {
      paymentRecordsToUpdate.push({ id: record.id, confidence });
    }
  }

  // 4. Calculate confidence for CardTransactions
  const cardTransactionsToUpdate: Array<{ id: string; confidence: number }> =
    [];

  for (const transaction of unmatchedCardTransactions) {
    const confidence = calculateMatchConfidence(
      transaction.useStore,
      normalizedAppName
    );

    if (confidence >= threshold) {
      cardTransactionsToUpdate.push({ id: transaction.id, confidence });
    }
  }

  // 5. Update matching PaymentRecords
  let paymentRecordsMatched = 0;

  if (paymentRecordsToUpdate.length > 0) {
    const updatePromises = paymentRecordsToUpdate.map(async (record) => {
      try {
        await prisma.paymentRecord.update({
          where: { id: record.id },
          data: {
            matchedAppId: appId,
            matchConfidence: record.confidence,
            matchSource: "PATTERN",
            matchStatus: "AUTO_MATCHED",
          },
        });
        paymentRecordsMatched++;
      } catch (error) {
        errors.push(
          `Failed to update PaymentRecord ${record.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });

    await Promise.all(updatePromises);
  }

  // 6. Update matching CardTransactions
  let cardTransactionsMatched = 0;

  if (cardTransactionsToUpdate.length > 0) {
    const updatePromises = cardTransactionsToUpdate.map(async (transaction) => {
      try {
        await prisma.cardTransaction.update({
          where: { id: transaction.id },
          data: {
            matchedAppId: appId,
            matchConfidence: transaction.confidence,
            matchSource: "PATTERN",
            matchStatus: "AUTO_MATCHED",
          },
        });
        cardTransactionsMatched++;
      } catch (error) {
        errors.push(
          `Failed to update CardTransaction ${transaction.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });

    await Promise.all(updatePromises);
  }

  const matchedCount = paymentRecordsMatched + cardTransactionsMatched;

  return {
    matchedCount,
    totalScanned,
    paymentRecordsMatched,
    cardTransactionsMatched,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
