"use client";

import {
  AppWindow,
  CalendarDays,
  CreditCard,
  LucideIcon,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface SubscriptionsMenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description?: string;
}

const subscriptionsMenuConfig = [
  {
    icon: CreditCard,
    labelKey: "sidebar.menu.subscriptions.list",
    descriptionKey: "sidebar.menu.subscriptions.listDescription",
    href: "/subscriptions",
    exact: true,
  },
  {
    icon: Sparkles,
    labelKey: "sidebar.menu.subscriptions.suggestions",
    descriptionKey: "sidebar.menu.subscriptions.suggestionsDescription",
    href: "/subscriptions/suggestions",
  },
  {
    icon: AppWindow,
    labelKey: "sidebar.menu.apps.list",
    descriptionKey: "sidebar.menu.apps.listDescription",
    href: "/apps",
  },
  {
    icon: CalendarDays,
    labelKey: "sidebar.menu.subscriptions.calendar",
    descriptionKey: "sidebar.menu.subscriptions.calendarDescription",
    href: "/subscriptions/calendar",
  },
];

export function SubscriptionsSidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  const menuItems: (SubscriptionsMenuItem & { exact?: boolean })[] = useMemo(
    () =>
      subscriptionsMenuConfig.map((item) => ({
        icon: item.icon,
        label: t(item.labelKey),
        href: item.href,
        description: item.descriptionKey ? t(item.descriptionKey) : undefined,
        exact: item.exact,
      })),
    [t]
  );

  return (
    <nav className="flex flex-col space-y-0.5">
      {menuItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
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
