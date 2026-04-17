import { BillingCycle, BillingType, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

export function createSubscriptionFormSchema(t: (key: string) => string) {
  return z.object({
    appId: z.string().min(1, t("subscriptions.form.validation.appRequired")),
    billingCycle: z.nativeEnum(BillingCycle, {
      errorMap: () => ({
        message: t("subscriptions.form.validation.billingCycleRequired"),
      }),
    }),
    billingType: z.nativeEnum(BillingType).default(BillingType.FLAT_RATE),
    amount: z
      .string()
      .min(1, t("subscriptions.form.validation.amountRequired"))
      .regex(
        /^\d+(\.\d{1,2})?$/,
        t("subscriptions.form.validation.amountInvalid")
      ),
    currency: z.string().default("KRW"),
    totalLicenses: z.coerce.number().int().positive().nullish(),
    usedLicenses: z.coerce.number().int().min(0).nullish(),
    startDate: z
      .string()
      .min(1, t("subscriptions.form.validation.startDateRequired")),
    endDate: z.string().nullish().or(z.literal("")),
    renewalDate: z.string().nullish().or(z.literal("")),
    autoRenewal: z.coerce.boolean().default(true),
    renewalAlert30: z.coerce.boolean().default(true),
    renewalAlert60: z.coerce.boolean().default(false),
    renewalAlert90: z.coerce.boolean().default(false),
    contractUrl: z
      .string()
      .url(t("subscriptions.form.validation.contractUrlInvalid"))
      .nullish()
      .or(z.literal("")),
    notes: z
      .string()
      .max(1000, t("subscriptions.form.validation.notesTooLong"))
      .nullish(),
    status: z.nativeEnum(SubscriptionStatus).optional(),
    // Team/User 배정 (Phase 2)
    teamId: z.string().nullish(),
    // Team 배정 (다중, Phase 3)
    teamIds: z.array(z.string()).default([]),
    assignedUserIds: z.array(z.string()).default([]),
  });
}

export type SubscriptionFormValues = z.infer<
  ReturnType<typeof createSubscriptionFormSchema>
>;
