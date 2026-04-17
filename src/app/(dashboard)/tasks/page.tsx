// src/app/(dashboard)/tasks/page.tsx
import { V2ComingSoon } from "@/components/common";
import { TasksPageClient } from "@/components/tasks";
import { requireOrganization } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks");
  return {
    title: `${t("page.title")} | SaaS 관리 플랫폼`,
    description: t("page.description"),
  };
}

export default async function TasksPage() {
  // 환경변수로 V2 기능 활성화 제어 (기본: 비활성화)
  if (process.env.ENABLE_V2_FEATURES !== "true") {
    return (
      <V2ComingSoon
        feature="작업 관리"
        description="SaaS 관리 관련 작업을 추적하고 관리합니다."
      />
    );
  }

  // V2 활성화 시 기존 로직
  const { role } = await requireOrganization();
  const canManage = role === "ADMIN" || role === "MEMBER";

  return <TasksPageClient canManage={canManage} />;
}
