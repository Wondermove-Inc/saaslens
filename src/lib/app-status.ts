import type { AppStatus } from "@prisma/client";

export type AppStatusMeta = {
  label: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
};

const APP_STATUS_VARIANTS: Record<
  AppStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  PENDING_REVIEW: "outline",
  BLOCKED: "destructive",
};

export function getAppStatusMeta(
  status: AppStatus,
  t: (key: string) => string
): AppStatusMeta {
  const labels: Record<AppStatus, string> = {
    ACTIVE: t("apps.status.active"),
    INACTIVE: t("apps.status.inactive"),
    PENDING_REVIEW: t("apps.status.pendingReview"),
    BLOCKED: t("apps.status.blocked"),
  };

  return {
    label: labels[status],
    badgeVariant: APP_STATUS_VARIANTS[status],
  };
}

export function getAppStatusOptions(t: (key: string) => string) {
  return [
    { value: "ACTIVE" as AppStatus, label: t("apps.status.active") },
    { value: "INACTIVE" as AppStatus, label: t("apps.status.inactive") },
  ];
}
