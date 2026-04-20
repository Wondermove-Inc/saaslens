// src/components/subscriptions/renewal-day-detail.tsx
"use client";

import type { RenewalItem } from "@/actions/subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { ExternalLink, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

interface RenewalDayDetailProps {
  date: string; // ISO 8601 (YYYY-MM-DD)
  renewals: RenewalItem[];
  onClose: () => void;
}

const statusVariants: Record<
  RenewalItem["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  EXPIRED: "destructive",
  CANCELLED: "outline",
  PENDING: "secondary",
};

/**
 * 특정 날짜의 갱신 목록을 표시하는 컴포넌트
 */
export function RenewalDayDetail({
  date,
  renewals,
  onClose,
}: RenewalDayDetailProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "ko" ? ko : enUS;
  const dateFormat =
    locale === "ko" ? "yyyy년 M월 d일 (EEEE)" : "MMMM d, yyyy (EEEE)";
  const formattedDate = format(parseISO(date), dateFormat, {
    locale: dateLocale,
  });

  const statusLabels: Record<RenewalItem["status"], string> = {
    ACTIVE: t("subscriptions.status.active"),
    EXPIRED: t("subscriptions.status.expired"),
    CANCELLED: t("subscriptions.status.cancelled"),
    PENDING: t("subscriptions.status.pending"),
  };

  // 금액 포맷팅
  const formatAmount = (amount: number, currency: string): string => {
    const symbol = currency === "KRW" ? "₩" : "$";
    return `${symbol}${amount.toLocaleString()}`;
  };

  // 총 갱신 금액 계산
  const totalAmount = renewals.reduce((sum, item) => sum + item.amount, 0);
  const primaryCurrency = renewals[0]?.currency || "KRW";

  if (renewals.length === 0) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{formattedDate}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center">
            {t("subscriptions.renewalDay.empty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{formattedDate}</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("subscriptions.renewalDay.summary", {
              count: renewals.length,
              amount: formatAmount(totalAmount, primaryCurrency),
            })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subscriptions.renewalDay.table.app")}</TableHead>
              <TableHead>{t("subscriptions.renewalDay.table.plan")}</TableHead>
              <TableHead>
                {t("subscriptions.renewalDay.table.amount")}
              </TableHead>
              <TableHead>
                {t("subscriptions.renewalDay.table.status")}
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renewals.map((renewal) => (
              <TableRow key={renewal.subscriptionId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {renewal.appLogo ? (
                      <Image
                        src={renewal.appLogo}
                        alt={renewal.appName}
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                    ) : (
                      <div className="bg-purple-gray flex h-6 w-6 items-center justify-center rounded-sm text-xs font-medium">
                        {renewal.appName.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{renewal.appName}</span>
                  </div>
                </TableCell>
                <TableCell>{renewal.planName || "-"}</TableCell>
                <TableCell>
                  {formatAmount(renewal.amount, renewal.currency)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[renewal.status]}>
                    {statusLabels[renewal.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/subscriptions/${renewal.subscriptionId}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
