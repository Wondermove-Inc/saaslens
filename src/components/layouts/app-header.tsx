"use client";

import { Check, Languages, LogOut, Settings, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { logout } from "@/actions/auth";
import { CommandSearch } from "@/components/common/command-search";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { NotificationBell } from "@/components/layouts/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { type Locale, locales } from "@/i18n/config";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AppHeader() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleLocaleChange = (nextLocale: Locale) => {
    if (!locales.includes(nextLocale) || nextLocale === locale) {
      return;
    }

    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };
  return (
    <header
      data-testid="app-header"
      className="bg-background/40 sticky top-0 z-50 flex h-[55px] shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md transition-[width,height] ease-linear md:rounded-tl-xl md:rounded-tr-xl lg:gap-2"
    >
      {/* 사이드바 토글 */}
      <SidebarTrigger className="-ml-1" />

      <Separator orientation="vertical" className="mr-2 !h-4" />

      {/* Command+K 검색 */}
      <div className="flex flex-1 items-center gap-2">
        <CommandSearch />
      </div>

      {/* 우측 액션 */}
      <div className="flex items-center gap-1">
        {/* 알림 벨 */}
        <NotificationBell />

        {/* 테마 토글 - 임시 숨김 (light mode 강제) */}
        {false && <ThemeToggle />}

        {/* 언어 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("header.language.label")}
            >
              <Languages className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-36">
            <DropdownMenuItem onSelect={() => handleLocaleChange("ko")}>
              <Check
                className={
                  locale === "ko" ? "mr-2 h-4 w-4" : "mr-2 h-4 w-4 opacity-0"
                }
              />
              {t("language.ko")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleLocaleChange("en")}>
              <Check
                className={
                  locale === "en" ? "mr-2 h-4 w-4" : "mr-2 h-4 w-4 opacity-0"
                }
              />
              {t("language.en")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 설정 */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.settings")}
          asChild
        >
          <Link href="/settings">
            <Settings className="animate-tada h-5 w-5" />
          </Link>
        </Button>

        <Separator orientation="vertical" className="mx-2 !h-4" />

        {/* 사용자 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              data-testid="user-menu-trigger"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                {t("common.profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                {t("common.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onSelect={async (e) => {
                e.preventDefault();
                await logout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
