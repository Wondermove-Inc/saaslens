// src/components/team/invitation-list.tsx
"use client";

import { cancelInvitation, resendInvitation } from "@/actions/invitations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvitationStatus, UserRole } from "@prisma/client";
import { Mail, MoreHorizontal, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

interface InvitationListProps {
  invitations: Array<{
    id: string;
    email: string;
    role: UserRole;
    status: InvitationStatus;
    createdAt: Date;
    expiresAt: Date;
    invitedBy: {
      name: string | null;
    } | null;
  }>;
}

// Status Colors 매핑 (color-theme-guide.md 기준)
// PENDING: info-muted (대기 중, 중립적)
// ACCEPTED: success-muted (완료, 긍정적)
// EXPIRED: destructive-muted (만료, 부정적)
// CANCELLED: warning-muted (취소, 주의 필요)
const statusStyles: Record<
  InvitationStatus,
  { variant: "secondary"; className: string }
> = {
  PENDING: {
    variant: "secondary",
    className: "bg-info-muted text-info-muted-foreground border-0",
  },
  ACCEPTED: {
    variant: "secondary",
    className: "bg-success-muted text-success-muted-foreground border-0",
  },
  EXPIRED: {
    variant: "secondary",
    className:
      "bg-destructive-muted text-destructive-muted-foreground border-0",
  },
  CANCELLED: {
    variant: "secondary",
    className: "bg-warning-muted text-warning-muted-foreground border-0",
  },
};

function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function InvitationRow({
  invitation,
}: {
  invitation: InvitationListProps["invitations"][0];
}) {
  const t = useTranslations("teamMembers.invitationList");
  const [isPending, startTransition] = useTransition();

  const getRoleLabel = (role: UserRole): string => {
    return t(`roles.${role.toLowerCase()}`);
  };

  const getStatusLabel = (status: InvitationStatus): string => {
    return t(`status.${status.toLowerCase()}`);
  };

  const handleResend = () => {
    startTransition(async () => {
      await resendInvitation(invitation.id);
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      await cancelInvitation(invitation.id);
    });
  };

  const isExpired =
    invitation.status === "PENDING" &&
    new Date() > new Date(invitation.expiresAt);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Mail className="text-muted-foreground h-4 w-4" />
          {invitation.email}
        </div>
      </TableCell>
      <TableCell>{getRoleLabel(invitation.role)}</TableCell>
      <TableCell>
        <Badge
          variant={
            statusStyles[isExpired ? "EXPIRED" : invitation.status].variant
          }
          className={
            statusStyles[isExpired ? "EXPIRED" : invitation.status].className
          }
        >
          {isExpired ? t("status.expired") : getStatusLabel(invitation.status)}
        </Badge>
      </TableCell>
      <TableCell>{invitation.invitedBy?.name || "-"}</TableCell>
      <TableCell>{formatDate(invitation.createdAt)}</TableCell>
      <TableCell>
        {invitation.status === "PENDING" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isPending}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleResend} disabled={isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("actions.resend")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleCancel}
                disabled={isPending}
                className="text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                {t("actions.cancel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

export function InvitationList({ invitations }: InvitationListProps) {
  const t = useTranslations("teamMembers.invitationList");

  if (invitations.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">{t("empty")}</div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("table.email")}</TableHead>
          <TableHead>{t("table.role")}</TableHead>
          <TableHead>{t("table.status")}</TableHead>
          <TableHead>{t("table.inviter")}</TableHead>
          <TableHead>{t("table.invitedAt")}</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <InvitationRow key={invitation.id} invitation={invitation} />
        ))}
      </TableBody>
    </Table>
  );
}
