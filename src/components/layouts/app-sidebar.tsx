"use client";

import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  MoreHorizontal,
  Puzzle,
  Receipt,
  Settings,
  UserCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { logout } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

// 메뉴 아이템 타입 정의
interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface MenuSection {
  group: string | null;
  color: string;
  items: MenuItem[];
}

interface MenuItemConfig {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  href: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface MenuSectionConfig {
  groupKey: string | null;
  color: string;
  items: MenuItemConfig[];
}

// 메뉴 구조 정의 (서브메뉴 포함) - 레퍼런스 UI 순서 참고
const menuConfig: MenuSectionConfig[] = [
  {
    groupKey: "sidebar.group.main",
    color: "#6366F1",
    items: [
      {
        icon: LayoutDashboard,
        labelKey: "sidebar.menu.dashboard",
        href: "/dashboard",
      },
      {
        icon: BarChart3,
        labelKey: "sidebar.menu.reports.root",
        href: "/reports/cost",
      },
    ],
  },
  {
    groupKey: "sidebar.group.management",
    color: "#F59E0B",
    items: [
      {
        icon: Building2,
        labelKey: "sidebar.menu.org.root",
        href: "/teams",
      },
      {
        icon: CreditCard,
        labelKey: "sidebar.menu.subscriptions.root",
        href: "/subscriptions",
      },
      {
        icon: Receipt,
        labelKey: "sidebar.menu.payments.root",
        href: "/payments",
      },
      {
        icon: Puzzle,
        labelKey: "sidebar.menu.extensions.root",
        href: "/extensions/usage",
      },
    ],
  },
  {
    groupKey: "sidebar.group.system",
    color: "#64748B",
    items: [
      {
        icon: LinkIcon,
        labelKey: "sidebar.menu.integrations",
        href: "/integrations",
      },
      {
        icon: Settings,
        labelKey: "sidebar.menu.settings",
        href: "/settings",
      },
    ],
  },
];

// AppSidebar props 타입 정의
interface AppSidebarProps {
  variant?: "sidebar" | "floating" | "inset";
  role?: "ADMIN" | "MEMBER" | "VIEWER" | null;
  user?: {
    name: string | null;
    email: string;
  };
}

export function AppSidebar({
  variant = "sidebar",
  role,
  user,
}: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();

  const menuItems: MenuSection[] = useMemo(
    () =>
      menuConfig.map((section) => ({
        group: section.groupKey ? t(section.groupKey) : null,
        color: section.color,
        items: section.items.map((item) => ({
          ...item,
          label: t(item.labelKey),
        })),
      })),
    [t]
  );

  // 현재 경로가 메뉴 항목과 일치하는지 확인
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        pathname.startsWith("/dashboard/") ||
        pathname === "/"
      );
    }
    // 구독 메뉴: /apps 경로도 구독 하위로 활성화
    if (href === "/subscriptions") {
      return (
        pathname.startsWith("/subscriptions") || pathname.startsWith("/apps")
      );
    }
    // 조직관리 메뉴: /teams, /users, /org 경로 모두 활성화
    if (href === "/teams") {
      return (
        pathname.startsWith("/teams") ||
        pathname.startsWith("/users") ||
        pathname.startsWith("/org")
      );
    }
    return pathname.startsWith(href);
  };

  // role에 따라 메뉴 필터링
  // MEMBER: 대시보드 + 구독만 표시
  // VIEWER: 결제 숨김
  const filteredMenuItems = menuItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // MEMBER: 대시보드와 구독만 허용
        if (role === "MEMBER") {
          return item.href === "/dashboard" || item.href === "/subscriptions";
        }
        // VIEWER: 결제 메뉴 숨김
        if (item.href === "/payments" && role === "VIEWER") {
          return false;
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Sidebar data-testid="app-sidebar" variant={variant}>
      {/* 로고 + 브랜드명 헤더 - AppHeader(55px) + SidebarInset 상단 마진(8px)과 정렬 */}
      <SidebarHeader className="h-[64px]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-12 hover:bg-[var(--primary)]/5"
            >
              <Link href="/dashboard" className="flex items-center">
                <Image
                  src="/logo.svg"
                  alt="saaslens"
                  width={170}
                  height={28}
                  priority
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 메뉴 콘텐츠 - 좌우 padding 제거 (스크롤바 위치 정렬을 위해) */}
      <SidebarContent className="px-0">
        <ScrollArea className="h-full">
          {filteredMenuItems.map((section, sectionIndex) => (
            <SidebarGroup key={section.group ?? `section-${sectionIndex}`}>
              {section.group && (
                <SidebarGroupLabel className="text-muted-foreground text-xs tracking-wider uppercase">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="size-[5px] shrink-0 rounded-full"
                      style={{ background: section.color }}
                    />
                    {section.group}
                  </div>
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const Icon = item.icon as React.ComponentType<{
                      className?: string;
                      style?: React.CSSProperties;
                    }>;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.href)}
                          tooltip={item.label}
                          className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10"
                          style={
                            isActive(item.href)
                              ? { background: `${section.color}20` }
                              : undefined
                          }
                        >
                          <Link
                            href={item.href}
                            data-active={isActive(item.href)}
                          >
                            <Icon
                              className="h-4 w-4"
                              style={
                                isActive(item.href)
                                  ? { color: section.color }
                                  : undefined
                              }
                            />
                            <span>{item.label}</span>
                            {item.badge && (
                              <SidebarMenuBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                {item.badge}
                              </SidebarMenuBadge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>

      <SidebarSeparator />

      {/* 하단 프로필 영역 */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {(user?.name ?? user?.email ?? "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-left">
                    <span className="text-sm font-medium">
                      {user?.name ?? t("sidebar.user.fallbackName")}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {user?.email ?? "user@example.com"}
                    </span>
                  </div>
                  <MoreHorizontal className="text-muted-foreground h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="cursor-pointer">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>{t("common.profile")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t("common.settings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("common.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
