"use client";

import {
  AppWindow,
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// 검색 가능한 항목들
const searchItems = [
  {
    group: "페이지",
    items: [
      { icon: LayoutDashboard, label: "대시보드", href: "/dashboard" },
      { icon: AppWindow, label: "앱 관리", href: "/apps" },
      { icon: Users, label: "사용자", href: "/users" },
      { icon: CreditCard, label: "구독", href: "/subscriptions" },
      { icon: BarChart3, label: "리포트", href: "/reports" },
      { icon: Settings, label: "설정", href: "/settings" },
    ],
  },
  {
    group: "리포트",
    items: [
      { icon: FileText, label: "비용 분석", href: "/reports/cost" },
      { icon: FileText, label: "구독 갱신", href: "/reports/renewal" },
      { icon: FileText, label: "사용 현황", href: "/reports/usage" },
      { icon: FileText, label: "감사 로그", href: "/reports/audit" },
    ],
  },
  {
    group: "바로가기",
    items: [
      { icon: AppWindow, label: "새 앱 등록", href: "/apps/new" },
      { icon: CreditCard, label: "새 구독 등록", href: "/subscriptions/new" },
      { icon: Users, label: "퇴사자 관리", href: "/users/offboarded" },
    ],
  },
];

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="bg-muted/50 text-muted-foreground relative h-9 w-full justify-start rounded-md text-sm font-normal shadow-none sm:pr-12 md:w-64 lg:w-80"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        검색...
        <kbd className="bg-muted pointer-events-none absolute top-1.5 right-1.5 hidden h-6 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="페이지 또는 기능 검색..." />
        <CommandList>
          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
          {searchItems.map((group, index) => (
            <React.Fragment key={group.group}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={group.group}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => handleSelect(item.href)}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
