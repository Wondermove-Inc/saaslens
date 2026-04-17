// src/components/subscriptions/subscription-suggestions.tsx
"use client";

import {
  createSubscriptionFromCardSuggestion,
  createSubscriptionFromPaymentSuggestion,
  suggestFromCardTransactions,
  suggestSubscriptionsFromPayments,
  type CardTransactionSuggestion,
  type PaymentRecordSuggestion,
} from "@/actions/subscriptions/subscription-suggestions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BillingCycle } from "@prisma/client";
import {
  AlertTriangle,
  Building,
  CalendarDays,
  Check,
  CreditCard,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { SuggestionUserAssignment } from "./suggestion-user-assignment";

// 통합 Suggestion 타입 (소스 구분용)
type UnifiedSuggestion = CardTransactionSuggestion | PaymentRecordSuggestion;

export function SubscriptionSuggestions() {
  const t = useTranslations("subscriptionSuggestions");
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
    MONTHLY: t("billingCycle.MONTHLY"),
    QUARTERLY: t("billingCycle.QUARTERLY"),
    YEARLY: t("billingCycle.YEARLY"),
    ONE_TIME: t("billingCycle.ONE_TIME"),
  };
  // 앱별 선택된 사용자 ID 추적
  const [selectedUsersByApp, setSelectedUsersByApp] = useState<
    Record<string, string[]>
  >({});
  // SMP-134: Seat 체크박스 상태 (appId → checked)
  const [seatCheckedByApp, setSeatCheckedByApp] = useState<
    Record<string, boolean>
  >({});
  // SMP-134: 총 Seat 수 (appId → totalSeats)
  const [totalSeatsByApp, setTotalSeatsByApp] = useState<
    Record<string, number | undefined>
  >({});

  const loadSuggestions = async () => {
    setIsLoading(true);

    // 법인카드 거래 + CSV 결제 내역 양쪽에서 추천 로드
    const [cardResult, paymentResult] = await Promise.all([
      suggestFromCardTransactions(),
      suggestSubscriptionsFromPayments(),
    ]);

    const allSuggestions: UnifiedSuggestion[] = [];

    if (cardResult.success && cardResult.data) {
      allSuggestions.push(...cardResult.data);
    }

    if (paymentResult.success && paymentResult.data) {
      // 이미 카드 추천에 있는 앱은 제외 (중복 방지)
      const cardAppIds = new Set(cardResult.data?.map((s) => s.appId) ?? []);
      const uniquePaymentSuggestions = paymentResult.data.filter(
        (s) => !cardAppIds.has(s.appId)
      );
      allSuggestions.push(...uniquePaymentSuggestions);
    }

    setSuggestions(allSuggestions);

    // SMP-134: Seat 체크박스 초기값 설정 (billingType === PER_SEAT → checked)
    const initialSeatChecked: Record<string, boolean> = {};
    const initialTotalSeats: Record<string, number | undefined> = {};
    for (const s of allSuggestions) {
      initialSeatChecked[s.appId] = s.billingType === "PER_SEAT";
      initialTotalSeats[s.appId] = undefined;
    }
    setSeatCheckedByApp(initialSeatChecked);
    setTotalSeatsByApp(initialTotalSeats);

    // SMP-134: assignedUserId가 있는 suggestion은 자동 선택(prefill)
    const initialSelectedUsers: Record<string, string[]> = {};
    for (const s of allSuggestions) {
      if (s.assignedUserId) {
        initialSelectedUsers[s.appId] = [s.assignedUserId];
      }
    }
    setSelectedUsersByApp(initialSelectedUsers);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleCreate = (suggestion: UnifiedSuggestion) => {
    const selectedUserIds = selectedUsersByApp[suggestion.appId] ?? [];
    const isSeatBased = seatCheckedByApp[suggestion.appId] ?? false;
    const totalSeats = totalSeatsByApp[suggestion.appId];

    // SMP-134: Seat 기반 구독 validation
    if (isSeatBased) {
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

    setCreatingId(suggestion.appId);

    startTransition(async () => {
      // 소스에 따라 다른 create 함수 호출
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
        // 목록에서 제거
        setSuggestions((prev) =>
          prev.filter((s) => s.appId !== suggestion.appId)
        );
        // 선택 상태 제거
        setSelectedUsersByApp((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [suggestion.appId]: _removed, ...rest } = prev;
          return rest;
        });
      } else {
        toast.error(result.message || t("registerFailed"));
      }
      setCreatingId(null);
    });
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

  // Confidence 배지 색상 (color-theme-guide.md 기준)
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
    } else {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {t("confidence.low")}
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-warning h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null; // 추천이 없으면 숨김
  }

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-warning h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const selectedUserIds = selectedUsersByApp[suggestion.appId] ?? [];
            const isSeatChecked = seatCheckedByApp[suggestion.appId] ?? false;
            const totalSeats = totalSeatsByApp[suggestion.appId];
            // SMP-134: Seat validation - 체크 시 totalSeats 필수 & 인원 초과 불가
            const isSeatInvalid =
              isSeatChecked &&
              (!totalSeats ||
                totalSeats <= 0 ||
                selectedUserIds.length > totalSeats);

            return (
              <div
                key={suggestion.appId}
                className="space-y-3 rounded-sm border p-4"
              >
                {/* 상단: 앱 정보 + 등록 버튼 */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={suggestion.appLogoUrl || undefined} />
                    <AvatarFallback>
                      {suggestion.appName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{suggestion.appName}</span>
                      {getConfidenceBadge(suggestion.confidence)}
                      {/* 소스 구분 배지 (color-theme-guide.md 기준) */}
                      <Badge
                        variant="secondary"
                        className="bg-secondary text-secondary-foreground border-0"
                      >
                        <CreditCard className="mr-1 h-3 w-3" />
                        {suggestion.source === "card_transaction"
                          ? t("source.card")
                          : t("source.csv")}
                      </Badge>
                      {/* Phase 2: 유저 배정 배지 (자동) - success-muted */}
                      {suggestion.assignedUserId && (
                        <Badge
                          variant="secondary"
                          className="bg-success-muted text-success-muted-foreground border-0"
                        >
                          <User className="mr-1 h-3 w-3" />
                          {suggestion.assignedUserName}
                        </Badge>
                      )}
                      {/* Team 배지 - info-muted */}
                      {suggestion.teamName && (
                        <Badge
                          variant="secondary"
                          className="bg-info-muted text-info-muted-foreground border-0"
                        >
                          <Building className="mr-1 h-3 w-3" />
                          {suggestion.teamName}
                        </Badge>
                      )}
                      {/* Phase 3: 미배정 경고 - warning-muted */}
                      {!suggestion.teamId && !suggestion.assignedUserId && (
                        <Badge
                          variant="secondary"
                          className="bg-warning-muted text-warning-muted-foreground border-0"
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {t("unassigned")}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        {
                          BILLING_CYCLE_LABELS[suggestion.suggestedBillingCycle]
                        }{" "}
                        {t("payment")}
                      </span>
                      <span>
                        {formatAmount(
                          suggestion.suggestedAmount,
                          suggestion.currency
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {t("analyzed", { count: suggestion.paymentCount })}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatDate(suggestion.firstPaymentDate)} ~{" "}
                      {formatDate(suggestion.lastPaymentDate)}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleCreate(suggestion)}
                    disabled={
                      (isPending && creatingId === suggestion.appId) ||
                      isSeatInvalid
                    }
                  >
                    {isPending && creatingId === suggestion.appId ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    {t("register")}
                  </Button>
                </div>

                {/* SMP-134: Seat 기반 체크박스 + 유저 배정 */}
                <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-t pt-3">
                  {/* 좌: 체크박스 + SMP-160 confidence badge */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`seat-${suggestion.appId}`}
                      checked={isSeatChecked}
                      onCheckedChange={(checked) =>
                        setSeatCheckedByApp((prev) => ({
                          ...prev,
                          [suggestion.appId]: !!checked,
                        }))
                      }
                      disabled={isPending && creatingId === suggestion.appId}
                    />
                    <Label
                      htmlFor={`seat-${suggestion.appId}`}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {t("seatBased")}
                    </Label>
                  </div>

                  {/* 우: Seat 상세 (체크 시만 표시) */}
                  {isSeatChecked ? (
                    <div className="flex items-center gap-3">
                      <Label className="shrink-0 text-sm">
                        {t("totalSeats")}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={totalSeats ?? ""}
                        onChange={(e) =>
                          setTotalSeatsByApp((prev) => ({
                            ...prev,
                            [suggestion.appId]: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder={t("totalSeatsPlaceholder")}
                        className={cn(
                          "max-w-[140px]",
                          isSeatInvalid && "border-red-500"
                        )}
                        disabled={isPending && creatingId === suggestion.appId}
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
                          assigned: selectedUserIds.length,
                          total: totalSeats ?? "–",
                        })}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* 유저 배정 - Seat 체크 시에만 표시 */}
                  {isSeatChecked && (
                    <>
                      <div className="text-muted-foreground flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4" />
                        <span className="whitespace-nowrap">
                          {t("userAssignment")}
                        </span>
                      </div>

                      <SuggestionUserAssignment
                        availableUsers={suggestion.availableUsers}
                        selectedUserIds={
                          selectedUsersByApp[suggestion.appId] ?? []
                        }
                        onSelectedUserIdsChange={(ids) =>
                          setSelectedUsersByApp((prev) => ({
                            ...prev,
                            [suggestion.appId]: ids,
                          }))
                        }
                        disabled={isPending && creatingId === suggestion.appId}
                        maxUsers={
                          isSeatChecked
                            ? totalSeatsByApp[suggestion.appId]
                            : undefined
                        }
                        onSeatLimitReached={() =>
                          toast.error(
                            t("seatExceededError", {
                              max: totalSeatsByApp[suggestion.appId],
                              current: (
                                selectedUsersByApp[suggestion.appId] ?? []
                              ).length,
                            })
                          )
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
