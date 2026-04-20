// src/actions/subscriptions/subscription-crud-read.ts
"use server";

/**
 * Subscription 조회 관련 Server Actions
 */

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { ActionState, PaginatedResponse } from "@/types";
import type {
  SubscriptionDetail,
  SubscriptionListItem,
} from "@/types/subscription";
import { cache } from "react";

import type {
  GetSubscriptionsParams,
  LinkedPayment,
} from "./subscription-crud.types";

/**
 * 구독 목록 조회
 */
export async function getSubscriptions(
  params: GetSubscriptionsParams = {}
): Promise<PaginatedResponse<SubscriptionListItem>> {
  const { organizationId, role, userId, teamId } = await requireOrganization();

  const {
    filter = {},
    sort = { sortBy: "renewalDate", sortOrder: "asc" },
    page = 1,
    limit = 20,
  } = params;
  const skip = (page - 1) * limit;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId };

  // MEMBER: 팀 소속 구독만 조회 (subscription.teamId 기반)
  // VIEWER: 자신이 배정된 구독만 조회
  if (role === "MEMBER") {
    if (!teamId) {
      // 팀 미배정 MEMBER: 빈 목록 반환
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }
    where.teamId = teamId;
  } else if (role === "VIEWER") {
    where.assignedUsers = { some: { userId } };
  }

  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.appId) {
    where.appId = filter.appId;
  }
  if (filter.billingCycle) {
    where.billingCycle = filter.billingCycle;
  }
  if (filter.search) {
    where.app = { name: { contains: filter.search, mode: "insensitive" } };
  }
  if (filter.renewingWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filter.renewingWithinDays);
    where.renewalDate = { lte: futureDate, gte: new Date() };
  }

  // Build orderBy
  let orderBy = {};
  if (sort.sortBy === "appName") {
    orderBy = { app: { name: sort.sortOrder || "asc" } };
  } else if (sort.sortBy) {
    orderBy = { [sort.sortBy]: sort.sortOrder || "asc" };
  } else {
    orderBy = { renewalDate: "asc" };
  }

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        app: {
          select: {
            id: true,
            name: true,
            customLogoUrl: true,
            catalog: { select: { logoUrl: true } },
          },
        },
        // Team 배정 정보 (단일, deprecated)
        team: { select: { id: true, name: true } },
        // Team 배정 정보 (다중)
        subscriptionTeams: {
          include: { team: { select: { id: true, name: true } } },
        },
        // User 배정 정보
        assignedUsers: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.subscription.count({ where }),
  ]);

  const items: SubscriptionListItem[] = subscriptions.map((sub) => ({
    id: sub.id,
    appId: sub.appId,
    appName: sub.app.name,
    appLogoUrl: sub.app.customLogoUrl || sub.app.catalog?.logoUrl || null,
    status: sub.status,
    billingCycle: sub.billingCycle,
    billingType: sub.billingType,
    amount: Number(sub.amount),
    perSeatPrice: sub.perSeatPrice ? Number(sub.perSeatPrice) : null,
    currency: sub.currency,
    totalLicenses: sub.totalLicenses,
    usedLicenses: sub.usedLicenses,
    startDate: sub.startDate,
    endDate: sub.endDate,
    renewalDate: sub.renewalDate,
    autoRenewal: sub.autoRenewal,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    // Team 배정 (단일, deprecated)
    teamId: sub.teamId,
    teamName: sub.team?.name ?? null,
    // Team 배정 (다중)
    teams:
      sub.subscriptionTeams?.map((st) => ({
        id: st.team.id,
        name: st.team.name,
      })) ?? [],
    // User 배정 (다중)
    assignedUsers: sub.assignedUsers.map((su) => ({
      id: su.user.id,
      name: su.user.name,
      email: su.user.email,
    })),
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 구독 상세 조회
 */
export async function getSubscription(
  id: string
): Promise<SubscriptionDetail | null> {
  const { organizationId, role, userId } = await requireOrganization();

  // MEMBER/VIEWER는 자신이 배정된 구독만 조회 가능
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { id, organizationId };
  if (role !== "ADMIN") {
    where.assignedUsers = {
      some: { userId },
    };
  }

  const subscription = await prisma.subscription.findFirst({
    where,
    include: {
      app: {
        select: {
          id: true,
          name: true,
          customLogoUrl: true,
          catalog: { select: { logoUrl: true } },
        },
      },
      // Team 배정 정보 (단일, deprecated)
      team: { select: { id: true, name: true } },
      // Team 배정 정보 (다중)
      subscriptionTeams: {
        include: { team: { select: { id: true, name: true } } },
      },
      // User 배정 정보
      assignedUsers: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!subscription) {
    return null;
  }

  return {
    id: subscription.id,
    appId: subscription.appId,
    appName: subscription.app.name,
    appLogoUrl:
      subscription.app.customLogoUrl ||
      subscription.app.catalog?.logoUrl ||
      null,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    billingType: subscription.billingType,
    amount: Number(subscription.amount),
    perSeatPrice: subscription.perSeatPrice
      ? Number(subscription.perSeatPrice)
      : null,
    currency: subscription.currency,
    totalLicenses: subscription.totalLicenses,
    usedLicenses: subscription.usedLicenses,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    renewalDate: subscription.renewalDate,
    autoRenewal: subscription.autoRenewal,
    renewalAlert30: subscription.renewalAlert30,
    renewalAlert60: subscription.renewalAlert60,
    renewalAlert90: subscription.renewalAlert90,
    contractUrl: subscription.contractUrl,
    notes: subscription.notes,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    // Team 배정 (단일, deprecated)
    teamId: subscription.teamId,
    teamName: subscription.team?.name ?? null,
    team: subscription.team,
    // Team 배정 (다중)
    teams:
      subscription.subscriptionTeams?.map((st) => ({
        id: st.team.id,
        name: st.team.name,
      })) ?? [],
    // User 배정 (다중)
    assignedUsers: subscription.assignedUsers.map((su) => ({
      id: su.user.id,
      name: su.user.name,
      email: su.user.email,
    })),
  };
}

// 동일 요청 내에서 구독 상세를 중복 호출할 때 캐시로 DB 조회를 한 번만 수행
export const getSubscriptionCached = cache(getSubscription);

/**
 * 구독에 연결된 결제 내역 조회
 */
export async function getLinkedPayments(
  subscriptionId: string
): Promise<ActionState<LinkedPayment[]>> {
  try {
    const { organizationId } = await requireOrganization();

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, organizationId },
      select: { id: true },
    });

    if (!subscription) {
      return {
        success: false,
        message: "구독을 찾을 수 없습니다",
      };
    }

    const payments = await prisma.paymentRecord.findMany({
      where: {
        linkedSubscriptionId: subscriptionId,
        organizationId,
      },
      select: {
        id: true,
        transactionDate: true,
        merchantName: true,
        amount: true,
        currency: true,
        cardLast4: true,
      },
      orderBy: {
        transactionDate: "desc",
      },
    });

    return {
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        transactionDate: p.transactionDate,
        merchantName: p.merchantName,
        amount: Number(p.amount),
        currency: p.currency,
        cardLast4: p.cardLast4,
      })),
    };
  } catch (error) {
    console.error("getLinkedPayments error:", error);
    return {
      success: false,
      message: "연결된 결제 내역 조회에 실패했습니다",
    };
  }
}
