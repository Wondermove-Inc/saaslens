// src/components/super-admin/super-admin-sidebar.tsx
"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  Box,
  Building2,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/super-admin",
    label: "사용 현황",
    icon: LayoutDashboard,
  },
  {
    href: "/super-admin/tenant",
    label: "테넌트 설정",
    icon: Building2,
  },
  {
    href: "/super-admin/admins",
    label: "관리자 관리",
    icon: Users,
  },
  {
    href: "/super-admin/extension-builds",
    label: "Extension 빌드",
    icon: Box,
  },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-card flex h-screen w-64 flex-col border-r">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
          <Shield className="text-primary-foreground h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Super Admin</p>
          <p className="text-muted-foreground text-xs">관리 콘솔</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/super-admin"
              ? pathname === "/super-admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 통계 배지 */}
      <div className="border-t p-4">
        <div className="bg-muted flex items-center gap-2 rounded-md px-3 py-2">
          <BarChart3 className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground text-xs">
            PHASE 1 (단일 테넌트)
          </span>
        </div>
      </div>

      {/* 로그아웃 */}
      <div className="border-t p-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
