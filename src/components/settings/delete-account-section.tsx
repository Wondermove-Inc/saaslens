// src/components/settings/delete-account-section.tsx
"use client";

import { useState } from "react";

import { deleteAccount } from "@/actions/account";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function DeleteAccountSection() {
  const t = useTranslations();
  const confirmTextLabel = t("settings.delete.confirmText");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteAccount();

      if (!result.success) {
        toast.error(result.error);
        setIsDeleting(false);
      }
      // 성공 시 리다이렉트됨
    } catch {
      // redirect()는 NEXT_REDIRECT 에러를 throw하므로 여기서 catch됨
      // 정상 동작이므로 무시
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmText("");
      setIsDeleting(false);
    }
  };

  const isConfirmValid = confirmText === confirmTextLabel;

  return (
    <div className="border-destructive/50 bg-destructive/10 hover:bg-destructive/15 rounded-lg border p-6 transition-colors">
      <div className="flex items-start gap-4">
        <div className="bg-destructive/20 rounded-lg p-2.5">
          <AlertTriangle className="text-destructive h-5 w-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-destructive text-lg font-semibold">
              {t("settings.delete.title")}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("settings.delete.description")}
            </p>
          </div>

          <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                {t("settings.delete.action")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("settings.delete.dialog.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.delete.dialog.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-4">
                <Label htmlFor="confirm-text" className="text-sm">
                  {t.rich("settings.delete.dialog.confirmLabel", {
                    text: confirmTextLabel,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmTextLabel}
                  className="mt-2"
                  autoComplete="off"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  {t("settings.delete.dialog.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={!isConfirmValid || isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting
                    ? t("settings.delete.dialog.deleting")
                    : t("settings.delete.dialog.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
