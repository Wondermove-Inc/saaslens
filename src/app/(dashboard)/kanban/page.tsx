// src/app/(dashboard)/kanban/page.tsx
import { V2ComingSoon } from "@/components/common";
import { KanbanPageClient } from "@/components/kanban";
import { requireOrganization } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("kanban");
  return {
    title: `${t("page.title")} | SaaS 관리 플랫폼`,
    description: t("page.description"),
  };
}

export default async function KanbanPage() {
  // 환경변수로 V2 기능 활성화 제어 (기본: 비활성화)
  if (process.env.ENABLE_V2_FEATURES !== "true") {
    return (
      <V2ComingSoon
        feature="칸반 보드"
        description="드래그 앤 드롭으로 작업을 관리하세요."
      />
    );
  }

  // V2 활성화 시 기존 로직
  const { role } = await requireOrganization();
  const canManage = role === "ADMIN" || role === "MEMBER";

  return <KanbanPageClient canManage={canManage} />;
}
