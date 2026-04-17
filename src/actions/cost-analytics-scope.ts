// src/actions/cost-analytics-scope.ts

import type { CostAnalyticsFilters } from "@/types/cost-analytics";

export interface ReportScope {
  teamId?: string;
  userId?: string;
  enforceTeamId?: string;
}

export function resolveReportScope(
  filters: CostAnalyticsFilters,
  sessionUser: {
    id: string;
    role?: string | null;
    teamId?: string | null;
  }
): ReportScope {
  const isRestricted = sessionUser.role !== "ADMIN";
  const memberTeamId = sessionUser.teamId ?? undefined;

  if (!isRestricted) {
    return { teamId: filters.teamId, userId: filters.userId };
  }

  if (!memberTeamId) {
    return {
      userId: sessionUser.id,
      enforceTeamId: undefined,
    };
  }

  return {
    teamId: memberTeamId,
    userId: filters.userId,
    enforceTeamId: memberTeamId,
  };
}

export function applyPaymentRecordScope(
  where: Record<string, unknown>,
  scope: ReportScope
) {
  if (scope.userId) {
    where.userId = scope.userId;
    if (scope.enforceTeamId) {
      where.user = { teamId: scope.enforceTeamId };
    }
    return;
  }

  if (scope.teamId) {
    where.OR = [{ teamId: scope.teamId }, { user: { teamId: scope.teamId } }];
  }
}

export function applyCardTransactionScope(
  where: Record<string, unknown>,
  scope: ReportScope
) {
  if (scope.userId) {
    where.corporateCard = scope.enforceTeamId
      ? {
          assignedUserId: scope.userId,
          assignedUser: { teamId: scope.enforceTeamId },
        }
      : { assignedUserId: scope.userId };
    return;
  }

  if (scope.teamId) {
    where.corporateCard = {
      OR: [
        { teamId: scope.teamId },
        { assignedUser: { teamId: scope.teamId } },
      ],
    };
  }
}
