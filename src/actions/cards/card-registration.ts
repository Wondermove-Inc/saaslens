"use server";

import { getCachedSession } from "@/lib/auth/require-auth";
import { encryptJson, getCardLast4, maskCardNumber } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import {
  CARD_COMPANIES,
  type CardCompanyCode,
  type CardCredentials,
} from "@/lib/services/hyphen";
import type { ActionState } from "@/types";
import type { CorporateCard } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { z } from "zod";

// ==================== 스키마 정의 ====================

const registerCardSchema = z.object({
  cardCd: z.string().min(3).max(3),
  cardNo: z.string().min(14).max(20),
  cardNm: z.string().nullable().optional(),
  loginMethod: z.enum(["ID", "CERT"]),
  userId: z.string().nullable().optional(), // 카드사 로그인 ID
  userPw: z.string().nullable().optional(),
  signCert: z.string().nullable().optional(),
  signPri: z.string().nullable().optional(),
  signPw: z.string().nullable().optional(),
  bizNo: z.string().nullable().optional(),
  userIdx: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(), // 배정 유저 ID
});

// ==================== 법인카드 등록 ====================

/**
 * 법인카드 등록
 */
async function _registerCorporateCard(
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "관리자만 카드를 등록할 수 있습니다" };
    }

    const organizationId = session.user.organizationId;

    // FormData 파싱
    const rawData = {
      cardCd: formData.get("cardCd") as string,
      cardNo: formData.get("cardNo") as string,
      cardNm: formData.get("cardNm") as string | null,
      loginMethod: formData.get("loginMethod") as string,
      userId: formData.get("userId") as string | null, // 카드사 로그인 ID
      userPw: formData.get("userPw") as string | null,
      signCert: formData.get("signCert") as string | null,
      signPri: formData.get("signPri") as string | null,
      signPw: formData.get("signPw") as string,
      bizNo: formData.get("bizNo") as string | null,
      userIdx: formData.get("userIdx") as string | null,
      teamId: (formData.get("teamId") as string) || null,
      assignedUserId: (formData.get("assignedUserId") as string) || null, // 배정 유저 ID
    };

    // 유효성 검증
    const result = registerCardSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ");
      return {
        success: false,
        message: `입력값 검증 실패: ${errorMessages}`,
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const data = result.data;

    // 중복 확인
    const existingCard = await prisma.corporateCard.findFirst({
      where: {
        organizationId,
        cardNo: maskCardNumber(data.cardNo),
      },
    });

    if (existingCard) {
      return { success: false, message: "이미 등록된 카드입니다" };
    }

    // 로그인 방식별 필수 필드 검증
    if (data.loginMethod === "ID") {
      if (!data.userId || !data.userPw) {
        return {
          success: false,
          message: "ID 로그인 시 아이디와 비밀번호는 필수입니다",
        };
      }
    } else if (data.loginMethod === "CERT") {
      if (!data.signCert || !data.signPri || !data.signPw) {
        return {
          success: false,
          message: "인증서 로그인 시 인증서, 개인키, 비밀번호는 필수입니다",
        };
      }
    }

    // Team과 User 상호 배타 검증
    if (data.teamId && data.assignedUserId) {
      return {
        success: false,
        message: "팀 배정과 유저 배정 중 하나만 선택할 수 있습니다",
      };
    }

    // 팀 유효성 검사 (teamId가 있는 경우)
    if (data.teamId) {
      const team = await prisma.team.findFirst({
        where: {
          id: data.teamId,
          organizationId,
        },
      });

      if (!team) {
        return {
          success: false,
          message: "유효하지 않은 팀입니다",
        };
      }
    }

    // 유저 유효성 검사 (assignedUserId가 있는 경우)
    if (data.assignedUserId) {
      const user = await prisma.user.findFirst({
        where: {
          id: data.assignedUserId,
          organizationId,
        },
      });

      if (!user) {
        return {
          success: false,
          message: "유효하지 않은 사용자입니다",
        };
      }
    }

    // 인증 정보 암호화 (원본 카드번호 포함)
    const credentials: CardCredentials =
      data.loginMethod === "ID"
        ? {
            loginMethod: "ID",
            cardNo: data.cardNo,
            userId: data.userId!,
            userPw: data.userPw!,
            bizNo: data.bizNo || undefined,
            userIdx: data.userIdx || undefined,
          }
        : {
            loginMethod: "CERT",
            cardNo: data.cardNo,
            signCert: data.signCert!,
            signPri: data.signPri!,
            signPw: data.signPw!,
            bizNo: data.bizNo || undefined,
            userIdx: data.userIdx || undefined,
          };

    const encryptedCredentials = encryptJson(credentials);

    // 카드 등록
    const card = await prisma.corporateCard.create({
      data: {
        organizationId,
        cardCd: data.cardCd,
        cardNo: maskCardNumber(data.cardNo),
        cardLast4: getCardLast4(data.cardNo),
        cardNm: data.cardNm || CARD_COMPANIES[data.cardCd as CardCompanyCode],
        loginMethod: data.loginMethod,
        encryptedCredentials,
        bizNo: data.bizNo,
        teamId: data.teamId,
        assignedUserId: data.assignedUserId,
        isActive: true,
      },
    });

    // 감사 로그
    await prisma.auditLog.create({
      data: {
        action: "CREATE_CORPORATE_CARD",
        entityType: "CorporateCard",
        entityId: card.id,
        userId: session.user.id,
        organizationId,
        metadata: {
          cardCd: data.cardCd,
          cardLast4: getCardLast4(data.cardNo),
          teamId: data.teamId,
          assignedUserId: data.assignedUserId,
        },
      },
    });

    revalidatePath("/payments/cards");

    return { success: true, data: { id: card.id } };
  } catch (error) {
    logger.error({ err: error }, "법인카드 등록 실패");
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return {
      success: false,
      message: `법인카드 등록에 실패했습니다: ${errorMessage}`,
    };
  }
}
export const registerCorporateCard = withLogging(
  "registerCorporateCard",
  _registerCorporateCard
);

// ==================== 법인카드 조회 ====================

/**
 * 거래 분류 요약 (SaaS/Non-SaaS/미분류)
 */
export interface CardTransactionSummary {
  totalCount: number;
  saasMatchedCount: number;
  nonSaaSCount: number;
  unmatchedCount: number;
}

/**
 * 배정 정보 타입
 */
export interface CardAssignment {
  type: "none" | "team" | "user";
  teamId: string | null;
  teamName: string | null;
  userId: string | null;
  userName: string | null;
  userTeamName: string | null; // 유저 배정 시 해당 유저의 팀
}

/**
 * 법인카드 목록 조회 타입
 */
export type CorporateCardWithCount = CorporateCard & {
  _count: { transactions: number };
  summary?: CardTransactionSummary;
  assignment?: CardAssignment;
};

/**
 * 카드별 거래 분류 요약 조회
 */
export async function getCardTransactionSummary(
  organizationId: string,
  cardId: string
): Promise<CardTransactionSummary> {
  const { normalizeMerchantName } =
    await import("@/lib/services/payment/merchant-matcher");
  const { checkNonSaaSCache } = await import("@/lib/services/saas-matcher");

  const transactions = await prisma.cardTransaction.findMany({
    where: { corporateCardId: cardId, organizationId },
    select: {
      id: true,
      useStore: true,
      matchedAppId: true,
    },
  });

  if (transactions.length === 0) {
    return {
      totalCount: 0,
      saasMatchedCount: 0,
      nonSaaSCount: 0,
      unmatchedCount: 0,
    };
  }

  const saasMatchedCount = transactions.filter(
    (t) => t.matchedAppId !== null
  ).length;

  const normalizedNames = transactions
    .filter((t) => t.matchedAppId === null)
    .map((t) => normalizeMerchantName(t.useStore));

  const nonSaaSSet = await checkNonSaaSCache(organizationId, normalizedNames);

  let nonSaaSCount = 0;
  let unmatchedCount = 0;

  for (const t of transactions) {
    if (t.matchedAppId !== null) continue;
    const normalized = normalizeMerchantName(t.useStore);
    if (nonSaaSSet.has(normalized)) {
      nonSaaSCount++;
    } else {
      unmatchedCount++;
    }
  }

  return {
    totalCount: transactions.length,
    saasMatchedCount,
    nonSaaSCount,
    unmatchedCount,
  };
}

/**
 * 법인카드 목록 조회
 */
export async function getCorporateCards(): Promise<CorporateCardWithCount[]> {
  const session = await getCachedSession();
  if (!session?.user?.organizationId) {
    return [];
  }

  const cards = await prisma.corporateCard.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    include: {
      _count: {
        select: { transactions: true },
      },
      team: {
        select: { id: true, name: true },
      },
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          team: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const cardsWithSummary = await Promise.all(
    cards.map(async (card) => {
      const summary = await getCardTransactionSummary(
        session.user.organizationId!,
        card.id
      );

      // 배정 정보 구성
      let assignment: CardAssignment;
      if (card.assignedUser) {
        assignment = {
          type: "user",
          teamId: null,
          teamName: null,
          userId: card.assignedUser.id,
          userName: card.assignedUser.name || card.assignedUser.email,
          userTeamName: card.assignedUser.team?.name ?? null,
        };
      } else if (card.team) {
        assignment = {
          type: "team",
          teamId: card.team.id,
          teamName: card.team.name,
          userId: null,
          userName: null,
          userTeamName: null,
        };
      } else {
        assignment = {
          type: "none",
          teamId: null,
          teamName: null,
          userId: null,
          userName: null,
          userTeamName: null,
        };
      }

      return { ...card, summary, assignment };
    })
  );

  return cardsWithSummary;
}

/**
 * 법인카드 상세 조회
 */
export async function getCorporateCard(
  cardId: string
): Promise<CorporateCard | null> {
  const session = await getCachedSession();
  if (!session?.user?.organizationId) {
    return null;
  }

  return prisma.corporateCard.findFirst({
    where: {
      id: cardId,
      organizationId: session.user.organizationId,
    },
  });
}

// 동일 요청 내에서 카드 상세를 중복 조회할 때 DB 호출을 한 번으로 줄이기 위해 캐시 제공
export const getCorporateCardCached = cache(getCorporateCard);

// ==================== 법인카드 삭제 ====================

/**
 * 법인카드 삭제
 */
async function _deleteCorporateCard(cardId: string): Promise<ActionState> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "관리자만 카드를 삭제할 수 있습니다" };
    }

    const organizationId = session.user.organizationId;

    const card = await prisma.corporateCard.findFirst({
      where: {
        id: cardId,
        organizationId,
      },
    });

    if (!card) {
      return { success: false, message: "카드를 찾을 수 없습니다" };
    }

    await prisma.corporateCard.delete({
      where: { id: cardId },
    });

    await prisma.auditLog.create({
      data: {
        action: "DELETE_CORPORATE_CARD",
        entityType: "CorporateCard",
        entityId: cardId,
        userId: session.user.id,
        organizationId,
        metadata: {
          cardCd: card.cardCd,
          cardLast4: card.cardLast4,
        },
      },
    });

    revalidatePath("/payments/cards");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "법인카드 삭제 실패");
    return { success: false, message: "법인카드 삭제에 실패했습니다" };
  }
}
export const deleteCorporateCard = withLogging(
  "deleteCorporateCard",
  _deleteCorporateCard
);

// ==================== 법인카드 수정 ====================

/**
 * 법인카드 팀 배정 수정
 */
async function _updateCorporateCardTeam(
  cardId: string,
  teamId: string | null
): Promise<ActionState> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "관리자만 카드를 수정할 수 있습니다" };
    }

    const organizationId = session.user.organizationId;

    const card = await prisma.corporateCard.findFirst({
      where: {
        id: cardId,
        organizationId,
      },
    });

    if (!card) {
      return { success: false, message: "카드를 찾을 수 없습니다" };
    }

    // 팀 유효성 검사 (teamId가 있는 경우)
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          organizationId,
        },
      });

      if (!team) {
        return { success: false, message: "유효하지 않은 팀입니다" };
      }
    }

    await prisma.corporateCard.update({
      where: { id: cardId },
      data: { teamId },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE_CORPORATE_CARD",
        entityType: "CorporateCard",
        entityId: cardId,
        userId: session.user.id,
        organizationId,
        metadata: {
          cardCd: card.cardCd,
          cardLast4: card.cardLast4,
          teamId,
        },
      },
    });

    revalidatePath("/payments/cards");

    return { success: true, message: "카드 팀 배정이 수정되었습니다" };
  } catch (error) {
    logger.error({ err: error }, "법인카드 수정 실패");
    return { success: false, message: "법인카드 수정에 실패했습니다" };
  }
}
export const updateCorporateCardTeam = withLogging(
  "updateCorporateCardTeam",
  _updateCorporateCardTeam
);
