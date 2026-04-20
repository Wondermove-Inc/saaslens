// src/actions/users-utils.ts
"use server";

/**
 * User 관련 공통 유틸리티 함수
 */

import { prisma } from "@/lib/db";

/**
 * 해당 사용자가 조직의 마지막 ADMIN인지 확인
 */
export async function isLastAdmin(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: {
      organizationId,
      role: "ADMIN",
      id: { not: userId },
    },
  });

  return adminCount === 0;
}

/**
 * 사용자와 연결된 데이터 건수 조회 (삭제 확인 다이얼로그용)
 */
export async function getUserRelatedDataCounts(userId: string): Promise<{
  ownedApps: number;
  assignedCorporateCards: number;
  assignedCardTransactions: number;
  directReports: number;
  assignedSubscriptions: number;
}> {
  const [
    ownedApps,
    assignedCorporateCards,
    assignedCardTransactions,
    directReports,
    assignedSubscriptions,
  ] = await Promise.all([
    prisma.app.count({ where: { ownerId: userId } }),
    prisma.corporateCard.count({ where: { assignedUserId: userId } }),
    prisma.cardTransaction.count({ where: { userId } }),
    prisma.user.count({ where: { managerId: userId } }),
    prisma.subscriptionUser.count({ where: { userId } }),
  ]);

  return {
    ownedApps,
    assignedCorporateCards,
    assignedCardTransactions,
    directReports,
    assignedSubscriptions,
  };
}
