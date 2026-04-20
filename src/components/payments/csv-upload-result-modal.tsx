// src/components/payments/csv-upload-result-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface CsvUploadResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imported: number;
  matched: number;
  unmatched: number;
  duplicates: number;
}

export function CsvUploadResultModal({
  open,
  onOpenChange,
  imported,
  matched,
  unmatched,
  duplicates,
}: CsvUploadResultModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("payments.upload.resultModal.title")}</DialogTitle>
          <DialogDescription data-testid="summary-text">
            {t("payments.upload.resultModal.summary", {
              imported,
              duplicates,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {/* Auto Matched */}
          <div
            data-testid="stat-card"
            className="bg-success-muted text-success-muted-foreground flex flex-col items-center gap-2 rounded-sm p-4"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-2xl font-bold">{matched}</span>
            <span className="text-center text-xs">
              {t("payments.upload.resultModal.autoMatched")}
            </span>
          </div>

          {/* Unmatched */}
          <div
            data-testid="stat-card"
            className="bg-warning-muted text-warning-muted-foreground flex flex-col items-center gap-2 rounded-sm p-4"
          >
            <AlertCircle className="h-5 w-5" />
            <span className="text-2xl font-bold">{unmatched}</span>
            <span className="text-center text-xs">
              {t("payments.upload.resultModal.unmatched")}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            {t("payments.upload.resultModal.cta")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
