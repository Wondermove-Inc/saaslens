// src/components/cards/sync-dialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateYYYYMMDD } from "@/lib/services/hyphen/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { CalendarIcon, Info, Loader2, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface SyncDialogProps {
  card: {
    id: string;
    cardNm: string | null;
    cardLast4: string | null;
    lastSyncAt: Date | null;
  };
  onSync: (cardId: string, startDate: string, endDate: string) => Promise<void>;
  isPending: boolean;
  disabled?: boolean;
}

/**
 * 기본 동기화 날짜 범위 계산
 * - 첫 동기화: 6개월 전 ~ 오늘
 * - 재동기화: 1개월 전 ~ 오늘
 */
function getDefaultSyncRange(lastSyncAt: Date | null): {
  startDate: Date;
  endDate: Date;
  isFirstSync: boolean;
} {
  const endDate = new Date();
  const startDate = new Date();
  const isFirstSync = !lastSyncAt;

  if (isFirstSync) {
    startDate.setMonth(startDate.getMonth() - 6);
  } else {
    startDate.setMonth(startDate.getMonth() - 1);
  }

  return { startDate, endDate, isFirstSync };
}

export function SyncDialog({
  card,
  onSync,
  isPending,
  disabled = false,
}: SyncDialogProps) {
  const t = useTranslations("cards.sync");
  const locale = useLocale();
  const dateLocale = locale === "en" ? enUS : ko;
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFirstSync, setIsFirstSync] = useState(true);

  // Dialog 열릴 때 기본 날짜 설정
  useEffect(() => {
    if (open) {
      const {
        startDate: defaultStart,
        endDate: defaultEnd,
        isFirstSync: firstSync,
      } = getDefaultSyncRange(card.lastSyncAt);
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
      setIsFirstSync(firstSync);
    }
  }, [open, card.lastSyncAt]);

  const handleSync = async () => {
    if (!startDate || !endDate) return;

    await onSync(
      card.id,
      formatDateYYYYMMDD(startDate),
      formatDateYYYYMMDD(endDate)
    );
    setOpen(false);
  };

  const cardDisplayName = card.cardNm
    ? `${card.cardNm} (*${card.cardLast4 || "****"})`
    : `${t("cardName")} (*${card.cardLast4 || "****"})`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:inline">{t("button")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { cardName: cardDisplayName })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("period")}</label>
            <div className="flex items-center gap-2">
              {/* 시작일 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    disabled={isFirstSync}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, "yyyy.MM.dd", { locale: dateLocale })
                      : t("startDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date: Date) =>
                      date > new Date() || (endDate ? date > endDate : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">~</span>

              {/* 종료일 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    disabled={isFirstSync}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate
                      ? format(endDate, "yyyy.MM.dd", { locale: dateLocale })
                      : t("endDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date: Date) =>
                      date > new Date() ||
                      (startDate ? date < startDate : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isFirstSync && (
            <div className="bg-purple-gray flex items-start gap-2 rounded-sm p-3 text-sm">
              <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-muted-foreground">{t("firstSyncNote")}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSync}
            disabled={isPending || !startDate || !endDate}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
