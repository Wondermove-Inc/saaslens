// src/actions/extensions/onboarding-monitor.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

export interface OnboardingMonitorItem {
  userId: string;
  userName: string | null;
  userEmail: string;
  department: string | null;
  onboardingCompletedAt: Date | null;
}

/**
 * 전체 활성 사용자의 온보딩 현황 조회
 */
export async function getOnboardingMonitorData(): Promise<{
  items: OnboardingMonitorItem[];
  total: number;
  completedCount: number;
  pendingCount: number;
}> {
  const { organizationId } = await requireOrganization();

  const users = await prisma.user.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      extensionDevices: {
        where: { onboardingCompletedAt: { not: null } },
        select: { onboardingCompletedAt: true },
        orderBy: { onboardingCompletedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const items: OnboardingMonitorItem[] = users.map((user) => ({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    department: user.department,
    onboardingCompletedAt:
      user.extensionDevices[0]?.onboardingCompletedAt ?? null,
  }));

  const completedCount = items.filter((i) => i.onboardingCompletedAt).length;
  const pendingCount = items.length - completedCount;

  return { items, total: items.length, completedCount, pendingCount };
}
