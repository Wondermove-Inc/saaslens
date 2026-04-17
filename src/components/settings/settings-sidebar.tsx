"use client";

import {
  Bell,
  Building2,
  LucideIcon,
  Monitor,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface SettingsMenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description?: string;
  adminOnly?: boolean;
}

const settingsMenuConfig = [
  {
    icon: User,
    labelKey: "settings.sidebar.profile.title",
    descriptionKey: "settings.sidebar.profile.description",
    href: "/settings/profile",
  },
  {
    icon: Building2,
    labelKey: "settings.sidebar.organization.title",
    descriptionKey: "settings.sidebar.organization.description",
    href: "/settings/organization",
    adminOnly: true,
  },
  {
    icon: Users,
    labelKey: "settings.sidebar.team.title",
    descriptionKey: "settings.sidebar.team.description",
    href: "/settings/team",
    adminOnly: true,
  },
  {
    icon: Wallet,
    labelKey: "settings.sidebar.budget.title",
    descriptionKey: "settings.sidebar.budget.description",
    href: "/settings/budget",
    adminOnly: true,
  },
  {
    icon: Monitor,
    labelKey: "settings.sidebar.appearance.title",
    descriptionKey: "settings.sidebar.appearance.description",
    href: "/settings/appearance",
  },
  {
    icon: Bell,
    labelKey: "settings.sidebar.notifications.title",
    descriptionKey: "settings.sidebar.notifications.description",
    href: "/settings/notifications",
  },
];

interface SettingsSidebarProps {
  isAdmin?: boolean;
}

export function SettingsSidebar({ isAdmin = false }: SettingsSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const settingsMenuItems: SettingsMenuItem[] = useMemo(
    () =>
      settingsMenuConfig.map((item) => ({
        icon: item.icon,
        label: t(item.labelKey),
        href: item.href,
        description: item.descriptionKey ? t(item.descriptionKey) : undefined,
        adminOnly: item.adminOnly,
      })),
    [t]
  );

  return (
    <nav className="flex flex-col space-y-0.5">
      {settingsMenuItems.map((item) => {
        // 관리자 전용 항목 처리
        if (item.adminOnly && !isAdmin) {
          return null;
        }

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
