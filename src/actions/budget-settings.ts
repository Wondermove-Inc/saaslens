// src/actions/budget-settings.ts
"use server";

import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import { BudgetSettings, DEFAULT_BUDGET_SETTINGS } from "@/types/budget";
import { revalidatePath } from "next/cache";

// Organization.settings 내부 구조
interface OrganizationSettings {
  budget?: Partial<BudgetSettings>;
  notifications?: unknown;
  [key: string]: unknown;
}

/**
 * 조직 예산 설정 조회
 */
export async function getBudgetSettings(): Promise<BudgetSettings> {
  const { organizationId } = await requireOrganization();

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  if (!organization) {
    return DEFAULT_BUDGET_SETTINGS;
  }

  const settings = organization.settings as OrganizationSettings;
  const budget = settings?.budget;

  if (!budget) {
    return DEFAULT_BUDGET_SETTINGS;
  }

  return {
    currency: budget.currency ?? DEFAULT_BUDGET_SETTINGS.currency,
    monthlyBudget:
      budget.monthlyBudget ?? DEFAULT_BUDGET_SETTINGS.monthlyBudget,
    alertThreshold:
      budget.alertThreshold ?? DEFAULT_BUDGET_SETTINGS.alertThreshold,
  };
}

/**
 * 조직 예산 설정 업데이트
 */
async function _updateBudgetSettings(
  updates: Partial<BudgetSettings>
): Promise<{ success: boolean; message?: string }> {
  const session = await auth();

  if (!session?.user) {
    const { redirect } = await import("next/navigation");
    return redirect("/login");
  }

  const user = session.user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    const { redirect } = await import("next/navigation");
    return redirect("/onboarding");
  }

  // 관리자 권한 확인
  if (user.role !== "ADMIN") {
    return {
      success: false,
      message: "관리자 권한이 필요합니다",
    };
  }

  // 현재 설정 조회
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  const currentSettings = (organization?.settings ||
    {}) as OrganizationSettings;
  const currentBudget = currentSettings.budget || DEFAULT_BUDGET_SETTINGS;

  // 업데이트된 예산 설정
  const updatedBudget: BudgetSettings = {
    currency:
      updates.currency ??
      currentBudget.currency ??
      DEFAULT_BUDGET_SETTINGS.currency,
    monthlyBudget:
      updates.monthlyBudget !== undefined
        ? updates.monthlyBudget
        : (currentBudget.monthlyBudget ??
          DEFAULT_BUDGET_SETTINGS.monthlyBudget),
    alertThreshold:
      updates.alertThreshold ??
      currentBudget.alertThreshold ??
      DEFAULT_BUDGET_SETTINGS.alertThreshold,
  };

  // 설정 데이터 구성
  const newSettings = {
    ...currentSettings,
    budget: updatedBudget,
  };

  // 설정 업데이트
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      settings: newSettings as any,
    },
  });

  revalidatePath("/settings/budget");

  return { success: true };
}
export const updateBudgetSettings = withLogging(
  "updateBudgetSettings",
  _updateBudgetSettings
);

/**
 * 차트용 월별 예산 조회
 * - monthlyBudget이 설정되어 있으면 해당 값 반환
 * - 설정되지 않았으면 (null) 전월 카드 매입 승인 내역 총액 반환
 */
export async function getMonthlyBudgetForChart(
  organizationId: string,
  month: Date,
  budgetSettings: BudgetSettings
): Promise<number> {
  // 예산이 설정되어 있으면 해당 값 반환
  if (budgetSettings.monthlyBudget !== null) {
    return budgetSettings.monthlyBudget;
  }

  // Fallback: 전월 카드 매입 승인 내역 총액
  const prevMonth = new Date(month);
  prevMonth.setMonth(prevMonth.getMonth() - 1);

  const year = prevMonth.getFullYear();
  const monthNum = prevMonth.getMonth() + 1; // 0-indexed -> 1-indexed

  const prevMonthStart = `${year}${String(monthNum).padStart(2, "0")}01`;
  const prevMonthEnd = `${year}${String(monthNum).padStart(2, "0")}31`;

  const cardTransactions = await prisma.cardTransaction.aggregate({
    where: {
      organizationId,
      useDt: {
        gte: prevMonthStart,
        lte: prevMonthEnd,
      },
    },
    _sum: { useAmt: true },
  });

  // Decimal 타입 처리
  const sum = cardTransactions._sum.useAmt;
  if (sum === null) {
    return 0;
  }

  // Prisma Decimal은 toNumber() 메서드를 가짐
  if (typeof sum === "object" && "toNumber" in sum) {
    return (sum as { toNumber: () => number }).toNumber();
  }

  return Number(sum);
}
