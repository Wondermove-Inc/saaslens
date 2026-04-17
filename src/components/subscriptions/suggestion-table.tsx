// src/components/subscriptions/suggestion-table.tsx
"use client";

import {
  suggestFromCardTransactions,
  suggestSubscriptionsFromPayments,
  type CardTransactionSuggestion,
  type PaymentRecordSuggestion,
} from "@/actions/subscriptions/subscription-suggestions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BillingCycle } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  CreditCard,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SuggestionRegisterDialog } from "./suggestion-register-dialog";

type UnifiedSuggestion = CardTransactionSuggestion | PaymentRecordSuggestion;

export function SuggestionTable() {
  const t = useTranslations("subscriptionSuggestions");
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog 상태
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<UnifiedSuggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
    MONTHLY: t("billingCycle.MONTHLY"),
    QUARTERLY: t("billingCycle.QUARTERLY"),
    YEARLY: t("billingCycle.YEARLY"),
    ONE_TIME: t("billingCycle.ONE_TIME"),
  };

  const loadSuggestions = async () => {
    setIsLoading(true);

    const [cardResult, paymentResult] = await Promise.all([
      suggestFromCardTransactions(),
      suggestSubscriptionsFromPayments(),
    ]);

    const allSuggestions: UnifiedSuggestion[] = [];

    if (cardResult.success && cardResult.data) {
      allSuggestions.push(...cardResult.data);
    }

    if (paymentResult.success && paymentResult.data) {
      const cardAppIds = new Set(cardResult.data?.map((s) => s.appId) ?? []);
      const uniquePaymentSuggestions = paymentResult.data.filter(
        (s) => !cardAppIds.has(s.appId)
      );
      allSuggestions.push(...uniquePaymentSuggestions);
    }

    setSuggestions(allSuggestions);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleOpenDialog = (suggestion: UnifiedSuggestion) => {
    setSelectedSuggestion(suggestion);
    setDialogOpen(true);
  };

  const handleRegisterSuccess = (appId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.appId !== appId));
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "KRW",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const getAssignmentBadge = (suggestion: UnifiedSuggestion) => {
    if (suggestion.assignedUserId) {
      return (
        <Badge
          variant="secondary"
          className="bg-success-muted text-success-muted-foreground border-0"
        >
          <User className="mr-1 h-3 w-3" />
          {suggestion.assignedUserName}
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-warning-muted text-warning-muted-foreground border-0"
      >
        <AlertTriangle className="mr-1 h-3 w-3" />
        {t("unassigned")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-warning h-5 w-5" />
            <h2 className="text-lg font-semibold">{t("title")}</h2>
          </div>
        </div>
        <Card className="border-l-primary/50 border-border/50 rounded-sm border-l-4 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 border-b px-4 py-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b px-4 py-3"
                >
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-warning h-5 w-5" />
            <h2 className="text-lg font-semibold">{t("title")}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSuggestions}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t("table.empty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="text-warning h-5 w-5" />
              <h2 className="text-lg font-semibold">{t("title")}</h2>
              <Badge variant="secondary" className="ml-1">
                {suggestions.length}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("description")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSuggestions}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* DataTable */}
        <Card className="border-l-primary/50 border-border/50 rounded-sm border-l-4 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead>{t("table.app")}</TableHead>
                  <TableHead>{t("table.confidence")}</TableHead>
                  <TableHead>{t("table.source")}</TableHead>
                  <TableHead className="text-right">
                    {t("table.amount")}
                  </TableHead>
                  <TableHead>{t("table.billingCycle")}</TableHead>
                  <TableHead className="text-center">
                    {t("table.paymentCount")}
                  </TableHead>
                  <TableHead>{t("table.assignment")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((suggestion) => (
                  <TableRow
                    key={suggestion.appId}
                    className="hover:bg-muted/50"
                  >
                    {/* App */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={suggestion.appLogoUrl || undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {suggestion.appName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium">
                              {suggestion.appName}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {formatDate(suggestion.firstPaymentDate)} ~{" "}
                              {formatDate(suggestion.lastPaymentDate)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Confidence */}
                    <TableCell>
                      {getConfidenceBadge(suggestion.confidence)}
                    </TableCell>

                    {/* Source */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-secondary text-secondary-foreground border-0"
                      >
                        <CreditCard className="mr-1 h-3 w-3" />
                        {suggestion.source === "card_transaction"
                          ? t("source.card")
                          : t("source.csv")}
                      </Badge>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-right font-medium">
                      {formatAmount(
                        suggestion.suggestedAmount,
                        suggestion.currency
                      )}
                    </TableCell>

                    {/* Billing Cycle */}
                    <TableCell>
                      {BILLING_CYCLE_LABELS[suggestion.suggestedBillingCycle]}
                    </TableCell>

                    {/* Payment Count */}
                    <TableCell className="text-center">
                      {t("table.paymentCountValue", {
                        count: suggestion.paymentCount,
                      })}
                    </TableCell>

                    {/* Assignment */}
                    <TableCell>{getAssignmentBadge(suggestion)}</TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleOpenDialog(suggestion)}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        {t("register")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Footer */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-muted-foreground text-sm">
                {t("table.totalItems", { count: suggestions.length })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 등록 Dialog */}
      <SuggestionRegisterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        suggestion={selectedSuggestion}
        onSuccess={handleRegisterSuccess}
      />
    </TooltipProvider>
  );
}
