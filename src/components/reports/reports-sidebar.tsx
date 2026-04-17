"use client";

import {
  AppWindow,
  BarChart3,
  CalendarClock,
  DollarSign,
  FileText,
  Globe,
  LucideIcon,
  ShieldOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface ReportsMenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description?: string;
}

const reportsMenuConfig = [
  {
    icon: DollarSign,
    labelKey: "sidebar.menu.reports.cost",
    descriptionKey: "sidebar.menu.reports.costDescription",
    href: "/reports/cost",
  },
  {
    icon: CalendarClock,
    labelKey: "sidebar.menu.reports.renewal",
    descriptionKey: "sidebar.menu.reports.renewalDescription",
    href: "/reports/renewal",
  },
  {
    icon: BarChart3,
    labelKey: "sidebar.menu.reports.usage",
    descriptionKey: "sidebar.menu.reports.usageDescription",
    href: "/reports/usage",
  },
  {
    icon: Globe,
    labelKey: "sidebar.menu.reports.browsingUsage",
    descriptionKey: "sidebar.menu.reports.browsingUsageDescription",
    href: "/reports/browsing-usage",
  },
  {
    icon: AppWindow,
    labelKey: "sidebar.menu.reports.registeredAppUsage",
    descriptionKey: "sidebar.menu.reports.registeredAppUsageDescription",
    href: "/reports/registered-app-usage",
  },
  {
    icon: ShieldOff,
    labelKey: "sidebar.menu.reports.blockEvents",
    descriptionKey: "sidebar.menu.reports.blockEventsDescription",
    href: "/reports/block-events",
  },
  {
    icon: FileText,
    labelKey: "sidebar.menu.reports.audit",
    descriptionKey: "sidebar.menu.reports.auditDescription",
    href: "/reports/audit",
  },
];

export function ReportsSidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  const menuItems: ReportsMenuItem[] = useMemo(
    () =>
      reportsMenuConfig.map((item) => ({
        icon: item.icon,
        label: t(item.labelKey),
        href: item.href,
        description: item.descriptionKey ? t(item.descriptionKey) : undefined,
      })),
    [t]
  );

  return (
    <nav className="flex flex-col space-y-0.5">
      {menuItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-start gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-muted hover:text-accent-foreground"
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span>{item.label}</span>
              {item.description && (
                <span className="text-muted-foreground text-xs font-normal">
                  {item.description}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
