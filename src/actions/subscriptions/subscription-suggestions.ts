"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import { detectBillingType } from "@/lib/services/subscription/seat-detector";
import { calculateNextRenewalDate } from "@/lib/utils/renewal-date";
import type { ActionState } from "@/types";
import type { BillingType } from "@prisma/client";
import { BillingCycle } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "./subscription-crud.types";

// ==================== SMP-107: App-Team 배정 헬퍼 ====================

/**
 * SMP-107: App이 지정된 Team에 배정되어 있는지 확인하고, 미배정이면 자동 배정
 */
export async function ensureAppTeamAssignment(
  appId: string,
  teamId: string | null
): Promise<ActionState<{ created: boolean; appTeamId?: string }>> {
  // teamId가 null이면 아무 작업도 하지 않음
  if (!teamId) {
    return { success: true, data: { created: false } };
  }

  const { organizationId, userId } = await requireOrganization();

  // 기존 AppTeam 확인
  const existingAppTeam = await prisma.appTeam.findFirst({
    where: { appId, teamId },
  });

  if (existingAppTeam) {
    return {
      success: true,
      data: { created: false, appTeamId: existingAppTeam.id },
    };
  }

  // AppTeam 생성
  const appTeam = await prisma.appTeam.create({
    data: {
      appId,
      teamId,
      assignedBy: userId,
    },
  });

  // 감사 로그 기록
  await prisma.auditLog.create({
    data: {
      action: "ASSIGN_APP_TEAM",
      entityType: "AppTeam",
      entityId: appTeam.id,
      userId,
      organizationId,
      metadata: {
        appId,
        teamId,
        source: "payment_suggestion_auto",
      },
    },
  });

  return { success: true, data: { created: true, appTeamId: appTeam.id } };
}

// ==================== 구독 추천 (결제 내역 기반) ====================

export interface SubscriptionSuggestion {
  appId: string;
  appName: string;
  appLogoUrl: string | null;
  suggestedBillingCycle: BillingCycle;
  suggestedAmount: number;
  currency: string;
  paymentCount: number;
  firstPaymentDate: Date;
  lastPaymentDate: Date;
  confidence: number; // 0-1
  // SMP-134: Seat 구독제 판단 필드
  billingType: BillingType;
  perSeatPrice: number | null;
  suggestedSeats: number | null;
  // SMP-160: Seat 판단 메타 정보
  seatDetectionMethod?: string;
  seatDetectionConfidence?: number;
}

/**
 * SMP-107: 구독 추천 액션 타입
 * - create: 새 구독 생성 필요
 * - link: 기존 구독에 결제내역 연결만 필요
 * - update: 기존 구독 정보 업데이트 필요
 */
export type SuggestedAction = "create" | "link" | "update";

/**
 * SMP-78/SMP-107: PaymentRecord 기반 구독 추천 타입 (Team/User 배정 정보 포함)
 */
export interface PaymentRecordSuggestion extends SubscriptionSuggestion {
  teamId: string | null;
  teamName: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  availableUsers: {
    id: string;
    name: string | null;
    email: string;
    teamId: string | null;
    teamName: string | null;
  }[];
  source: "payment_record";
  // SMP-107: 추가 필드
  existingSubscriptionId?: string; // 기존 구독 ID (link 액션 시)
  suggestedAction: SuggestedAction; // 추천 액션
  unmatchedPaymentIds: string[]; // 연결 안 된 결제내역 ID들
}

/**
 * 결제 내역 기반 구독 추천 생성
 * - 동일 앱으로 매칭된 결제 내역에서 반복 패턴 감지
 * - SMP-107: 이미 구독이 있어도 연결 안 된 결제내역이 있으면 포함
 * - SMP-78: Team/User 배정 정보 포함
 */
export async function suggestSubscriptionsFromPayments(): Promise<
  ActionState<PaymentRecordSuggestion[]>
> {
  try {
    const { organizationId } = await requireOrganization();

    // 1. SMP-107: 이미 구독이 있는 앱 ID와 구독 정보 조회 (ID 매핑 포함)
    const existingSubscriptions = await prisma.subscription.findMany({
      where: { organizationId },
      select: { id: true, appId: true },
    });
    const appToSubscriptionMap = new Map(
      existingSubscriptions.map((s) => [s.appId, s.id])
    );

    // 2. 앱별 결제 내역 집계 (최근 12개월)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const paymentsByApp = await prisma.paymentRecord.groupBy({
      by: ["matchedAppId"],
      where: {
        organizationId,
        matchedAppId: { not: null },
        matchStatus: { in: ["AUTO_MATCHED", "MANUAL"] },
        transactionDate: { gte: twelveMonthsAgo },
      },
      _count: { id: true },
      _sum: { amount: true },
      _min: { transactionDate: true },
      _max: { transactionDate: true },
    });

    // 3. 각 앱별로 상세 결제 내역 조회하여 패턴 분석
    const suggestions: PaymentRecordSuggestion[] = [];

    for (const group of paymentsByApp) {
      if (!group.matchedAppId) {
        continue;
      }

      // 최소 2건 이상의 결제가 있어야 패턴 분석 가능
      if (group._count.id < 2) {
        continue;
      }

      // 앱 정보 조회 (SMP-160: pricingModel, basePricePerSeat 포함)
      const app = await prisma.app.findUnique({
        where: { id: group.matchedAppId },
        include: {
          catalog: {
            select: {
              logoUrl: true,
              pricingModel: true,
              basePricePerSeat: true,
            },
          },
        },
      });

      if (!app) continue;

      // SMP-107: 결제 내역 상세 조회 (linkedSubscriptionId 포함)
      const payments = await prisma.paymentRecord.findMany({
        where: {
          organizationId,
          matchedAppId: group.matchedAppId,
          matchStatus: { in: ["AUTO_MATCHED", "MANUAL"] },
          transactionDate: { gte: twelveMonthsAgo },
        },
        orderBy: { transactionDate: "asc" },
        select: {
          id: true, // SMP-107: ID 필요
          transactionDate: true,
          amount: true,
          currency: true,
          teamId: true,
          userId: true,
          linkedSubscriptionId: true, // SMP-107: 연결 상태 확인
        },
      });

      // SMP-107: 연결 안 된 결제내역 필터링
      const unmatchedPayments = payments.filter(
        (p) => p.linkedSubscriptionId === null
      );
      const unmatchedPaymentIds = unmatchedPayments.map((p) => p.id);

      // SMP-107: 기존 구독 확인
      const existingSubscriptionId = appToSubscriptionMap.get(
        group.matchedAppId
      );
      const hasExistingSubscription = !!existingSubscriptionId;

      // SMP-107: 기존 구독이 있고 모든 결제내역이 연결되어 있으면 스킵
      if (hasExistingSubscription && unmatchedPaymentIds.length === 0) {
        continue;
      }

      // SMP-107: 기존 구독이 없으면 최소 2건 필요, 있으면 연결 안 된 건이 있으면 OK
      if (!hasExistingSubscription && payments.length < 2) {
        continue;
      }

      // 결제 주기 분석
      const { billingCycle, confidence } = analyzeBillingCycle(payments);

      // 평균 금액 계산
      const avgAmount =
        payments.reduce((sum, p) => sum + Number(p.amount), 0) /
        payments.length;

      // SMP-134/SMP-160: Seat 구독제 자동 판단 (카탈로그 정보 포함)
      const paymentAmounts = payments.map((p) => Number(p.amount));
      const seatDetection = detectBillingType({
        appName: app.name,
        amounts: paymentAmounts,
        catalogPricingModel: app.catalog?.pricingModel ?? null,
        catalogBasePricePerSeat: app.catalog?.basePricePerSeat
          ? Number(app.catalog.basePricePerSeat)
          : null,
      });

      // SMP-78: Dominant Team/User 분석 (가장 많이 배정된 Team 또는 User)
      let teamId: string | null = null;
      let teamName: string | null = null;
      let assignedUserId: string | null = null;
      let assignedUserName: string | null = null;
      let availableUsers: AvailableUserWithTeam[] = [];

      // 배정된 결제 내역에서 dominant Team/User 계산
      const teamCounts = new Map<string, number>();
      const userCounts = new Map<string, number>();

      for (const payment of payments) {
        if (payment.teamId) {
          teamCounts.set(
            payment.teamId,
            (teamCounts.get(payment.teamId) || 0) + 1
          );
        }
        if (payment.userId) {
          userCounts.set(
            payment.userId,
            (userCounts.get(payment.userId) || 0) + 1
          );
        }
      }

      // Dominant Team 결정
      let maxTeamCount = 0;
      let dominantTeamId: string | null = null;
      for (const [tid, count] of teamCounts) {
        if (count > maxTeamCount) {
          maxTeamCount = count;
          dominantTeamId = tid;
        }
      }

      // Dominant User 결정
      let maxUserCount = 0;
      let dominantUserId: string | null = null;
      for (const [uid, count] of userCounts) {
        if (count > maxUserCount) {
          maxUserCount = count;
          dominantUserId = uid;
        }
      }

      // User 배정이 Team 배정보다 우선 (더 구체적인 배정)
      if (dominantUserId) {
        const user = await prisma.user.findUnique({
          where: { id: dominantUserId },
          select: {
            id: true,
            name: true,
            email: true,
            team: { select: { id: true, name: true } },
          },
        });
        if (user) {
          assignedUserId = user.id;
          assignedUserName = user.name || user.email;
          if (user.team) {
            teamId = user.team.id;
            teamName = user.team.name;
            // SMP-134: 유저의 팀 멤버를 availableUsers에 채우기
            const teamWithMembers = await prisma.team.findUnique({
              where: { id: user.team.id },
              include: {
                members: {
                  where: { status: "ACTIVE" },
                  select: { id: true, name: true, email: true },
                },
              },
            });
            if (teamWithMembers) {
              availableUsers = mapMembersToAvailableUsers(
                teamWithMembers.members,
                user.team!.id,
                user.team!.name
              );
              availableUsers = await appendUnassignedUsers(
                availableUsers,
                organizationId
              );
            }
          } else {
            // SMP-134: 팀이 없는 경우 조직 전체 멤버로 fallback
            const allUsers = await prisma.user.findMany({
              where: { organizationId, status: "ACTIVE" },
              select: {
                id: true,
                name: true,
                email: true,
                teamId: true,
                team: { select: { name: true } },
              },
            });
            availableUsers = mapUsersWithOwnTeam(allUsers);
          }
        }
      } else if (dominantTeamId) {
        const team = await prisma.team.findUnique({
          where: { id: dominantTeamId },
          include: {
            members: {
              where: { status: "ACTIVE" },
              select: { id: true, name: true, email: true },
            },
          },
        });
        if (team) {
          teamId = team.id;
          teamName = team.name;
          availableUsers = mapMembersToAvailableUsers(
            team.members,
            team.id,
            team.name
          );
          availableUsers = await appendUnassignedUsers(
            availableUsers,
            organizationId
          );
        }
      } else {
        // SMP-156: 팀/유저 배정이 없는 경우 조직 전체 활성 멤버로 fallback
        const allUsers = await prisma.user.findMany({
          where: { organizationId, status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            email: true,
            teamId: true,
            team: { select: { name: true } },
          },
        });
        availableUsers = mapUsersWithOwnTeam(allUsers);
      }

      // SMP-134: assignedUserId가 availableUsers에 반드시 포함되도록 보장
      if (
        assignedUserId &&
        !availableUsers.some((u) => u.id === assignedUserId)
      ) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedUserId },
          select: {
            id: true,
            name: true,
            email: true,
            teamId: true,
            team: { select: { name: true } },
          },
        });
        if (assignedUser) {
          availableUsers = [
            {
              id: assignedUser.id,
              name: assignedUser.name,
              email: assignedUser.email,
              teamId: assignedUser.teamId ?? null,
              teamName: assignedUser.team?.name ?? null,
            },
            ...availableUsers,
          ];
        }
      }

      // confidence가 0.5 이상인 경우만 추천
      if (confidence >= 0.5) {
        // SMP-107: suggestedAction 결정
        const suggestedAction: SuggestedAction = existingSubscriptionId
          ? "link"
          : "create";

        suggestions.push({
          appId: app.id,
          appName: app.name,
          appLogoUrl: app.customLogoUrl || app.catalog?.logoUrl || null,
          suggestedBillingCycle: billingCycle,
          suggestedAmount: Math.round(avgAmount),
          currency: payments[0]?.currency || "KRW",
          paymentCount: payments.length,
          firstPaymentDate: group._min.transactionDate!,
          lastPaymentDate: group._max.transactionDate!,
          confidence,
          // SMP-134/SMP-160: Seat 구독제 판단
          billingType: seatDetection.billingType,
          perSeatPrice: seatDetection.perSeatPrice,
          suggestedSeats: seatDetection.suggestedSeats,
          seatDetectionMethod: seatDetection.method,
          seatDetectionConfidence: seatDetection.confidence,
          // SMP-78: Team/User 배정 정보
          teamId,
          teamName,
          assignedUserId,
          assignedUserName,
          availableUsers,
          source: "payment_record",
          // SMP-107: 추가 필드
          existingSubscriptionId,
          suggestedAction,
          unmatchedPaymentIds,
        });
      }
    }

    // confidence 높은 순으로 정렬
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return { success: true, data: suggestions };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "구독 추천 분석 중 오류가 발생했습니다",
    };
  }
}

// ==================== availableUser 매핑 헬퍼 ====================

type AvailableUserWithTeam = {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
  teamName: string | null;
};

/**
 * 팀 멤버 목록을 AvailableUserWithTeam 배열로 변환 (팀 정보를 명시적으로 지정)
 */
function mapMembersToAvailableUsers(
  members: { id: string; name: string | null; email: string }[],
  teamId: string,
  teamName: string
): AvailableUserWithTeam[] {
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    teamId,
    teamName,
  }));
}

/**
 * 조직 전체 사용자 목록을 AvailableUserWithTeam 배열로 변환 (각 사용자의 팀 정보를 개별 사용)
 */
function mapUsersWithOwnTeam(
  users: {
    id: string;
    name: string | null;
    email: string;
    teamId: string | null;
    team: { name: string } | null;
  }[]
): AvailableUserWithTeam[] {
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    teamId: u.teamId ?? null,
    teamName: u.team?.name ?? null,
  }));
}

/**
 * availableUsers에 미배정(teamId=null) 사용자를 추가
 * 이미 포함된 사용자는 중복 추가하지 않음
 */
async function appendUnassignedUsers(
  availableUsers: AvailableUserWithTeam[],
  organizationId: string
): Promise<AvailableUserWithTeam[]> {
  const unassignedUsers = await prisma.user.findMany({
    where: { organizationId, status: "ACTIVE", teamId: null },
    select: {
      id: true,
      name: true,
      email: true,
      teamId: true,
      team: { select: { name: true } },
    },
  });
  const unassignedMapped = mapUsersWithOwnTeam(unassignedUsers);
  const existingIds = new Set(availableUsers.map((u) => u.id));
  return [
    ...availableUsers,
    ...unassignedMapped.filter((u) => !existingIds.has(u.id)),
  ];
}

/**
 * 결제 주기 분석 헬퍼 함수
 */
function analyzeBillingCycle(
  payments: { transactionDate: Date; amount: unknown }[]
): {
  billingCycle: BillingCycle;
  confidence: number;
} {
  if (payments.length < 2) {
    return { billingCycle: "MONTHLY", confidence: 0 };
  }

  // 결제 간격 계산 (일 단위)
  const intervals: number[] = [];
  for (let i = 1; i < payments.length; i++) {
    const days = Math.round(
      (new Date(payments[i].transactionDate).getTime() -
        new Date(payments[i - 1].transactionDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    intervals.push(days);
  }

  // 평균 간격 계산
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // 간격 표준편차 계산 (일관성 측정용)
  const variance =
    intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);

  // 결제 주기 판단
  let billingCycle: BillingCycle;
  let expectedInterval: number;

  if (avgInterval <= 45) {
    billingCycle = "MONTHLY";
    expectedInterval = 30;
  } else if (avgInterval <= 120) {
    billingCycle = "QUARTERLY";
    expectedInterval = 90;
  } else if (avgInterval <= 400) {
    billingCycle = "YEARLY";
    expectedInterval = 365;
  } else {
    billingCycle = "ONE_TIME";
    expectedInterval = avgInterval;
  }

  // confidence 계산: 표준편차가 작을수록, 결제 건수가 많을수록 높음
  const intervalAccuracy = Math.max(
    0,
    1 - Math.abs(avgInterval - expectedInterval) / expectedInterval
  );
  const consistencyScore = Math.max(0, 1 - stdDev / avgInterval);
  const countBonus = Math.min(1, payments.length / 6);

  const confidence =
    intervalAccuracy * 0.4 + consistencyScore * 0.4 + countBonus * 0.2;

  return { billingCycle, confidence: Math.round(confidence * 100) / 100 };
}

/**
 * 추천에서 구독 생성
 */
async function _createSubscriptionFromSuggestion(
  suggestion: SubscriptionSuggestion
): Promise<ActionState<{ id: string }>> {
  const { organizationId, userId } = await requireOrganization();

  const app = await prisma.app.findFirst({
    where: { id: suggestion.appId, organizationId },
  });

  if (!app) {
    return { success: false, message: "앱을 찾을 수 없습니다" };
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: { appId: suggestion.appId, organizationId },
  });

  if (existingSubscription) {
    return { success: false, message: "이미 해당 앱에 대한 구독이 있습니다" };
  }

  const renewalDate = calculateNextRenewalDate(
    suggestion.lastPaymentDate,
    suggestion.suggestedBillingCycle
  );

  const subscription = await prisma.subscription.create({
    data: {
      appId: suggestion.appId,
      organizationId,
      status: "ACTIVE",
      billingCycle: suggestion.suggestedBillingCycle,
      billingType: suggestion.billingType, // SMP-134
      amount: suggestion.suggestedAmount,
      perSeatPrice: suggestion.perSeatPrice, // SMP-134
      currency: suggestion.currency,
      totalLicenses: null, // SMP-160: suggestedSeats 자동 채움 제거 (사용자 입력만 사용)
      startDate: suggestion.firstPaymentDate,
      renewalDate,
      autoRenewal: true,
      renewalAlert30: true,
      notes: `결제 내역 기반 자동 생성 (${suggestion.paymentCount}건 분석, 신뢰도 ${Math.round(suggestion.confidence * 100)}%)`,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "CREATE_SUBSCRIPTION",
      entityType: "Subscription",
      entityId: subscription.id,
      userId,
      organizationId,
      metadata: {
        appName: app.name,
        source: "payment_suggestion",
        confidence: suggestion.confidence,
      },
    },
  });

  revalidatePath("/subscriptions");

  return { success: true, data: { id: subscription.id } };
}
export const createSubscriptionFromSuggestion = withLogging(
  "createSubscriptionFromSuggestion",
  _createSubscriptionFromSuggestion
);

/**
 * SMP-78: PaymentRecord 기반 구독 생성 입력 타입
 */
export interface CreateSubscriptionFromPaymentSuggestionInput {
  suggestion: PaymentRecordSuggestion;
  selectedUserIds: string[];
  billingType?: string; // SMP-134: 유저 체크박스 상태 반영
  totalLicenses?: number | null; // SMP-134: 유저 입력 총 Seat 수
}

/**
 * SMP-78/SMP-107: PaymentRecord 추천에서 구독 생성/연결
 * - suggestedAction: create → 새 구독 생성
 * - suggestedAction: link → 기존 구독에 결제내역만 연결
 * - App-Team 자동 배정, SubscriptionUser 배속
 */
async function _createSubscriptionFromPaymentSuggestion(
  input: CreateSubscriptionFromPaymentSuggestionInput
): Promise<ActionState<{ id: string }>> {
  const {
    suggestion,
    selectedUserIds,
    billingType: overrideBillingType,
    totalLicenses: overrideTotalLicenses,
  } = input;
  const { organizationId, userId, role } = await requireOrganization();

  // ADMIN만 사용자 배정 가능
  if (selectedUserIds.length > 0 && role !== "ADMIN") {
    return { success: false, message: "사용자 배정은 관리자만 가능합니다" };
  }

  const app = await prisma.app.findFirst({
    where: { id: suggestion.appId, organizationId },
  });

  if (!app) {
    return { success: false, message: "앱을 찾을 수 없습니다" };
  }

  // SMP-107: 기존 구독 확인
  const existingSubscription = await prisma.subscription.findFirst({
    where: { appId: suggestion.appId, organizationId },
  });

  // SMP-107: suggestedAction: link인 경우 - 기존 구독에 결제내역만 연결
  if (suggestion.suggestedAction === "link" && existingSubscription) {
    // 결제내역 연결
    if (suggestion.unmatchedPaymentIds.length > 0) {
      await prisma.paymentRecord.updateMany({
        where: { id: { in: suggestion.unmatchedPaymentIds } },
        data: { linkedSubscriptionId: existingSubscription.id },
      });
    }

    // 감사 로그
    await prisma.auditLog.create({
      data: {
        action: "LINK_PAYMENT_RECORDS",
        entityType: "Subscription",
        entityId: existingSubscription.id,
        userId,
        organizationId,
        metadata: {
          appName: app.name,
          linkedPaymentCount: suggestion.unmatchedPaymentIds.length,
        },
      },
    });

    revalidatePath("/subscriptions");
    revalidatePath("/payments");

    return { success: true, data: { id: existingSubscription.id } };
  }

  // suggestedAction: create인 경우 - 새 구독 생성
  if (existingSubscription) {
    return { success: false, message: "이미 해당 앱에 대한 구독이 있습니다" };
  }

  // SMP-107: App-Team 자동 배정
  await ensureAppTeamAssignment(suggestion.appId, suggestion.teamId);

  // assignedUserId가 있으면 자동으로 배정할 유저 목록에 추가
  const userIdsToAssign = new Set(selectedUserIds);
  if (suggestion.assignedUserId) {
    userIdsToAssign.add(suggestion.assignedUserId);
  }
  const finalUserIds = Array.from(userIdsToAssign);
  let userTeamIds: string[] = [];

  // 선택된 사용자 검증 (조직 소속 확인)
  if (finalUserIds.length > 0) {
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: finalUserIds },
        organizationId,
      },
      select: { id: true, teamId: true },
    });

    if (validUsers.length !== finalUserIds.length) {
      return {
        success: false,
        message: "유효하지 않은 사용자가 포함되어 있습니다",
      };
    }

    // SMP-134: 유저 배정 시 팀-앱 자동 연결
    userTeamIds = validUsers
      .filter((u) => u.teamId != null)
      .map((u) => u.teamId as string);
    if (userTeamIds.length > 0) {
      const existingAppTeams = await prisma.appTeam.findMany({
        where: { appId: suggestion.appId, teamId: { in: userTeamIds } },
        select: { teamId: true },
      });
      const existingTeamIds = new Set(existingAppTeams.map((at) => at.teamId));
      const missingTeamIds = [
        ...new Set(userTeamIds.filter((id) => !existingTeamIds.has(id))),
      ];
      if (missingTeamIds.length > 0) {
        await prisma.appTeam.createMany({
          data: missingTeamIds.map((teamId) => ({
            appId: suggestion.appId,
            teamId,
            assignedBy: userId,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  // SMP-134: billingType/totalLicenses 오버라이드
  const finalBillingType =
    (overrideBillingType as "FLAT_RATE" | "PER_SEAT") || suggestion.billingType;
  // SMP-160: suggestedSeats 자동 채움 제거 — override 값만 사용
  const finalTotalLicenses =
    overrideTotalLicenses !== undefined ? overrideTotalLicenses : null;

  const renewalDate = calculateNextRenewalDate(
    suggestion.lastPaymentDate,
    suggestion.suggestedBillingCycle
  );

  const subscription = await prisma.subscription.create({
    data: {
      appId: suggestion.appId,
      organizationId,
      teamId: suggestion.teamId,
      status: "ACTIVE",
      billingCycle: suggestion.suggestedBillingCycle,
      billingType: finalBillingType,
      amount: suggestion.suggestedAmount,
      perSeatPrice: suggestion.perSeatPrice,
      currency: suggestion.currency,
      totalLicenses: finalTotalLicenses,
      usedLicenses: finalUserIds.length > 0 ? finalUserIds.length : null,
      startDate: suggestion.firstPaymentDate,
      renewalDate,
      autoRenewal: true,
      renewalAlert30: true,
      notes: `결제 내역(CSV) 기반 자동 생성 (${suggestion.paymentCount}건 분석, 신뢰도 ${Math.round(suggestion.confidence * 100)}%)`,
    },
  });

  // SubscriptionTeam 생성 (suggestion.teamId가 있을 경우)
  if (suggestion.teamId) {
    await prisma.subscriptionTeam.create({
      data: {
        subscriptionId: subscription.id,
        teamId: suggestion.teamId,
        assignedBy: userId,
      },
    });
  }

  // SMP-107: PaymentRecord.linkedSubscriptionId 연결
  if (suggestion.unmatchedPaymentIds.length > 0) {
    await prisma.paymentRecord.updateMany({
      where: { id: { in: suggestion.unmatchedPaymentIds } },
      data: { linkedSubscriptionId: subscription.id },
    });
  }

  // SMP-107: SubscriptionUser 레코드 생성
  if (finalUserIds.length > 0) {
    await prisma.subscriptionUser.createMany({
      data: finalUserIds.map((uid) => ({
        subscriptionId: subscription.id,
        userId: uid,
        assignedBy: userId,
      })),
      skipDuplicates: true,
    });

    // SMP-180: 사용자 팀 → SubscriptionTeam 자동 연결 (suggestion.teamId 없을 때)
    if (!suggestion.teamId && userTeamIds.length > 0) {
      const uniqueUserTeamIds = [...new Set(userTeamIds)];
      await prisma.subscriptionTeam.createMany({
        data: uniqueUserTeamIds.map((tid) => ({
          subscriptionId: subscription.id,
          teamId: tid,
          assignedBy: userId,
        })),
        skipDuplicates: true,
      });

      // Dual-write: subscription.teamId 업데이트 (첫 번째 팀)
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { teamId: uniqueUserTeamIds[0] },
      });
    }
  }

  // SMP-160: Seat 판단 결과를 감사 로그에 포함
  const seatDetectionLog = {
    billingType: suggestion.billingType,
    perSeatPrice: suggestion.perSeatPrice,
    suggestedSeats: suggestion.suggestedSeats,
    method: suggestion.seatDetectionMethod ?? null,
    confidence: suggestion.seatDetectionConfidence ?? null,
    overridden: overrideBillingType
      ? overrideBillingType !== suggestion.billingType
      : false,
    overriddenTo: overrideBillingType ?? null,
  };

  await prisma.auditLog.create({
    data: {
      action: "CREATE_SUBSCRIPTION",
      entityType: "Subscription",
      entityId: subscription.id,
      userId,
      organizationId,
      metadata: {
        appName: app.name,
        source: "payment_record_suggestion",
        confidence: suggestion.confidence,
        teamId: suggestion.teamId,
        assignedUserId: suggestion.assignedUserId,
        assignedUserCount: finalUserIds.length,
        linkedPaymentCount: suggestion.unmatchedPaymentIds.length,
        seatDetection: seatDetectionLog,
      },
    },
  });

  revalidatePath("/subscriptions");
  revalidatePath("/payments");

  return { success: true, data: { id: subscription.id } };
}
export const createSubscriptionFromPaymentSuggestion = withLogging(
  "createSubscriptionFromPaymentSuggestion",
  _createSubscriptionFromPaymentSuggestion
);

// ==================== 구독 제안 카운트 (대시보드 얼럿용) ====================

/**
 * 대시보드 얼럿용 구독 제안 건수 조회
 * - PaymentRecord 및 CardTransaction 기반 미등록/미연결 구독 후보 앱 수 반환
 * - 신뢰도 계산 생략 (경량 쿼리)
 */
export async function getSuggestionCount(): Promise<
  ActionState<{ count: number }>
> {
  try {
    const { organizationId } = await requireOrganization();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const twelveMonthsAgoStr = twelveMonthsAgo
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    // 기존 구독 앱 ID 조회
    const existingSubscriptions = await prisma.subscription.findMany({
      where: { organizationId },
      select: { appId: true },
    });
    const existingAppIds = new Set(existingSubscriptions.map((s) => s.appId));

    // PaymentRecord 그룹: 전체 + 미연결
    const [paymentTotalGroups, paymentUnlinkedGroups] = await Promise.all([
      prisma.paymentRecord.groupBy({
        by: ["matchedAppId"],
        where: {
          organizationId,
          matchedAppId: { not: null },
          matchStatus: { in: ["AUTO_MATCHED", "MANUAL"] },
          transactionDate: { gte: twelveMonthsAgo },
        },
        _count: { id: true },
      }),
      prisma.paymentRecord.groupBy({
        by: ["matchedAppId"],
        where: {
          organizationId,
          matchedAppId: { not: null },
          matchStatus: { in: ["AUTO_MATCHED", "MANUAL"] },
          linkedSubscriptionId: null,
          transactionDate: { gte: twelveMonthsAgo },
        },
        _count: { id: true },
      }),
    ]);

    // CardTransaction 그룹: 전체 + 미연결
    const [cardTotalGroups, cardUnlinkedGroups] = await Promise.all([
      prisma.cardTransaction.groupBy({
        by: ["matchedAppId"],
        where: {
          organizationId,
          matchedAppId: { not: null },
          matchStatus: { in: ["AUTO_MATCHED", "MANUAL"] },
          useDt: { gte: twelveMonthsAgoStr },
        },
        _count: { id: true },
      }),
      prisma.cardTransaction.groupBy({
        by: ["matchedAppId"],
        where: {
          organizationId,
          matchedAppId: { not: null },
          matchStatus: { in: ["AUTO_MATCHED", "MANUAL"] },
          linkedSubscriptionId: null,
          useDt: { gte: twelveMonthsAgoStr },
        },
        _count: { id: true },
      }),
    ]);

    const unlinkedPaymentMap = new Map(
      paymentUnlinkedGroups.map((g) => [g.matchedAppId, g._count.id])
    );
    const unlinkedCardMap = new Map(
      cardUnlinkedGroups.map((g) => [g.matchedAppId, g._count.id])
    );

    const pendingAppIds = new Set<string>();

    // PaymentRecord 기반 후보 앱 수집
    for (const g of paymentTotalGroups) {
      if (!g.matchedAppId) continue;
      const unlinkedCount = unlinkedPaymentMap.get(g.matchedAppId) ?? 0;
      const hasExistingSub = existingAppIds.has(g.matchedAppId);

      if (hasExistingSub && unlinkedCount > 0) {
        pendingAppIds.add(g.matchedAppId);
      } else if (!hasExistingSub && g._count.id >= 2) {
        pendingAppIds.add(g.matchedAppId);
      }
    }

    // CardTransaction 기반 후보 앱 수집 (PaymentRecord와 중복 제거됨)
    for (const g of cardTotalGroups) {
      if (!g.matchedAppId) continue;
      const unlinkedCount = unlinkedCardMap.get(g.matchedAppId) ?? 0;
      const hasExistingSub = existingAppIds.has(g.matchedAppId);

      if (hasExistingSub && unlinkedCount > 0) {
        pendingAppIds.add(g.matchedAppId);
      } else if (!hasExistingSub && g._count.id >= 2) {
        pendingAppIds.add(g.matchedAppId);
      }
    }

    return { success: true, data: { count: pendingAppIds.size } };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      error: "구독 제안 수 조회 중 오류가 발생했습니다",
    };
  }
}

// ==================== 법인카드 거래 기반 구독 추천 (Phase 3) ====================

/**
 * YYYYMMDD 문자열을 Date 객체로 변환
 * CardTransaction.useDt는 "20250109" 형식이므로 직접 new Date()에 전달하면 Invalid Date
 */
function parseYYYYMMDD(dateStr: string): Date {
  return new Date(
    `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  );
}

/**
 * CardTransaction 기반 구독 추천 타입
 * - Team 자동배정: CorporateCard.teamId 또는 assignedUser.teamId 기준
 * - User 자동배정: CorporateCard.assignedUserId가 있으면 자동 배정
 * - User 선택용: Team.members 목록 제공
 * - SMP-123: PaymentRecord와 동일한 구조로 확장
 */
export interface CardTransactionSuggestion extends SubscriptionSuggestion {
  teamId: string | null;
  teamName: string | null;
  // Phase 2 추가: 카드에 배정된 유저 정보
  assignedUserId: string | null;
  assignedUserName: string | null;
  availableUsers: {
    id: string;
    name: string | null;
    email: string;
    teamId: string | null;
    teamName: string | null;
  }[];
  source: "card_transaction";
  // SMP-123: PaymentRecord와 동일한 필드 추가
  existingSubscriptionId?: string;
  suggestedAction: SuggestedAction;
  unmatchedTransactionIds: string[];
}

/**
 * CardTransaction 기반 구독 생성 입력 타입
 */
export interface CreateSubscriptionFromCardSuggestionInput {
  suggestion: CardTransactionSuggestion;
  selectedUserIds: string[];
  billingType?: string; // SMP-134: 유저 체크박스 상태 반영
  totalLicenses?: number | null; // SMP-134: 유저 입력 총 Seat 수
}

/**
 * 법인카드 거래 기반 구독 추천 생성
 * - CardTransaction에서 매칭된 앱별 반복 패턴 감지
 * - Dominant Card의 Team 정보 자동 포함
 * - Team 멤버 목록을 availableUsers로 제공
 * - SMP-123: matchStatus 필드 사용, 기존 구독 연결 지원
 */
export async function suggestFromCardTransactions(): Promise<
  ActionState<CardTransactionSuggestion[]>
> {
  const { organizationId } = await requireOrganization();

  // 1. SMP-123: 이미 구독이 있는 앱 ID와 구독 정보 조회 (ID 매핑 포함)
  const existingSubscriptions = await prisma.subscription.findMany({
    where: { organizationId },
    select: { id: true, appId: true },
  });
  const appToSubscriptionMap = new Map(
    existingSubscriptions.map((s) => [s.appId, s.id])
  );

  // 2. 최근 12개월 CardTransaction 그룹화 (matchStatus 활용)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const twelveMonthsAgoStr = twelveMonthsAgo
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const transactionsByApp = await prisma.cardTransaction.groupBy({
    by: ["matchedAppId"],
    where: {
      organizationId,
      matchedAppId: { not: null },
      matchStatus: { in: ["AUTO_MATCHED", "MANUAL"] },
      useDt: { gte: twelveMonthsAgoStr },
    },
    _count: { id: true },
    _sum: { useAmt: true },
    _min: { useDt: true },
    _max: { useDt: true },
  });

  const suggestions: CardTransactionSuggestion[] = [];

  for (const group of transactionsByApp) {
    if (!group.matchedAppId) {
      continue;
    }

    // 최소 2건 이상 필요
    if (group._count.id < 2) {
      continue;
    }

    // 앱 정보 조회 (SMP-160: pricingModel, basePricePerSeat 포함)
    const app = await prisma.app.findUnique({
      where: { id: group.matchedAppId },
      include: {
        catalog: {
          select: {
            logoUrl: true,
            pricingModel: true,
            basePricePerSeat: true,
          },
        },
      },
    });

    if (!app) continue;

    // SMP-123: 상세 거래 내역 조회 (linkedSubscriptionId 포함)
    const transactions = await prisma.cardTransaction.findMany({
      where: {
        organizationId,
        matchedAppId: group.matchedAppId,
        matchStatus: { in: ["AUTO_MATCHED", "MANUAL"] },
        useDt: { gte: twelveMonthsAgoStr },
      },
      orderBy: { useDt: "asc" },
      select: {
        id: true,
        useDt: true,
        useAmt: true,
        teamId: true,
        userId: true,
        linkedSubscriptionId: true,
      },
    });

    // SMP-123: 연결 안 된 거래내역 필터링
    const unmatchedTransactions = transactions.filter(
      (t) => t.linkedSubscriptionId === null
    );
    const unmatchedTransactionIds = unmatchedTransactions.map((t) => t.id);

    // SMP-123: 기존 구독 확인
    const existingSubscriptionId = appToSubscriptionMap.get(group.matchedAppId);
    const hasExistingSubscription = !!existingSubscriptionId;

    // SMP-123: 기존 구독이 있고 모든 거래내역이 연결되어 있으면 스킵
    if (hasExistingSubscription && unmatchedTransactionIds.length === 0) {
      continue;
    }

    // SMP-123: 기존 구독이 없으면 최소 2건 필요, 있으면 연결 안 된 건이 있으면 OK
    if (!hasExistingSubscription && transactions.length < 2) {
      continue;
    }

    // Dominant Card 조회 (가장 많이 사용된 카드)
    const dominantCardGroup = await prisma.cardTransaction.groupBy({
      by: ["corporateCardId"],
      where: {
        organizationId,
        matchedAppId: group.matchedAppId,
        useDt: { gte: twelveMonthsAgoStr },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    });

    let teamId: string | null = null;
    let teamName: string | null = null;
    let availableUsers: AvailableUserWithTeam[] = [];

    // Phase 2 추가: assignedUser 정보
    let assignedUserId: string | null = null;
    let assignedUserName: string | null = null;

    if (dominantCardGroup.length > 0) {
      const card = await prisma.corporateCard.findUnique({
        where: { id: dominantCardGroup[0].corporateCardId },
        include: {
          team: {
            include: {
              members: {
                where: { status: "ACTIVE" },
                select: { id: true, name: true, email: true, teamId: true },
              },
            },
          },
          // Phase 2: 카드에 배정된 유저 정보 포함
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Phase 2: assignedUser가 있으면 우선 사용
      if (card?.assignedUser) {
        assignedUserId = card.assignedUser.id;
        assignedUserName = card.assignedUser.name || card.assignedUser.email;
        // 유저 배정 시, 해당 유저의 팀 정보를 teamId/teamName에 설정
        if (card.assignedUser.team) {
          teamId = card.assignedUser.team.id;
          teamName = card.assignedUser.team.name;
          // SMP-134: 유저의 팀 멤버를 availableUsers에 채우기
          const teamWithMembers = await prisma.team.findUnique({
            where: { id: card.assignedUser.team.id },
            include: {
              members: {
                where: { status: "ACTIVE" },
                select: { id: true, name: true, email: true },
              },
            },
          });
          if (teamWithMembers) {
            availableUsers = mapMembersToAvailableUsers(
              teamWithMembers.members,
              card.assignedUser!.team!.id,
              card.assignedUser!.team!.name
            );
            availableUsers = await appendUnassignedUsers(
              availableUsers,
              organizationId
            );
          }
        } else {
          // SMP-134: 팀이 없는 경우 조직 전체 멤버로 fallback
          const allUsers = await prisma.user.findMany({
            where: { organizationId, status: "ACTIVE" },
            select: {
              id: true,
              name: true,
              email: true,
              teamId: true,
              team: { select: { name: true } },
            },
          });
          availableUsers = mapUsersWithOwnTeam(allUsers);
        }
      } else if (card?.team) {
        // team 배정만 있는 경우 기존 로직 유지
        teamId = card.team.id;
        teamName = card.team.name;
        availableUsers = mapMembersToAvailableUsers(
          card.team.members,
          card.team!.id,
          card.team!.name
        );
        availableUsers = await appendUnassignedUsers(
          availableUsers,
          organizationId
        );
      }
    }

    // SMP-123: CardTransaction의 Team/User 배정도 dominant 분석에 포함
    // (CorporateCard 배정이 없는 경우 대비)
    if (!teamId && !assignedUserId) {
      const teamCounts = new Map<string, number>();
      const userCounts = new Map<string, number>();

      for (const tx of transactions) {
        if (tx.teamId) {
          teamCounts.set(tx.teamId, (teamCounts.get(tx.teamId) || 0) + 1);
        }
        if (tx.userId) {
          userCounts.set(tx.userId, (userCounts.get(tx.userId) || 0) + 1);
        }
      }

      // Dominant User 우선
      let maxUserCount = 0;
      let dominantUserId: string | null = null;
      for (const [uid, count] of userCounts) {
        if (count > maxUserCount) {
          maxUserCount = count;
          dominantUserId = uid;
        }
      }

      if (dominantUserId) {
        const user = await prisma.user.findUnique({
          where: { id: dominantUserId },
          select: {
            id: true,
            name: true,
            email: true,
            team: { select: { id: true, name: true } },
          },
        });
        if (user) {
          assignedUserId = user.id;
          assignedUserName = user.name || user.email;
          if (user.team) {
            teamId = user.team.id;
            teamName = user.team.name;
            // SMP-134: 유저의 팀 멤버를 availableUsers에 채우기
            const teamWithMembers = await prisma.team.findUnique({
              where: { id: user.team.id },
              include: {
                members: {
                  where: { status: "ACTIVE" },
                  select: { id: true, name: true, email: true },
                },
              },
            });
            if (teamWithMembers) {
              availableUsers = mapMembersToAvailableUsers(
                teamWithMembers.members,
                user.team!.id,
                user.team!.name
              );
              availableUsers = await appendUnassignedUsers(
                availableUsers,
                organizationId
              );
            }
          } else {
            // SMP-134: 팀이 없는 경우 조직 전체 멤버로 fallback
            const allUsers = await prisma.user.findMany({
              where: { organizationId, status: "ACTIVE" },
              select: {
                id: true,
                name: true,
                email: true,
                teamId: true,
                team: { select: { name: true } },
              },
            });
            availableUsers = mapUsersWithOwnTeam(allUsers);
          }
        }
      } else {
        // Dominant Team
        let maxTeamCount = 0;
        let dominantTeamId: string | null = null;
        for (const [tid, count] of teamCounts) {
          if (count > maxTeamCount) {
            maxTeamCount = count;
            dominantTeamId = tid;
          }
        }

        if (dominantTeamId) {
          const team = await prisma.team.findUnique({
            where: { id: dominantTeamId },
            include: {
              members: {
                where: { status: "ACTIVE" },
                select: { id: true, name: true, email: true },
              },
            },
          });
          if (team) {
            teamId = team.id;
            teamName = team.name;
            availableUsers = mapMembersToAvailableUsers(
              team.members,
              team.id,
              team.name
            );
            availableUsers = await appendUnassignedUsers(
              availableUsers,
              organizationId
            );
          }
        } else {
          // SMP-156: 팀/유저 배정이 없는 경우 조직 전체 활성 멤버로 fallback
          const allUsers = await prisma.user.findMany({
            where: { organizationId, status: "ACTIVE" },
            select: {
              id: true,
              name: true,
              email: true,
              teamId: true,
              team: { select: { name: true } },
            },
          });
          availableUsers = mapUsersWithOwnTeam(allUsers);
        }
      }
    }

    // SMP-134: assignedUserId가 availableUsers에 반드시 포함되도록 보장
    if (
      assignedUserId &&
      !availableUsers.some((u) => u.id === assignedUserId)
    ) {
      const assignedUserRecord = await prisma.user.findUnique({
        where: { id: assignedUserId },
        select: {
          id: true,
          name: true,
          email: true,
          teamId: true,
          team: { select: { name: true } },
        },
      });
      if (assignedUserRecord) {
        availableUsers = [
          {
            id: assignedUserRecord.id,
            name: assignedUserRecord.name,
            email: assignedUserRecord.email,
            teamId: assignedUserRecord.teamId ?? null,
            teamName: assignedUserRecord.team?.name ?? null,
          },
          ...availableUsers,
        ];
      }
    }

    // 결제 주기 분석 (기존 함수 재사용)
    const paymentsForAnalysis = transactions.map((t) => ({
      transactionDate: parseYYYYMMDD(t.useDt),
      amount: t.useAmt,
    }));
    const { billingCycle, confidence } =
      analyzeBillingCycle(paymentsForAnalysis);

    // 평균 금액 계산
    const avgAmount =
      transactions.reduce((sum, t) => sum + Number(t.useAmt), 0) /
      transactions.length;

    // SMP-134/SMP-160: Seat 구독제 자동 판단 (카탈로그 정보 포함)
    const txAmounts = transactions.map((t) => Number(t.useAmt));
    const cardSeatDetection = detectBillingType({
      appName: app.name,
      amounts: txAmounts,
      catalogPricingModel: app.catalog?.pricingModel ?? null,
      catalogBasePricePerSeat: app.catalog?.basePricePerSeat
        ? Number(app.catalog.basePricePerSeat)
        : null,
    });

    // confidence >= 0.5 필터링
    if (confidence >= 0.5) {
      // SMP-123: suggestedAction 결정
      const suggestedAction: SuggestedAction = existingSubscriptionId
        ? "link"
        : "create";

      suggestions.push({
        appId: app.id,
        appName: app.name,
        appLogoUrl: app.customLogoUrl || app.catalog?.logoUrl || null,
        suggestedBillingCycle: billingCycle,
        suggestedAmount: Math.round(avgAmount),
        currency: "KRW", // CardTransaction에는 currency 필드 없음, 기본값 사용
        paymentCount: transactions.length,
        firstPaymentDate: parseYYYYMMDD(group._min.useDt!),
        lastPaymentDate: parseYYYYMMDD(group._max.useDt!),
        confidence,
        // SMP-134/SMP-160: Seat 구독제 판단
        billingType: cardSeatDetection.billingType,
        perSeatPrice: cardSeatDetection.perSeatPrice,
        suggestedSeats: cardSeatDetection.suggestedSeats,
        seatDetectionMethod: cardSeatDetection.method,
        seatDetectionConfidence: cardSeatDetection.confidence,
        teamId,
        teamName,
        assignedUserId,
        assignedUserName,
        availableUsers,
        source: "card_transaction",
        // SMP-123: 추가 필드
        existingSubscriptionId,
        suggestedAction,
        unmatchedTransactionIds,
      });
    }
  }

  // confidence 높은 순 정렬
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return { success: true, data: suggestions };
}

/**
 * CardTransaction 추천에서 구독 생성/연결 (Team 자동배정 + User 수동선택)
 * SMP-123: suggestedAction에 따라 create 또는 link 액션 수행
 */
async function _createSubscriptionFromCardSuggestion(
  input: CreateSubscriptionFromCardSuggestionInput
): Promise<ActionState<{ id: string }>> {
  const {
    suggestion,
    selectedUserIds,
    billingType: overrideBillingType,
    totalLicenses: overrideTotalLicenses,
  } = input;
  const { organizationId, userId, role } = await requireOrganization();

  // ADMIN만 사용자 배정 가능
  if (selectedUserIds.length > 0 && role !== "ADMIN") {
    return { success: false, message: "사용자 배정은 관리자만 가능합니다" };
  }

  const app = await prisma.app.findFirst({
    where: { id: suggestion.appId, organizationId },
  });

  if (!app) {
    return { success: false, message: "앱을 찾을 수 없습니다" };
  }

  // SMP-123: 기존 구독 확인
  const existingSubscription = await prisma.subscription.findFirst({
    where: { appId: suggestion.appId, organizationId },
  });

  // SMP-123: suggestedAction: link인 경우 - 기존 구독에 거래내역만 연결
  if (suggestion.suggestedAction === "link" && existingSubscription) {
    // 거래내역 연결
    if (suggestion.unmatchedTransactionIds.length > 0) {
      await prisma.cardTransaction.updateMany({
        where: { id: { in: suggestion.unmatchedTransactionIds } },
        data: { linkedSubscriptionId: existingSubscription.id },
      });
    }

    // 감사 로그
    await prisma.auditLog.create({
      data: {
        action: "LINK_CARD_TRANSACTIONS",
        entityType: "Subscription",
        entityId: existingSubscription.id,
        userId,
        organizationId,
        metadata: {
          appName: app.name,
          linkedTransactionCount: suggestion.unmatchedTransactionIds.length,
        },
      },
    });

    revalidatePath("/subscriptions");
    revalidatePath("/payments");

    return { success: true, data: { id: existingSubscription.id } };
  }

  // suggestedAction: create인 경우 - 새 구독 생성
  if (existingSubscription) {
    return { success: false, message: "이미 해당 앱에 대한 구독이 있습니다" };
  }

  // SMP-123: App-Team 자동 배정
  await ensureAppTeamAssignment(suggestion.appId, suggestion.teamId);

  // Phase 2: assignedUserId가 있으면 자동으로 배정할 유저 목록에 추가
  const userIdsToAssign = new Set(selectedUserIds);
  if (suggestion.assignedUserId) {
    userIdsToAssign.add(suggestion.assignedUserId);
  }
  const finalUserIds = Array.from(userIdsToAssign);
  let userTeamIds: string[] = [];

  // 선택된 사용자 검증 (조직 소속 확인)
  if (finalUserIds.length > 0) {
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: finalUserIds },
        organizationId,
      },
      select: { id: true, teamId: true },
    });

    if (validUsers.length !== finalUserIds.length) {
      return {
        success: false,
        message: "유효하지 않은 사용자가 포함되어 있습니다",
      };
    }

    // SMP-134: 유저 배정 시 팀-앱 자동 연결
    userTeamIds = validUsers
      .filter((u) => u.teamId != null)
      .map((u) => u.teamId as string);
    if (userTeamIds.length > 0) {
      const existingAppTeams = await prisma.appTeam.findMany({
        where: { appId: suggestion.appId, teamId: { in: userTeamIds } },
        select: { teamId: true },
      });
      const existingTeamIds = new Set(existingAppTeams.map((at) => at.teamId));
      const missingTeamIds = [
        ...new Set(userTeamIds.filter((id) => !existingTeamIds.has(id))),
      ];
      if (missingTeamIds.length > 0) {
        await prisma.appTeam.createMany({
          data: missingTeamIds.map((teamId) => ({
            appId: suggestion.appId,
            teamId,
            assignedBy: userId,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  // SMP-134: billingType/totalLicenses 오버라이드
  const finalBillingType =
    (overrideBillingType as "FLAT_RATE" | "PER_SEAT") || suggestion.billingType;
  // SMP-160: suggestedSeats 자동 채움 제거 — override 값만 사용
  const finalTotalLicenses =
    overrideTotalLicenses !== undefined ? overrideTotalLicenses : null;

  const renewalDate = calculateNextRenewalDate(
    suggestion.lastPaymentDate,
    suggestion.suggestedBillingCycle
  );

  const subscription = await prisma.subscription.create({
    data: {
      appId: suggestion.appId,
      organizationId,
      teamId: suggestion.teamId,
      status: "ACTIVE",
      billingCycle: suggestion.suggestedBillingCycle,
      billingType: finalBillingType,
      amount: suggestion.suggestedAmount,
      perSeatPrice: suggestion.perSeatPrice,
      currency: suggestion.currency,
      totalLicenses: finalTotalLicenses,
      usedLicenses: finalUserIds.length > 0 ? finalUserIds.length : null,
      startDate: suggestion.firstPaymentDate,
      renewalDate,
      autoRenewal: true,
      renewalAlert30: true,
      notes: `법인카드 거래 기반 자동 생성 (${suggestion.paymentCount}건 분석, 신뢰도 ${Math.round(suggestion.confidence * 100)}%)`,
    },
  });

  // SubscriptionTeam 생성 (suggestion.teamId가 있을 경우)
  if (suggestion.teamId) {
    await prisma.subscriptionTeam.create({
      data: {
        subscriptionId: subscription.id,
        teamId: suggestion.teamId,
        assignedBy: userId,
      },
    });
  }

  // SMP-123: CardTransaction.linkedSubscriptionId 연결
  if (suggestion.unmatchedTransactionIds.length > 0) {
    await prisma.cardTransaction.updateMany({
      where: { id: { in: suggestion.unmatchedTransactionIds } },
      data: { linkedSubscriptionId: subscription.id },
    });
  }

  // SubscriptionUser 레코드 생성
  if (finalUserIds.length > 0) {
    await prisma.subscriptionUser.createMany({
      data: finalUserIds.map((uid) => ({
        subscriptionId: subscription.id,
        userId: uid,
        assignedBy: userId,
      })),
      skipDuplicates: true,
    });

    // SMP-180: 사용자 팀 → SubscriptionTeam 자동 연결 (suggestion.teamId 없을 때)
    if (!suggestion.teamId && userTeamIds.length > 0) {
      const uniqueUserTeamIds = [...new Set(userTeamIds)];
      await prisma.subscriptionTeam.createMany({
        data: uniqueUserTeamIds.map((tid) => ({
          subscriptionId: subscription.id,
          teamId: tid,
          assignedBy: userId,
        })),
        skipDuplicates: true,
      });

      // Dual-write: subscription.teamId 업데이트 (첫 번째 팀)
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { teamId: uniqueUserTeamIds[0] },
      });
    }
  }

  // SMP-160: Seat 판단 결과를 감사 로그에 포함
  const cardSeatDetectionLog = {
    billingType: suggestion.billingType,
    perSeatPrice: suggestion.perSeatPrice,
    suggestedSeats: suggestion.suggestedSeats,
    method: suggestion.seatDetectionMethod ?? null,
    confidence: suggestion.seatDetectionConfidence ?? null,
    overridden: overrideBillingType
      ? overrideBillingType !== suggestion.billingType
      : false,
    overriddenTo: overrideBillingType ?? null,
  };

  await prisma.auditLog.create({
    data: {
      action: "CREATE_SUBSCRIPTION",
      entityType: "Subscription",
      entityId: subscription.id,
      userId,
      organizationId,
      metadata: {
        appName: app.name,
        source: "card_transaction_suggestion",
        confidence: suggestion.confidence,
        teamId: suggestion.teamId,
        assignedUserId: suggestion.assignedUserId,
        assignedUserCount: finalUserIds.length,
        linkedTransactionCount: suggestion.unmatchedTransactionIds.length,
        seatDetection: cardSeatDetectionLog,
      },
    },
  });

  revalidatePath("/subscriptions");
  revalidatePath("/payments");

  return { success: true, data: { id: subscription.id } };
}
export const createSubscriptionFromCardSuggestion = withLogging(
  "createSubscriptionFromCardSuggestion",
  _createSubscriptionFromCardSuggestion
);
