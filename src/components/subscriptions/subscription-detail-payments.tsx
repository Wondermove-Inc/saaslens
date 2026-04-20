// src/components/subscriptions/subscription-detail-payments.tsx
"use client";

import type { LinkedPayment } from "@/actions/subscriptions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "./subscription-detail.utils";

interface SubscriptionDetailPaymentsProps {
  linkedPayments: LinkedPayment[];
  isLoading: boolean;
}

export function SubscriptionDetailPayments({
  linkedPayments,
  isLoading,
}: SubscriptionDetailPaymentsProps) {
  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          연결된 결제 내역
          {linkedPayments.length > 0 && (
            <Badge variant="secondary">{linkedPayments.length}건</Badge>
          )}
        </CardTitle>
        <CardDescription>이 구독과 연결된 카드 결제 내역</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : linkedPayments.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center text-sm">
            연결된 결제 내역이 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {linkedPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-sm border p-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">{payment.merchantName}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatDate(payment.transactionDate)}
                    {payment.cardLast4 && ` · 카드 ****${payment.cardLast4}`}
                  </div>
                </div>
                <div className="text-right font-medium">
                  {formatCurrency(payment.amount, payment.currency)}
                </div>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                총 결제 금액
              </span>
              <span className="font-semibold">
                {formatCurrency(
                  linkedPayments.reduce((sum, p) => sum + p.amount, 0),
                  linkedPayments[0].currency
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
