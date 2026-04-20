// src/actions/subscriptions/subscription-crud.types.ts
/**
 * Subscription CRUD 관련 타입 및 스키마 정의
 */

import type {
  SubscriptionFilterOptions,
  SubscriptionSortOptions,
} from "@/types/subscription";
import { BillingCycle, BillingType, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

/**
 * 구독 목록 조회 파라미터
 */
export interface GetSubscriptionsParams {
  filter?: SubscriptionFilterOptions;
  sort?: SubscriptionSortOptions;
  page?: number;
  limit?: number;
}

/**
 * 연결된 결제 정보
 */
export interface LinkedPayment {
  id: string;
  transactionDate: Date;
  merchantName: string;
  amount: number;
  currency: string;
  cardLast4: string | null;
}

/**
 * 구독 생성 스키마
 */
export const createSubscriptionSchema = z.object({
  appId: z.string().min(1, "앱을 선택해주세요"),
  billingCycle: z.nativeEnum(BillingCycle, {
    errorMap: () => ({ message: "결제 주기를 선택해주세요" }),
  }),
  billingType: z.nativeEnum(BillingType).default(BillingType.FLAT_RATE),
  amount: z
    .string()
    .min(1, "금액을 입력해주세요")
    .regex(/^\d+(\.\d{1,2})?$/, "유효한 금액을 입력해주세요"),
  currency: z.string().default("KRW"),
  totalLicenses: z.coerce.number().int().positive().nullish(),
  usedLicenses: z.coerce.number().int().min(0).nullish(),
  startDate: z.string().min(1, "시작일을 입력해주세요"),
  endDate: z.string().nullish().or(z.literal("")),
  renewalDate: z.string().nullish().or(z.literal("")),
  autoRenewal: z.coerce.boolean().default(true),
  renewalAlert30: z.coerce.boolean().default(true),
  renewalAlert60: z.coerce.boolean().default(false),
  renewalAlert90: z.coerce.boolean().default(false),
  contractUrl: z
    .string()
    .url("유효한 URL을 입력하세요")
    .nullish()
    .or(z.literal("")),
  notes: z.string().max(1000, "메모는 1000자 이하여야 합니다").nullish(),
  // Team/User 배정 (Phase 2)
  teamId: z.string().nullish(),
  // Team 배정 (다중, Phase 3)
  teamIds: z.array(z.string()).default([]),
  assignedUserIds: z.array(z.string()).default([]),
});

/**
 * 구독 수정 스키마
 */
export const updateSubscriptionSchema = createSubscriptionSchema.extend({
  status: z.nativeEnum(SubscriptionStatus).nullish(),
});

/**
 * Next.js redirect 에러 체크 유틸리티
 */
export function isRedirectError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.includes("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.includes("NEXT_NOT_FOUND"))
  );
}
