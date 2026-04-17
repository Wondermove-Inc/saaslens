"use client";

import {
  Activity,
  AppWindow,
  BarChart3,
  ClipboardList,
  Download,
  LucideIcon,
  Mail,
  ShieldOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface ExtensionsMenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description?: string;
}

const extensionsMenuConfig = [
  {
    icon: BarChart3,
    labelKey: "sidebar.menu.extensions.usage",
    descriptionKey: "sidebar.menu.extensions.usageDescription",
    href: "/extensions/usage",
  },
  {
    icon: ClipboardList,
    labelKey: "sidebar.menu.extensions.reviewApps",
    descriptionKey: "sidebar.menu.extensions.reviewAppsDescription",
    href: "/extensions/review-apps",
  },
  {
    icon: AppWindow,
    labelKey: "sidebar.menu.extensions.registeredApps",
    descriptionKey: "sidebar.menu.extensions.registeredAppsDescription",
    href: "/extensions/registered-apps",
  },
  {
    icon: ShieldOff,
    labelKey: "sidebar.menu.extensions.blockedApps",
    descriptionKey: "sidebar.menu.extensions.blockedAppsDescription",
    href: "/extensions/blocked-apps",
  },
  {
    icon: Mail,
    labelKey: "sidebar.menu.extensions.onboarding",
    descriptionKey: "sidebar.menu.extensions.onboardingDescription",
    href: "/extensions/onboarding",
  },
  {
    icon: Activity,
    labelKey: "sidebar.menu.extensions.status",
    descriptionKey: "sidebar.menu.extensions.statusDescription",
    href: "/extensions/status",
  },
  {
    icon: Download,
    labelKey: "sidebar.menu.extensions.builds",
    descriptionKey: "sidebar.menu.extensions.buildsDescription",
    href: "/extensions/builds",
  },
];

export function ExtensionsSidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  const menuItems: ExtensionsMenuItem[] = useMemo(
    () =>
      extensionsMenuConfig.map((item) => ({
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
                : "text-foreground hover:bg-purple-gray hover:text-accent-foreground"
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
