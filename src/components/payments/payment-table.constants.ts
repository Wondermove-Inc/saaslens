// src/components/payments/payment-table.constants.ts
import type { PaymentMatchStatus } from "@prisma/client";
import { useTranslations } from "next-intl";

export function getStatusLabels(
  t: ReturnType<typeof useTranslations>
): Record<PaymentMatchStatus, string> {
  return {
    PENDING: t("payments.status.pending"),
    AUTO_MATCHED: t("payments.status.autoMatched"),
    MANUAL: t("payments.status.manual"),
    UNMATCHED: t("payments.status.unmatched"),
  };
}

export const STATUS_COLORS: Record<PaymentMatchStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  AUTO_MATCHED: "bg-blue-100 text-blue-800",
  MANUAL: "bg-purple-100 text-purple-800",
  UNMATCHED: "bg-gray-100 text-gray-800",
};

// 컬럼 가시성 드롭다운에서 사용할 컬럼 정의 (외부 노출용)
export function getPaymentRecordColumns(t: ReturnType<typeof useTranslations>) {
  return [
    { id: "source", header: t("payments.table.columns.source") },
    {
      id: "transactionDate",
      header: t("payments.table.columns.transactionDate"),
    },
    { id: "merchantName", header: t("payments.table.columns.merchantName") },
    { id: "amount", header: t("payments.table.columns.amount") },
    { id: "matchStatus", header: t("payments.table.columns.matchStatus") },
    { id: "matchedApp", header: t("payments.table.columns.matchedApp") },
    {
      id: "linkedSubscription",
      header: t("payments.table.columns.linkedSubscription"),
    },
  ];
}

export function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: currency || "KRW",
  }).format(amount);
}

export function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
