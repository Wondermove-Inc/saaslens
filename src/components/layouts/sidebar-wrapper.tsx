// src/components/layouts/sidebar-wrapper.tsx
"use client";

import { useEffect, useState } from "react";

import { AiAgentProvider } from "@/components/ai-agent";
import { AppHeader } from "@/components/layouts/app-header";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiPanelStore } from "@/lib/ai/ai-panel-store";

interface SidebarWrapperProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  role?: "ADMIN" | "MEMBER" | "VIEWER" | null;
  user?: {
    name: string | null;
    email: string;
  };
}

/**
 * 사이드바 로딩 스켈레톤 (inset 레이아웃)
 */
function SidebarSkeleton() {
  return (
    <div className="bg-sidebar flex h-screen w-full">
      {/* 사이드바 스켈레톤 */}
      <div className="hidden w-64 p-4 md:block">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
      {/* 메인 콘텐츠 스켈레톤 (inset 스타일) */}
      <div className="bg-background m-2 ml-0 flex flex-1 flex-col rounded-xl shadow-sm">
        <div className="h-[55px] px-4">
          <Skeleton className="mt-4 h-8 w-48" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * 사이드바 래퍼 컴포넌트
 * 클라이언트 사이드 hydration 완료 후 렌더링하여 Radix UI ID mismatch 방지
 */
export function SidebarWrapper({
  children,
  defaultOpen = true,
  role,
  user,
}: SidebarWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 서버 렌더링 및 hydration 중에는 스켈레톤 표시
  if (!isMounted) {
    return <SidebarSkeleton />;
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar variant="inset" role={role} user={user} />
      <SidebarInset>
        <AppHeader />
        <MainContent>{children}</MainContent>
      </SidebarInset>
      {/* AI Agent — Read Tool + Write Tool + 승인 플로우 */}
      <AiAgentProvider />
    </SidebarProvider>
  );
}

/**
 * main 영역 — AI 패널 열릴 때 paddingRight 조정
 */
function MainContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useAiPanelStore();

  return (
    <main
      className="bg-muted flex-1 p-4 transition-[padding] duration-300"
      style={{ paddingRight: isOpen ? 416 : undefined }}
    >
      {children}
    </main>
  );
}
