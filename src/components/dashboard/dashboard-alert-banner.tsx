"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronRight, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export interface DashboardAlertItem {
  id: string;
  severity: "info" | "warning" | "critical";
  titleKey: string;
  messageKey: string;
  href?: string;
  titleParams?: Record<string, string | number>;
  messageParams?: Record<string, string | number>;
}

interface DashboardAlertBannerProps {
  alerts: DashboardAlertItem[];
}

const severityStyles = {
  info: {
    border: "border-info/50",
    bg: "bg-info/5",
    hover: "hover:bg-info/10",
    icon: "text-info",
  },
  warning: {
    border: "border-warning/50",
    bg: "bg-warning/5",
    hover: "hover:bg-warning/10",
    icon: "text-warning",
  },
  critical: {
    border: "border-destructive/50",
    bg: "bg-destructive/5",
    hover: "hover:bg-destructive/10",
    icon: "text-destructive",
  },
};

export function DashboardAlertBanner({ alerts }: DashboardAlertBannerProps) {
  const t = useTranslations("dashboardV3.alertBanner");

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const styles = severityStyles[alert.severity];
        const _Icon = alert.severity === "info" ? Info : AlertTriangle;

        const content = (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {t(alert.titleKey, alert.titleParams)}
              </p>
              <p className="text-muted-foreground text-sm">
                {t(alert.messageKey, alert.messageParams)}
              </p>
            </div>
          </>
        );

        const containerClasses = cn(
          "flex items-start gap-3 rounded-lg border p-3 transition-colors",
          styles.border,
          styles.bg
        );

        return alert.href ? (
          <Link
            key={alert.id}
            href={alert.href}
            className={cn(
              containerClasses,
              styles.hover,
              "no-underline",
              "items-center rounded-lg bg-white/60 shadow-[0_2px_8px_0_rgba(0,0,0,0.10)] dark:bg-white/10"
            )}
          >
            {content}
            <ChevronRight className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          </Link>
        ) : (
          <div key={alert.id} className={containerClasses}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
