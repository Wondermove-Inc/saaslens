// src/components/subscriptions/subscription-detail.tsx
"use client";

import {
  type NotificationField,
  updateNotificationSettings,
} from "@/actions/notification-settings";
import {
  deleteSubscription,
  getLinkedPayments,
  type LinkedPayment,
} from "@/actions/subscriptions";
import { KpiCard, KpiCardsGrid } from "@/components/common/kpi-card";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SubscriptionDetail as SubscriptionDetailType } from "@/types/subscription";
import {
  Calendar,
  CircleDollarSign,
  ExternalLink,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { NotificationSettings } from "./notification-settings";
import { SubscriptionDetailAppCard } from "./subscription-detail-app-card";
import { SubscriptionDetailPayments } from "./subscription-detail-payments";
import { SubscriptionDetailSeatCard } from "./subscription-detail-seat-card";
import { getBillingCycleLabels } from "./subscription-detail.constants";
import {
  formatCurrency,
  formatDate,
  getDaysUntilRenewal,
} from "./subscription-detail.utils";

interface SubscriptionDetailProps {
  subscription: SubscriptionDetailType;
  hideHeader?: boolean;
}

export function SubscriptionDetail({
  subscription,
  hideHeader = false,
}: SubscriptionDetailProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isNotificationUpdating, setIsNotificationUpdating] = useState(false);

  const billingCycleLabels = getBillingCycleLabels(t);

  // 알림 설정 상태
  const [alertSettings, setAlertSettings] = useState({
    renewalAlert30: subscription.renewalAlert30,
    renewalAlert60: subscription.renewalAlert60,
    renewalAlert90: subscription.renewalAlert90,
  });

  // 연결된 결제 내역 상태
  const [linkedPayments, setLinkedPayments] = useState<LinkedPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  // 연결된 결제 내역 로드
  useEffect(() => {
    const loadPayments = async () => {
      setIsLoadingPayments(true);
      const result = await getLinkedPayments(subscription.id);
      if (result.success && result.data) {
        setLinkedPayments(result.data);
      }
      setIsLoadingPayments(false);
    };
    loadPayments();
  }, [subscription.id]);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteSubscription(subscription.id);
      if (result.success) {
        router.push("/subscriptions");
      }
    });
  };

  const handleNotificationChange = async (
    field: NotificationField,
    value: boolean
  ) => {
    setIsNotificationUpdating(true);
    // Optimistic update
    setAlertSettings((prev) => ({ ...prev, [field]: value }));

    const result = await updateNotificationSettings(
      subscription.id,
      field,
      value
    );

    if (!result.success) {
      // Rollback on error
      setAlertSettings((prev) => ({ ...prev, [field]: !value }));
    }

    setIsNotificationUpdating(false);
  };

  const daysUntilRenewal = getDaysUntilRenewal(subscription.renewalDate);
  const licenseUsagePercent = subscription.totalLicenses
    ? ((subscription.usedLicenses ?? 0) / subscription.totalLicenses) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* 상단 KPI 카드 */}
      <KpiCardsGrid columns={4}>
        <KpiCard
          title={t("subscriptions.detail.kpi.amount")}
          value={formatCurrency(subscription.amount, subscription.currency)}
          icon={CircleDollarSign}
          description={billingCycleLabels[subscription.billingCycle]}
        />
        <KpiCard
          title={t("subscriptions.detail.kpi.license")}
          value={
            subscription.totalLicenses
              ? `${subscription.usedLicenses ?? 0}/${subscription.totalLicenses}`
              : "-"
          }
          icon={Users}
          change={
            subscription.totalLicenses
              ? {
                  value: Math.round(licenseUsagePercent),
                  type: licenseUsagePercent > 80 ? "decrease" : "neutral",
                }
              : undefined
          }
        />
        <KpiCard
          title={t("subscriptions.detail.kpi.renewalDate")}
          value={formatDate(subscription.renewalDate)}
          icon={Calendar}
          description={
            daysUntilRenewal !== null
              ? daysUntilRenewal > 0
                ? t("subscriptions.detail.period.daysLeft", {
                    days: daysUntilRenewal,
                  })
                : daysUntilRenewal === 0
                  ? t("subscriptions.detail.period.today")
                  : t("subscriptions.detail.period.daysPast", {
                      days: Math.abs(daysUntilRenewal),
                    })
              : undefined
          }
        />
        <KpiCard
          title={t("subscriptions.detail.kpi.autoRenewal")}
          value={
            subscription.autoRenewal
              ? t("subscriptions.detail.kpi.active")
              : t("subscriptions.detail.kpi.inactive")
          }
          icon={RefreshCw}
        />
      </KpiCardsGrid>

      {/* 2컬럼 레이아웃 (좌: 메인 콘텐츠 / 우: 메타데이터) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* 좌측: 상세 정보 */}
        <div className="space-y-6">
          {/* 헤더 with 액션 버튼 (hideHeader가 false일 때만 표시) */}
          {!hideHeader && (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {t("subscriptions.detail.title", {
                    appName: subscription.appName,
                  })}
                </h1>
                <p className="text-muted-foreground">
                  {t("subscriptions.detail.subtitle")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/subscriptions/${subscription.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("subscriptions.actions.edit")}
                  </Link>
                </Button>
                <AlertDialog
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("subscriptions.actions.delete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("subscriptions.delete.title")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("subscriptions.delete.description", {
                          appName: subscription.appName,
                        })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("subscriptions.delete.cancelled")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isPending}
                      >
                        {isPending
                          ? t("subscriptions.actions.deleting")
                          : t("subscriptions.delete.confirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* 기간 정보 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{t("subscriptions.detail.period.title")}</CardTitle>
              <CardDescription>
                {t("subscriptions.detail.period.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground text-sm font-medium">
                    {t("subscriptions.detail.period.startDate")}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(subscription.startDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm font-medium">
                    {t("subscriptions.detail.period.endDate")}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(subscription.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm font-medium">
                    {t("subscriptions.detail.period.renewalDate")}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(subscription.renewalDate)}
                    {daysUntilRenewal !== null && daysUntilRenewal <= 30 && (
                      <Badge
                        variant={
                          daysUntilRenewal <= 7 ? "destructive" : "outline"
                        }
                        className="ml-2"
                      >
                        {t("subscriptions.detail.period.daysLeft", {
                          days: daysUntilRenewal,
                        })}
                      </Badge>
                    )}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 연결된 결제 내역 카드 */}
          <SubscriptionDetailPayments
            linkedPayments={linkedPayments}
            isLoading={isLoadingPayments}
          />

          {/* 추가 정보 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>
                {t("subscriptions.detail.additional.title")}
              </CardTitle>
              <CardDescription>
                {t("subscriptions.detail.additional.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("subscriptions.detail.additional.contract")}
                </span>
                {subscription.contractUrl ? (
                  <Button variant="link" asChild className="h-auto p-0">
                    <a
                      href={subscription.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("subscriptions.detail.additional.viewContract")}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              {subscription.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground text-sm">
                      {t("subscriptions.detail.additional.notes")}
                    </span>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {subscription.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 메타데이터 */}
          <div className="text-muted-foreground text-xs">
            {t("subscriptions.detail.metadata.createdAt", {
              date: formatDate(subscription.createdAt),
            })}{" "}
            |{" "}
            {t("subscriptions.detail.metadata.updatedAt", {
              date: formatDate(subscription.updatedAt),
            })}
          </div>
        </div>

        {/* 우측: 앱 정보 및 상태 */}
        <div className="space-y-6">
          {/* 앱 로고 및 상태 카드 */}
          <SubscriptionDetailAppCard
            appName={subscription.appName}
            appLogoUrl={subscription.appLogoUrl}
            status={subscription.status}
            billingCycle={subscription.billingCycle}
            amount={subscription.amount}
            currency={subscription.currency}
          />

          {/* 배정 정보 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>
                {t("subscriptions.detail.assignment.title")}
              </CardTitle>
              <CardDescription>
                {t("subscriptions.detail.assignment.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {t("subscriptions.detail.assignment.team")}
                </span>
                {subscription.teams && subscription.teams.length > 0 ? (
                  <div className="flex flex-wrap justify-end gap-1">
                    {subscription.teams.map((team) => (
                      <Badge key={team.id} variant="secondary">
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="font-medium">
                    {subscription.teamName ?? "-"}
                  </span>
                )}
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground text-sm">
                  {t("subscriptions.detail.assignment.assignedUsers")}
                </span>
                {subscription.assignedUsers &&
                subscription.assignedUsers.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {subscription.assignedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                          {(user.name ?? user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium">
                            {user.name ?? user.email}
                          </span>
                          {user.name && (
                            <span className="text-muted-foreground ml-1">
                              ({user.email})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t("subscriptions.detail.assignment.noUsers")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seat/라이선스 사용량 카드 */}
          <SubscriptionDetailSeatCard
            subscriptionId={subscription.id}
            totalLicenses={subscription.totalLicenses}
            usedLicenses={subscription.usedLicenses}
            billingType={subscription.billingType}
            perSeatPrice={subscription.perSeatPrice}
            currency={subscription.currency}
          />

          {/* 알림 설정 */}
          <NotificationSettings
            subscriptionId={subscription.id}
            renewalAlert30={alertSettings.renewalAlert30}
            renewalAlert60={alertSettings.renewalAlert60}
            renewalAlert90={alertSettings.renewalAlert90}
            onChange={handleNotificationChange}
            disabled={isNotificationUpdating}
          />
        </div>
      </div>
    </div>
  );
}
