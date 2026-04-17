// src/components/cards/card-failure-badge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

interface CardFailureBadgeProps {
  lastSyncAt: Date | string | null;
  lastError: string | null;
  consecutiveFailCount: number;
}

export function CardFailureBadge({
  lastSyncAt,
  lastError,
  consecutiveFailCount,
}: CardFailureBadgeProps) {
  // Priority: destructive (consecutive >= 3) > warning (lastError) > success > secondary (not synced)

  if (consecutiveFailCount >= 3) {
    return (
      <Badge
        data-testid="card-failure-badge"
        className="bg-destructive-muted text-destructive-muted-foreground gap-1"
      >
        <XCircle className="h-3 w-3" />
        연속 {consecutiveFailCount}회 실패
      </Badge>
    );
  }

  if (lastError) {
    return (
      <Badge
        data-testid="card-failure-badge"
        className="bg-warning-muted text-warning-muted-foreground gap-1"
      >
        <AlertCircle className="h-3 w-3" />
        오류
      </Badge>
    );
  }

  if (lastSyncAt) {
    return (
      <Badge
        data-testid="card-failure-badge"
        className="bg-success-muted text-success-muted-foreground gap-1"
      >
        <CheckCircle className="h-3 w-3" />
        동기화됨
      </Badge>
    );
  }

  return (
    <Badge
      data-testid="card-failure-badge"
      variant="secondary"
      className="gap-1"
    >
      <Clock className="h-3 w-3" />
      미동기화
    </Badge>
  );
}
