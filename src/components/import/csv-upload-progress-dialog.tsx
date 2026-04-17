// src/components/import/csv-upload-progress-dialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface CsvUploadProgressDialogProps {
  open: boolean;
  total: number;
  processed: number;
  errorCount: number;
  isComplete: boolean;
  onClose: () => void;
}

export function CsvUploadProgressDialog({
  open,
  total,
  processed,
  errorCount,
  isComplete,
  onClose,
}: CsvUploadProgressDialogProps) {
  const t = useTranslations("import.progress");

  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={isComplete ? onClose : undefined}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (!isComplete) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!isComplete) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
            )}
            {isComplete ? t("complete") : t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 총 레코드 수 */}
          <p className="text-muted-foreground text-sm">
            {t("totalRecords", { total })}
          </p>

          {/* 진행 바 */}
          <Progress value={percent} className="h-3" />

          {/* 진행 텍스트 */}
          <p className="text-sm font-medium">
            {t("processed", { processed, total, percent })}
          </p>

          {/* 오류 건수 */}
          {errorCount > 0 && (
            <div className="text-destructive flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{t("errors", { count: errorCount })}</span>
            </div>
          )}
        </div>

        {/* 닫기 버튼 - 완료 시에만 활성화 */}
        <div className="flex justify-end">
          <Button onClick={onClose} disabled={!isComplete}>
            {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
