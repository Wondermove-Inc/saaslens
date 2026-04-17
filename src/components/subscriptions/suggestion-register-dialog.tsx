// src/components/subscriptions/suggestion-register-dialog.tsx
"use client";

import {
  createSubscriptionFromCardSuggestion,
  createSubscriptionFromPaymentSuggestion,
  type CardTransactionSuggestion,
  type PaymentRecordSuggestion,
} from "@/actions/subscriptions/subscription-suggestions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BillingCycle } from "@prisma/client";
import { Check, CreditCard, Loader2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { SuggestionUserAssignment } from "./suggestion-user-assignment";

type UnifiedSuggestion = CardTransactionSuggestion | PaymentRecordSuggestion;

interface SuggestionRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: UnifiedSuggestion | null;
  onSuccess: (appId: string) => void;
}

export function SuggestionRegisterDialog({
  open,
  onOpenChange,
  suggestion,
  onSuccess,
}: SuggestionRegisterDialogProps) {
  const t = useTranslations("subscriptionSuggestions");
  const [isPending, startTransition] = useTransition();

  // Dialog 내부 상태
  const [seatChecked, setSeatChecked] = useState(false);
  const [totalSeats, setTotalSeats] = useState<number | undefined>(undefined);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
    MONTHLY: t("billingCycle.MONTHLY"),
    QUARTERLY: t("billingCycle.QUARTERLY"),
    YEARLY: t("billingCycle.YEARLY"),
    ONE_TIME: t("billingCycle.ONE_TIME"),
  };

  // Dialog 열릴 때 suggestion 데이터 기반 초기값 세팅
  useEffect(() => {
    if (open && suggestion) {
      setSeatChecked(suggestion.billingType === "PER_SEAT");
      setTotalSeats(undefined);
      setSelectedUserIds(
        suggestion.assignedUserId ? [suggestion.assignedUserId] : []
      );
    }
  }, [open, suggestion]);

  if (!suggestion) return null;

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "KRW",
    }).format(amount);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <Badge
          variant="secondary"
          className="bg-success-muted text-success-muted-foreground border-0"
        >
          {t("confidence.high")}
        </Badge>
      );
    } else if (confidence >= 0.6) {
      return (
        <Badge
          variant="secondary"
          className="bg-warning-muted text-warning-muted-foreground border-0"
        >
          {t("confidence.medium")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {t("confidence.low")}
      </Badge>
    );
  };

  const isSeatInvalid =
    seatChecked &&
    (!totalSeats || totalSeats <= 0 || selectedUserIds.length > totalSeats);

  const selectedUserCount = selectedUserIds.length;

  const handleRegister = () => {
    if (seatChecked) {
      if (!totalSeats || totalSeats <= 0) {
        toast.error(t("seatRequiredError"));
        return;
      }
      if (selectedUserIds.length > totalSeats) {
        toast.error(
          t("seatExceededError", {
            assigned: selectedUserIds.length,
            total: totalSeats,
          })
        );
        return;
      }
    }

    startTransition(async () => {
      const isSeatBased = seatChecked;
      const result =
        suggestion.source === "card_transaction"
          ? await createSubscriptionFromCardSuggestion({
              suggestion,
              selectedUserIds,
              billingType: isSeatBased ? "PER_SEAT" : "FLAT_RATE",
              totalLicenses: isSeatBased ? (totalSeats ?? null) : null,
            })
          : await createSubscriptionFromPaymentSuggestion({
              suggestion,
              selectedUserIds,
              billingType: isSeatBased ? "PER_SEAT" : "FLAT_RATE",
              totalLicenses: isSeatBased ? (totalSeats ?? null) : null,
            });

      if (result.success) {
        toast.success(t("registered", { appName: suggestion.appName }));
        onOpenChange(false);
        onSuccess(suggestion.appId);
      } else {
        toast.error(result.message || t("registerFailed"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("registerDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("registerDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {/* 앱 정보 요약 */}
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={suggestion.appLogoUrl || undefined} />
            <AvatarFallback className="text-sm">
              {suggestion.appName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {suggestion.appName}
              </span>
              {getConfidenceBadge(suggestion.confidence)}
            </div>
            <div className="text-muted-foreground flex items-center gap-3 text-sm">
              <span className="font-medium">
                {formatAmount(suggestion.suggestedAmount, suggestion.currency)}
              </span>
              <span>/</span>
              <span>
                {BILLING_CYCLE_LABELS[suggestion.suggestedBillingCycle]}
              </span>
              <Badge
                variant="secondary"
                className="bg-secondary text-secondary-foreground border-0"
              >
                <CreditCard className="mr-1 h-3 w-3" />
                {suggestion.source === "card_transaction"
                  ? t("source.card")
                  : t("source.csv")}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Seat 설정 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="seat-dialog"
              checked={seatChecked}
              onCheckedChange={(checked) => setSeatChecked(!!checked)}
              disabled={isPending}
            />
            <Label htmlFor="seat-dialog" className="text-sm font-medium">
              {t("seatBased")}
            </Label>
          </div>

          {seatChecked && (
            <div className="flex items-center gap-3 pl-6">
              <Label className="shrink-0 text-sm">{t("totalSeats")}</Label>
              <Input
                type="number"
                min={1}
                value={totalSeats ?? ""}
                onChange={(e) =>
                  setTotalSeats(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder={t("totalSeatsPlaceholder")}
                className={cn(
                  "max-w-[140px]",
                  isSeatInvalid && "border-red-500"
                )}
                disabled={isPending}
              />
              <span
                className={cn(
                  "shrink-0 text-xs",
                  totalSeats && selectedUserIds.length > totalSeats
                    ? "font-medium text-red-500"
                    : "text-muted-foreground"
                )}
              >
                {t("seatStatus", {
                  assigned: selectedUserCount,
                  total: totalSeats ?? "–",
                })}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* 사용자 배정 */}
        <div className="space-y-3">
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <Users className="h-4 w-4" />
            <span>{t("userAssignment")}</span>
          </div>

          <SuggestionUserAssignment
            availableUsers={suggestion.availableUsers}
            selectedUserIds={selectedUserIds}
            onSelectedUserIdsChange={setSelectedUserIds}
            disabled={isPending}
            maxUsers={seatChecked ? totalSeats : undefined}
            onSeatLimitReached={() =>
              toast.error(
                t("seatExceededError", {
                  max: totalSeats,
                  current: selectedUserIds.length,
                })
              )
            }
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("registerDialog.cancel")}
          </Button>
          <Button
            onClick={handleRegister}
            disabled={isPending || isSeatInvalid}
          >
            {isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            {t("register")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
