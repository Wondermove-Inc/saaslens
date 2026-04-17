// src/actions/users-read.ts
"use server";

/**
 * User 조회 관련 Server Actions
 */

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type {
  TerminatedUserWithAccess,
  UserDetail,
  UserListItem,
  UserSubscriptionSummary,
} from "@/types/user";
import { cache } from "react";

import type { GetUsersParams } from "./users.types";

/**
 * 사용자 목록 조회
 */
export async function getUsers(params: GetUsersParams = {}): Promise<{
  items: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { organizationId } = await requireOrganization();

  const { filter, sort, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    organizationId,
  };

  if (filter?.status) {
    where.status = filter.status;
  }

  if (filter?.role) {
    where.role = filter.role;
  }

  if (filter?.department) {
    where.department = filter.department;
  }

  if (filter?.search) {
    where.OR = [
      { email: { contains: filter.search, mode: "insensitive" } },
      { name: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  if (filter?.hasTerminatedAccess) {
    where.status = "TERMINATED";
    where.appAccesses = { some: {} };
  }

  // Build orderBy clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { createdAt: "desc" };

  if (sort?.sortBy) {
    orderBy = { [sort.sortBy]: sort.sortOrder || "desc" };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        subscriptionAssignments: {
          select: {
            subscription: {
              select: { appId: true },
            },
          },
        },
        team: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items: UserListItem[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    department: user.department,
    team: user.team ? { id: user.team.id, name: user.team.name } : null,
    jobTitle: user.jobTitle,
    lastLoginAt: user.lastLoginAt,
    terminatedAt: user.terminatedAt,
    assignedAppCount: new Set(
      user.subscriptionAssignments
        .map((sa) => sa.subscription.appId)
        .filter((id): id is string => id !== null)
    ).size,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
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
 * 사용자 상세 조회
 */
export async function getUser(id: string): Promise<UserDetail | null> {
  const { organizationId } = await requireOrganization();

  const [user, ownedSubscriptions] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        subscriptionAssignments: {
          select: {
            subscription: {
              select: { appId: true },
            },
          },
        },
        team: {
          select: { id: true, name: true },
        },
        appAccesses: {
          include: {
            app: {
              include: {
                catalog: true,
              },
            },
          },
          orderBy: { grantedAt: "desc" },
        },
      },
    }),
    // 사용자에게 할당된 구독 요약 (subscriptionAssignments 기준)
    prisma.subscription.findMany({
      where: {
        organizationId,
        assignedUsers: { some: { userId: id } },
      },
      select: {
        amount: true,
        currency: true,
        billingCycle: true,
        renewalDate: true,
        status: true,
      },
    }),
  ]);

  if (!user) {
    return null;
  }

  const subscriptionSummary: UserSubscriptionSummary | undefined = (() => {
    if (ownedSubscriptions.length === 0) return undefined;
    const currency = ownedSubscriptions[0]?.currency || "KRW";
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const renewingSoon = ownedSubscriptions.filter((sub) => {
      if (!sub.renewalDate) return false;
      const d = new Date(sub.renewalDate);
      return d >= now && d <= thirtyDaysLater;
    }).length;

    const monthlyAmount = ownedSubscriptions.reduce((sum, sub) => {
      const amt = Number(sub.amount);
      switch (sub.billingCycle) {
        case "YEARLY":
          return sum + amt / 12;
        case "QUARTERLY":
          return sum + amt / 3;
        case "ONE_TIME":
          return sum;
        case "MONTHLY":
        default:
          return sum + amt;
      }
    }, 0);

    return {
      total: ownedSubscriptions.length,
      currency,
      monthlyAmount: Math.round(monthlyAmount),
      renewingSoon,
    };
  })();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    department: user.department,
    team: user.team ? { id: user.team.id, name: user.team.name } : null,
    jobTitle: user.jobTitle,
    employeeId: user.employeeId,
    lastLoginAt: user.lastLoginAt,
    terminatedAt: user.terminatedAt,
    assignedAppCount: new Set(
      user.subscriptionAssignments
        .map((sa) => sa.subscription.appId)
        .filter((id): id is string => id !== null)
    ).size,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    appAccesses: user.appAccesses.map((access) => ({
      id: access.id,
      appId: access.appId,
      appName: access.app.name,
      appLogoUrl:
        access.app.customLogoUrl || access.app.catalog?.logoUrl || null,
      accessLevel: access.accessLevel,
      grantedAt: access.grantedAt,
      lastUsedAt: access.lastUsedAt,
      source: access.source,
    })),
    subscriptionSummary,
  };
}

// 메타데이터와 페이지 렌더링 간 동일 사용자 상세 조회를 캐시해 중복 DB 호출을 방지
export const getUserCached = cache(getUser);

/**
 * 퇴사자 중 미회수 접근권한이 있는 사용자 목록 조회
 */
export async function getTerminatedUsersWithAccess(): Promise<
  TerminatedUserWithAccess[]
> {
  const { organizationId } = await requireOrganization();

  const terminatedUsers = await prisma.user.findMany({
    where: {
      organizationId,
      status: "TERMINATED",
      OR: [
        { appAccesses: { some: {} } },
        { subscriptionAssignments: { some: {} } },
      ],
    },
    include: {
      _count: {
        select: { appAccesses: true, subscriptionAssignments: true },
      },
      appAccesses: {
        include: {
          app: {
            include: {
              catalog: true,
            },
          },
        },
      },
      subscriptionAssignments: {
        include: {
          subscription: {
            include: {
              app: { include: { catalog: true } },
            },
          },
        },
      },
    },
    orderBy: { terminatedAt: "desc" },
  });

  return terminatedUsers.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    department: user.department,
    jobTitle: user.jobTitle,
    terminatedAt: user.terminatedAt!,
    unrevokedAccessCount:
      user._count.appAccesses + user._count.subscriptionAssignments,
    appAccesses: user.appAccesses.map((access) => ({
      id: access.id,
      appId: access.appId,
      appName: access.app.name,
      appLogoUrl:
        access.app.customLogoUrl || access.app.catalog?.logoUrl || null,
      accessLevel: access.accessLevel,
      grantedAt: access.grantedAt,
      lastUsedAt: access.lastUsedAt,
      source: access.source,
    })),
    subscriptionAssignments: user.subscriptionAssignments.map((sa) => ({
      id: sa.id,
      subscriptionId: sa.subscriptionId,
      appId: sa.subscription.appId,
      appName: sa.subscription.app.name,
      appLogoUrl:
        sa.subscription.app.customLogoUrl ||
        sa.subscription.app.catalog?.logoUrl ||
        null,
      billingCycle: sa.subscription.billingCycle,
      billingType: sa.subscription.billingType,
      assignedAt: sa.assignedAt,
    })),
  }));
}
