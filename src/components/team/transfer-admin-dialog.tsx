// src/components/team/transfer-admin-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { transferAdminRole } from "@/actions/users-write";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@prisma/client";
import { Loader2, Shield } from "lucide-react";
import { useTranslations } from "next-intl";

interface TransferAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    status: string;
  }>;
  currentUserId: string;
  onSuccess?: () => void;
}

export function TransferAdminDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  onSuccess,
}: TransferAdminDialogProps) {
  const t = useTranslations("users.transferAdmin");
  const tRoles = useTranslations("teamMembers.memberCard.roles");
  const [targetUserId, setTargetUserId] = useState("");
  const [newSelfRole, setNewSelfRole] = useState<"MEMBER" | "VIEWER">("MEMBER");
  const [isPending, startTransition] = useTransition();

  const eligibleMembers = members.filter(
    (m) => m.id !== currentUserId && m.status === "ACTIVE"
  );

  const selectedMember = eligibleMembers.find((m) => m.id === targetUserId);

  const handleTransfer = () => {
    if (!targetUserId) return;

    startTransition(async () => {
      const result = await transferAdminRole(targetUserId, newSelfRole);
      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTargetUserId("");
      setNewSelfRole("MEMBER");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>{t("description")}</p>

              {eligibleMembers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("noEligibleMembers")}
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{t("selectTarget")}</Label>
                    <Select
                      value={targetUserId}
                      onValueChange={setTargetUserId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("selectTargetPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name || member.email} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("selectNewRole")}</Label>
                    <Select
                      value={newSelfRole}
                      onValueChange={(v) =>
                        setNewSelfRole(v as "MEMBER" | "VIEWER")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">
                          {tRoles("member")}
                        </SelectItem>
                        <SelectItem value="VIEWER">
                          {tRoles("viewer")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMember && (
                    <div className="bg-muted rounded-md p-3">
                      <p className="mb-2 font-medium">{t("summary")}</p>
                      <ul className="text-muted-foreground space-y-1 text-sm">
                        <li>
                          •{" "}
                          {t("summaryTarget", {
                            name: selectedMember.name || selectedMember.email,
                          })}
                        </li>
                        <li>
                          •{" "}
                          {t("summarySelf", {
                            role: tRoles(newSelfRole.toLowerCase()),
                          })}
                        </li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleTransfer}
            disabled={
              isPending || !targetUserId || eligibleMembers.length === 0
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
