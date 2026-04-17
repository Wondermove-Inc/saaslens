// src/components/super-admin/invitations-history-table.tsx
"use client";

import {
  resendTenantInvitation,
  type TenantInvitationInfo,
} from "@/actions/super-admin/admin-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "대기 중", variant: "default" },
  ACCEPTED: { label: "수락됨", variant: "secondary" },
  EXPIRED: { label: "만료됨", variant: "destructive" },
  CANCELLED: { label: "취소됨", variant: "outline" },
};

interface InvitationsHistoryTableProps {
  invitations: TenantInvitationInfo[];
}

export function InvitationsHistoryTable({
  invitations: initialInvitations,
}: InvitationsHistoryTableProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleResend = async (id: string) => {
    setLoadingId(id);
    const result = await resendTenantInvitation(id);
    setLoadingId(null);

    if (result.success) {
      toast.success(result.message ?? "재발송되었습니다.");
      // 만료일 갱신 표시
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? {
                ...inv,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              }
            : inv
        )
      );
    } else {
      toast.error(result.message ?? "재발송에 실패했습니다.");
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        발송된 초대가 없습니다.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이메일</TableHead>
          <TableHead>역할</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>발송일</TableHead>
          <TableHead>만료일</TableHead>
          <TableHead className="w-24">관리</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((inv) => {
          const status = statusConfig[inv.status] ?? {
            label: inv.status,
            variant: "outline" as const,
          };
          const isExpired = new Date() > new Date(inv.expiresAt);

          return (
            <TableRow key={inv.id}>
              <TableCell className="font-medium">{inv.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {inv.role === "ADMIN" ? "관리자" : inv.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    isExpired && inv.status === "PENDING"
                      ? "destructive"
                      : status.variant
                  }
                >
                  {isExpired && inv.status === "PENDING"
                    ? "만료됨"
                    : status.label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(inv.createdAt).toLocaleDateString("ko-KR")}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(inv.expiresAt).toLocaleDateString("ko-KR")}
              </TableCell>
              <TableCell>
                {inv.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingId === inv.id}
                    onClick={() => handleResend(inv.id)}
                  >
                    {loadingId === inv.id ? "발송 중..." : "재발송"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
