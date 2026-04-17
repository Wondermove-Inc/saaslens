// src/app/(dashboard)/settings/budget/page.tsx
import { getBudgetSettings } from "@/actions/budget-settings";
import { BudgetSettingsForm } from "@/components/settings/budget-settings-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "예산 설정 | SaaS 관리 플랫폼",
  description: "월별 예산과 통화 단위를 설정합니다",
};

export default async function BudgetSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  const budgetSettings = await getBudgetSettings();

  return <BudgetSettingsForm initialSettings={budgetSettings} />;
}
