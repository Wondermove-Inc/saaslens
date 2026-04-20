// src/components/users/offboard-user-dialog.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { getUserRelatedDataCounts } from "@/actions/users-utils";
import { offboardUser } from "@/actions/users-write";
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
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface OffboardUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  onSuccess?: () => void;
}

type RelatedDataCounts = {
  ownedApps: number;
  assignedCorporateCards: number;
  assignedCardTransactions: number;
  directReports: number;
  assignedSubscriptions: number;
};

export function OffboardUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: OffboardUserDialogProps) {
  const t = useTranslations("users.offboard");
  const [counts, setCounts] = useState<RelatedDataCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAdmin = user.role === "ADMIN";
  const displayName = user.name || user.email;

  useEffect(() => {
    if (open && !isAdmin) {
      setIsLoadingCounts(true);
      getUserRelatedDataCounts(user.id)
        .then(setCounts)
        .finally(() => setIsLoadingCounts(false));
    } else {
      setCounts(null);
    }
  }, [open, user.id, isAdmin]);

  const handleOffboard = () => {
    startTransition(async () => {
      const result = await offboardUser(user.id);
      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    });
  };

  const hasRelatedData =
    counts &&
    (counts.ownedApps > 0 ||
      counts.assignedCorporateCards > 0 ||
      counts.assignedCardTransactions > 0 ||
      counts.directReports > 0 ||
      counts.assignedSubscriptions > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive h-5 w-5" />
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>{t("description", { name: displayName })}</p>

              {isAdmin ? (
                <p className="text-destructive font-medium">
                  {t("adminWarning")}
                </p>
              ) : isLoadingCounts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : hasRelatedData ? (
                <div className="bg-muted rounded-sm p-3">
                  <p className="mb-2 font-medium">{t("relatedData")}</p>
                  <ul className="text-muted-foreground space-y-1 text-sm">
                    {counts.ownedApps > 0 && (
                      <li>
                        • {t("ownedApps")}:{" "}
                        {t("count", { count: counts.ownedApps })}
                      </li>
                    )}
                    {counts.assignedCorporateCards > 0 && (
                      <li>
                        • {t("assignedCards")}:{" "}
                        {t("count", { count: counts.assignedCorporateCards })}
                      </li>
                    )}
                    {counts.assignedCardTransactions > 0 && (
                      <li>
                        • {t("assignedTransactions")}:{" "}
                        {t("count", { count: counts.assignedCardTransactions })}
                      </li>
                    )}
                    {counts.directReports > 0 && (
                      <li>
                        • {t("directReports")}:{" "}
                        {t("count", { count: counts.directReports })}
                      </li>
                    )}
                    {counts.assignedSubscriptions > 0 && (
                      <li>
                        • {t("assignedSubscriptions")}:{" "}
                        {t("count", { count: counts.assignedSubscriptions })}
                      </li>
                    )}
                  </ul>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {t("reassignNote")}
                  </p>
                </div>
              ) : counts ? (
                <p className="text-muted-foreground text-sm">
                  {t("noRelatedData")}
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleOffboard}
            disabled={isPending || isLoadingCounts || isAdmin}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
