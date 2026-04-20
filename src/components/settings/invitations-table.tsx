// src/components/settings/invitations-table.tsx
"use client";

import {
  cancelInvitation,
  resendInvitation,
  type InvitationWithInviter,
} from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatKoreanDateTime } from "@/lib/date";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

interface InvitationsTableProps {
  invitations: InvitationWithInviter[];
}

type StatusFilter = "ALL" | "PENDING" | "COMPLETED";

export function InvitationsTable({ invitations }: InvitationsTableProps) {
  const t = useTranslations();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isTransitioning, startTransition] = useTransition();

  const filteredInvitations = useMemo(() => {
    if (statusFilter === "ALL") return invitations;
    if (statusFilter === "PENDING") {
      return invitations.filter((inv) => inv.status === "PENDING");
    }
    return invitations.filter((inv) => inv.status !== "PENDING");
  }, [invitations, statusFilter]);

  const handleResend = (id: string) => {
    setPendingAction(`resend-${id}`);
    startTransition(async () => {
      const result = await resendInvitation(id);
      if (result.success) {
        toast.success(result.message || t("settings.invitations.toast.resent"));
      } else {
        toast.error(
          result.message || t("settings.invitations.toast.resendFailed")
        );
      }
      setPendingAction(null);
      router.refresh();
    });
  };

  const handleCancel = (id: string) => {
    setPendingAction(`cancel-${id}`);
    startTransition(async () => {
      const result = await cancelInvitation(id);
      if (result.success) {
        toast.success(
          result.message || t("settings.invitations.toast.canceled")
        );
      } else {
        toast.error(
          result.message || t("settings.invitations.toast.cancelFailed")
        );
      }
      setPendingAction(null);
      router.refresh();
    });
  };

  return (
    <Card className="border-border rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t("settings.invitations.title")}</CardTitle>
          <CardDescription>
            {t("settings.invitations.description")}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {t("settings.invitations.statusLabel")}
          </span>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                {t("settings.invitations.filters.all")}
              </SelectItem>
              <SelectItem value="PENDING">
                {t("settings.invitations.filters.pending")}
              </SelectItem>
              <SelectItem value="COMPLETED">
                {t("settings.invitations.filters.completed")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {filteredInvitations.length > 0 ? (
          <div className="divide-y rounded-md border">
            {filteredInvitations.map((invite) => (
              <div
                key={invite.id}
                className="hover:bg-purple-gray flex flex-col gap-2 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {invite.email} · {invite.role}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t("settings.invitations.item.expiresAt", {
                      date: formatKoreanDateTime(invite.expiresAt),
                    })}{" "}
                    · {t("settings.invitations.item.status")}: {invite.status}
                  </p>
                </div>
                {invite.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={
                        isTransitioning &&
                        pendingAction === `resend-${invite.id}`
                      }
                      onClick={() => handleResend(invite.id)}
                    >
                      {isTransitioning &&
                      pendingAction === `resend-${invite.id}`
                        ? t("settings.invitations.actions.resending")
                        : t("settings.invitations.actions.resend")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        isTransitioning &&
                        pendingAction === `cancel-${invite.id}`
                      }
                      onClick={() => handleCancel(invite.id)}
                    >
                      {isTransitioning &&
                      pendingAction === `cancel-${invite.id}`
                        ? t("settings.invitations.actions.canceling")
                        : t("settings.invitations.actions.cancel")}
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {t("settings.invitations.item.completed")}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("settings.invitations.empty")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
