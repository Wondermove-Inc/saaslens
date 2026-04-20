"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteTeam,
  getTeamImpact,
  type TeamImpact,
  type TeamWithStats,
} from "@/actions/teams";
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

interface DeleteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithStats;
  onSuccess?: () => void;
}

export function DeleteTeamDialog({
  open,
  onOpenChange,
  team,
  onSuccess,
}: DeleteTeamDialogProps) {
  const t = useTranslations();
  const [impact, setImpact] = useState<TeamImpact | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 다이얼로그 열릴 때 영향도 조회
  useEffect(() => {
    if (open) {
      setIsLoadingImpact(true);
      getTeamImpact(team.id)
        .then((result) => {
          if (result.success && result.data) {
            setImpact(result.data);
          }
        })
        .finally(() => setIsLoadingImpact(false));
    } else {
      setImpact(null);
    }
  }, [open, team.id]);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTeam(team.id);

      if (result.success) {
        toast.success(result.message || t("teams.delete.success"));
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.message || t("teams.delete.error"));
      }
    });
  };

  // 영향도가 있는지 확인
  const hasImpact =
    impact &&
    (impact.memberCount > 0 ||
      impact.appCount > 0 ||
      impact.subscriptionCount > 0 ||
      impact.cardCount > 0 ||
      impact.childTeamCount > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive h-5 w-5" />
            {t("teams.delete.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>{t("teams.delete.confirm", { name: team.name })}</p>

              <p className="text-destructive font-medium">
                {t("teams.delete.irreversible")}
              </p>

              {/* 영향도 표시 */}
              {isLoadingImpact ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : hasImpact ? (
                <div className="bg-muted rounded-md p-3">
                  <p className="mb-2 font-medium">{t("teams.delete.impact")}</p>
                  <ul className="text-muted-foreground space-y-1 text-sm">
                    {impact.memberCount > 0 && (
                      <li>
                        •{" "}
                        {t("teams.delete.membersImpact", {
                          count: impact.memberCount,
                        })}
                      </li>
                    )}
                    {impact.appCount > 0 && (
                      <li>
                        •{" "}
                        {t("teams.delete.appsImpact", {
                          count: impact.appCount,
                        })}
                      </li>
                    )}
                    {impact.subscriptionCount > 0 && (
                      <li>
                        •{" "}
                        {t("teams.delete.subscriptionsImpact", {
                          count: impact.subscriptionCount,
                        })}
                      </li>
                    )}
                    {impact.cardCount > 0 && (
                      <li>
                        •{" "}
                        {t("teams.delete.cardsImpact", {
                          count: impact.cardCount,
                        })}
                      </li>
                    )}
                    {impact.childTeamCount > 0 && (
                      <li>
                        •{" "}
                        {t("teams.delete.childTeamsImpact", {
                          count: impact.childTeamCount,
                        })}
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("teams.delete.noImpact")}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("teams.delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || isLoadingImpact}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("teams.delete.deleting")}
              </>
            ) : (
              t("teams.delete.delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
