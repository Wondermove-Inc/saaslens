// src/components/subscriptions/subscription-detail-app-card.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { BillingCycle, SubscriptionStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  getBillingCycleLabels,
  getStatusLabels,
  statusVariants,
} from "./subscription-detail.constants";
import { formatCurrency } from "./subscription-detail.utils";

interface SubscriptionDetailAppCardProps {
  appName: string;
  appLogoUrl: string | null;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
}

export function SubscriptionDetailAppCard({
  appName,
  appLogoUrl,
  status,
  billingCycle,
  amount,
  currency,
}: SubscriptionDetailAppCardProps) {
  const t = useTranslations();
  const statusLabels = getStatusLabels(t);
  const billingCycleLabels = getBillingCycleLabels(t);

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          {appLogoUrl ? (
            <Image
              src={appLogoUrl}
              alt={appName}
              width={96}
              height={96}
              className="rounded-sm"
            />
          ) : (
            <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-sm text-3xl font-bold">
              {appName.charAt(0)}
            </div>
          )}
          <h2 className="mt-4 text-xl font-semibold">{appName}</h2>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={statusVariants[status]}>
              {statusLabels[status]}
            </Badge>
            <Badge variant="outline">{billingCycleLabels[billingCycle]}</Badge>
          </div>
          <div className="mt-4 text-2xl font-semibold tabular-nums">
            {formatCurrency(amount, currency)}
            <span className="text-muted-foreground text-sm font-normal">
              /{billingCycleLabels[billingCycle]}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
