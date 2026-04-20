"use server";

import { getCachedSession } from "@/lib/auth/require-auth";
import {
  rematchRecords,
  type RematchResult,
} from "@/lib/services/payment/rematch-service";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * 결제 레코드(PaymentRecord) 재매칭 Server Action
 * UNMATCHED/PENDING 항목을 rematch-service를 통해 재매칭합니다.
 */
export async function rematchPaymentRecords(
  recordIds: string[]
): Promise<ActionState<RematchResult>> {
  try {
    const session = await getCachedSession();

    if (!session?.user) {
      return { success: false, error: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, error: "조직 정보가 필요합니다" };
    }

    const result = await rematchRecords({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      recordType: "payment",
      recordIds,
    });

    revalidatePath("/payments");
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "재매칭에 실패했습니다";
    return { success: false, error: message };
  }
}

/**
 * 카드 거래내역(CardTransaction) 재매칭 Server Action
 * UNMATCHED/PENDING 항목을 rematch-service를 통해 재매칭합니다.
 */
export async function rematchCardTransactions(
  transactionIds: string[]
): Promise<ActionState<RematchResult>> {
  try {
    const session = await getCachedSession();

    if (!session?.user) {
      return { success: false, error: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, error: "조직 정보가 필요합니다" };
    }

    const result = await rematchRecords({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      recordType: "card-transaction",
      recordIds: transactionIds,
    });

    revalidatePath("/payments");
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "재매칭에 실패했습니다";
    return { success: false, error: message };
  }
}
