// src/components/payments/payment-register-dialogs.tsx
"use client";

import type { PaymentRecordWithApp } from "@/actions/payment-import";
import {
  linkPaymentToSubscription,
  updatePaymentMatch,
} from "@/actions/payments/payment-matching";
import { AppForm } from "@/components/apps/app-form";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import type { AppWithTeams } from "@/components/subscriptions/subscription-form-assignment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// --- App Registration Dialog ---

interface RegisterAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentRecord: PaymentRecordWithApp | null;
  onSuccess: () => void;
}

export function RegisterAppDialog({
  open,
  onOpenChange,
  paymentRecord,
  onSuccess,
}: RegisterAppDialogProps) {
  const t = useTranslations();
  const [isPending, setIsPending] = useState(false);

  const handleSuccess = useCallback(
    async (createdAppId?: string) => {
      // 결제 행에서 앱을 등록한 경우, 해당 결제의 매칭을 MANUAL로 설정
      if (createdAppId && paymentRecord) {
        await updatePaymentMatch(paymentRecord.id, createdAppId);
      }
      toast.success(t("payments.messages.appCreated"));
      onOpenChange(false);
      onSuccess();
    },
    [t, onOpenChange, onSuccess, paymentRecord]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{t("payments.dialog.registerApp")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-140px)] px-6 pb-4">
          {open && paymentRecord && (
            <AppForm
              hideActions
              formId="payment-register-app-form"
              initialName={paymentRecord.merchantName}
              onPendingChange={setIsPending}
              onSuccess={handleSuccess}
            />
          )}
        </ScrollArea>
        <DialogFooter className="px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("payments.dialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="payment-register-app-form"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("payments.dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Subscription Registration Dialog ---

interface RegisterSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentRecord: PaymentRecordWithApp | null;
  apps: AppWithTeams[];
  onSuccess: () => void;
}

export function RegisterSubscriptionDialog({
  open,
  onOpenChange,
  paymentRecord,
  apps,
  onSuccess,
}: RegisterSubscriptionDialogProps) {
  const t = useTranslations();
  const [isPending, setIsPending] = useState(false);

  const handleSuccess = useCallback(
    async (createdSubscriptionId?: string) => {
      if (createdSubscriptionId && paymentRecord) {
        const result = await linkPaymentToSubscription(
          paymentRecord.id,
          createdSubscriptionId
        );
        if (!result.success) {
          toast.error(t("payments.messages.subscriptionLinkFailed"));
        }
      }
      onOpenChange(false);
      onSuccess();
    },
    [onOpenChange, onSuccess, paymentRecord, t]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{t("payments.dialog.registerSubscription")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("payments.dialog.registerSubscriptionDescription")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-140px)] px-6 pb-2">
          {open && paymentRecord && (
            <SubscriptionForm
              apps={apps}
              hideActions
              formId="payment-register-subscription-form"
              initialAmount={String(Math.abs(paymentRecord.amount))}
              onPendingChange={setIsPending}
              onSuccess={handleSuccess}
            />
          )}
        </ScrollArea>
        <DialogFooter className="px-6 pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("payments.dialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="payment-register-subscription-form"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("payments.dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
