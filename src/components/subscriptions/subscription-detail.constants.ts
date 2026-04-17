// src/components/subscriptions/subscription-detail.constants.ts
import type { BillingCycle, SubscriptionStatus } from "@prisma/client";

export function getStatusLabels(
  t: (key: string) => string
): Record<SubscriptionStatus, string> {
  return {
    ACTIVE: t("subscriptions.status.active"),
    EXPIRED: t("subscriptions.status.expired"),
    CANCELLED: t("subscriptions.status.cancelled"),
    PENDING: t("subscriptions.status.pending"),
  };
}

export const statusVariants: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
  PENDING: "outline",
};

export function getBillingCycleLabels(
  t: (key: string) => string
): Record<BillingCycle, string> {
  return {
    MONTHLY: t("subscriptions.billingCycle.monthly"),
    QUARTERLY: t("subscriptions.billingCycle.quarterly"),
    YEARLY: t("subscriptions.billingCycle.yearly"),
    ONE_TIME: t("subscriptions.billingCycle.oneTime"),
  };
}
