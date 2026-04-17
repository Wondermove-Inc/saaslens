// src/components/subscriptions/subscription-form.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SubscriptionDetail } from "@/types/subscription";
import { zodResolver } from "@hookform/resolvers/zod";
import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Controller, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import {
  SubscriptionFormAssignment,
  type AppWithTeams,
  type UserOption,
} from "./subscription-form-assignment";
import { SubscriptionFormPeriod } from "./subscription-form-period";
import { SubscriptionFormPricing } from "./subscription-form-pricing";
import { SubscriptionFormRenewal } from "./subscription-form-renewal";
import {
  createSubscriptionFormSchema,
  type SubscriptionFormValues,
} from "./subscription-form-schema";
import {
  formatDateForInput,
  getStatusOptions,
} from "./subscription-form.constants";

interface SubscriptionFormProps {
  apps: AppWithTeams[];
  users?: UserOption[];
  isAdmin?: boolean;
  subscription?: SubscriptionDetail;
  hideActions?: boolean;
  formId?: string;
  onPendingChange?: (isPending: boolean) => void;
  initialAmount?: string;
  onSuccess?: (createdSubscriptionId?: string) => void;
}

export function SubscriptionForm({
  apps,
  users = [],
  isAdmin = false,
  subscription,
  hideActions = false,
  formId,
  onPendingChange,
  initialAmount,
  onSuccess,
}: SubscriptionFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const isEditing = !!subscription;

  const subscriptionFormSchema = useMemo(
    () => createSubscriptionFormSchema(t),
    [t]
  );

  const defaultValues: SubscriptionFormValues = useMemo(
    () => ({
      appId: subscription?.appId ?? "",
      billingCycle: subscription?.billingCycle ?? "MONTHLY",
      billingType: subscription?.billingType ?? "FLAT_RATE",
      amount: subscription
        ? String(subscription.amount)
        : (initialAmount ?? ""),
      currency: subscription?.currency ?? "KRW",
      totalLicenses: subscription?.totalLicenses ?? undefined,
      usedLicenses: subscription?.usedLicenses ?? undefined,
      startDate: subscription ? formatDateForInput(subscription.startDate) : "",
      endDate: subscription ? formatDateForInput(subscription.endDate) : "",
      renewalDate: subscription
        ? formatDateForInput(subscription.renewalDate)
        : "",
      autoRenewal: subscription?.autoRenewal ?? true,
      renewalAlert30: subscription?.renewalAlert30 ?? true,
      renewalAlert60: subscription?.renewalAlert60 ?? false,
      renewalAlert90: subscription?.renewalAlert90 ?? false,
      contractUrl: subscription?.contractUrl ?? "",
      notes: subscription?.notes ?? "",
      status: subscription?.status ?? "ACTIVE",
      teamId: subscription?.teamId ?? null,
      teamIds:
        subscription?.teams?.map((t) => t.id) ??
        (subscription?.teamId ? [subscription.teamId] : []),
      assignedUserIds: subscription?.assignedUsers?.map((u) => u.id) ?? [],
    }),
    [subscription]
  );

  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    register,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues, HttpError, SubscriptionFormValues>({
    refineCoreProps: {
      resource: "subscriptions",
      action: isEditing ? "edit" : "create",
      id: subscription?.id,
      redirect: false,
    },
    resolver: zodResolver(
      subscriptionFormSchema
    ) as unknown as Resolver<SubscriptionFormValues>,
    defaultValues,
  });

  const isPending = formLoading || isSubmitting;

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const watchedBillingType = useWatch({ control, name: "billingType" });
  const watchedUserIds = useWatch({ control, name: "assignedUserIds" });
  const selectedUserIds = useMemo(() => watchedUserIds ?? [], [watchedUserIds]);

  // PER_SEAT: 유저 배정 → usedLicenses 자동 동기화
  useEffect(() => {
    if (watchedBillingType === "PER_SEAT" && selectedUserIds.length > 0) {
      setValue("usedLicenses", selectedUserIds.length);
    }
  }, [watchedBillingType, selectedUserIds.length, setValue]);

  const handleCancel = () => router.back();

  const onSubmit = handleSubmit(
    async (values) => {
      const payload = {
        ...values,
        totalLicenses: values.totalLicenses ?? undefined,
        usedLicenses: values.usedLicenses ?? undefined,
        endDate: values.endDate || undefined,
        renewalDate: values.renewalDate || undefined,
      };
      try {
        const result = await onFinish(payload);
        const id =
          (result?.data as { id?: string })?.id ??
          (result?.data as { data?: { id?: string } })?.data?.id ??
          subscription?.id;
        toast.success(
          isEditing
            ? t("subscriptions.actions.saveSuccess")
            : t("subscriptions.actions.createSuccess")
        );
        if (onSuccess) {
          onSuccess(id);
          return;
        }
        router.push(id ? `/subscriptions/${id}` : "/subscriptions");
      } catch (error) {
        const message = error instanceof Error ? error.message : undefined;
        toast.error(
          message ||
            (isEditing
              ? t("subscriptions.actions.saveError")
              : t("subscriptions.actions.createError"))
        );
      }
    },
    (validationErrors) => {
      const firstKey = Object.keys(validationErrors)[0];
      const firstError =
        validationErrors[firstKey as keyof typeof validationErrors];
      const message =
        firstError && "message" in firstError
          ? String(firstError.message)
          : t("subscriptions.actions.saveError");
      toast.error(message);
    }
  );

  return (
    <form onSubmit={onSubmit} id={formId}>
      {/* 상단 액션 버튼 */}
      {!hideActions && (
        <div className="mb-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t("subscriptions.actions.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing
              ? t("subscriptions.actions.save")
              : t("subscriptions.actions.register")}
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* 기본 정보 카드: 앱 선택 + 상태 */}
        <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>{t("subscriptions.form.basicInfo.title")}</CardTitle>
            <CardDescription>
              {t("subscriptions.form.basicInfo.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appId">
                {t("subscriptions.form.basicInfo.appSelect")}
              </Label>
              <Controller
                control={control}
                name="appId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEditing || isPending}
                  >
                    <SelectTrigger id="appId">
                      <SelectValue
                        placeholder={t(
                          "subscriptions.form.basicInfo.appPlaceholder"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {apps.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.appId?.message && (
                <p className="text-destructive text-sm">
                  {errors.appId.message.toString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("subscriptions.form.status.title")}</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "ACTIVE"}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("subscriptions.form.status.placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusOptions(t).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 요금 카드 */}
        <SubscriptionFormPricing
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          isPending={isPending}
          defaultCurrency={defaultValues.currency}
          users={users}
          isAdmin={isAdmin}
          selectedUserIds={selectedUserIds}
        />

        {/* 기간 카드 */}
        <SubscriptionFormPeriod
          control={control}
          errors={errors}
          isPending={isPending}
        />

        {/* 배정 카드 */}
        <SubscriptionFormAssignment
          control={control}
          apps={apps}
          users={users}
          isAdmin={isAdmin}
          isPending={isPending}
          billingType={watchedBillingType}
          setValue={(name, value) =>
            setValue(name, value as SubscriptionFormValues[typeof name])
          }
        />

        {/* 자동 갱신/알림 카드 */}
        <SubscriptionFormRenewal control={control} isPending={isPending} />

        {/* 메모 카드 */}
        <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>{t("subscriptions.form.basicInfo.notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Textarea
                id="notes"
                placeholder={t("subscriptions.form.basicInfo.notesPlaceholder")}
                rows={4}
                disabled={isPending}
                {...register("notes")}
              />
              {errors.notes?.message && (
                <p className="text-destructive text-sm">
                  {errors.notes.message.toString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
