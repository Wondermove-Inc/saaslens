// src/components/apps/app-edit-form.tsx
"use client";

import { getTeams, type TeamWithStats } from "@/actions/teams";
import { AppFormFields } from "@/components/apps/app-form-fields";
import {
  appFormSchema,
  type AppFormValues,
} from "@/components/apps/app-form-schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppDetail } from "@/types/app";
import { zodResolver } from "@hookform/resolvers/zod";
import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface AppEditFormProps {
  app: AppDetail;
  userRole?: string;
  userTeamId?: string | null;
}

const toFormValues = (app: AppDetail): AppFormValues => ({
  name: app.name,
  status: app.status,
  category: app.category ?? "",
  customLogoUrl: app.customLogoUrl ?? "",
  customWebsite: app.customWebsite ?? "",
  notes: app.notes ?? "",
  tags: app.tags?.join(", ") ?? "",
  teamIds: app.teams?.map((t) => t.id) ?? [],
});

const normalizePayload = (values: AppFormValues) => {
  const trimmed = {
    ...values,
    name: values.name.trim(),
    category: values.category?.trim() || undefined,
    customLogoUrl: values.customLogoUrl?.trim() || undefined,
    customWebsite: values.customWebsite?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
    tags: values.tags?.trim() || undefined,
    status: values.status || undefined,
  };

  if (!trimmed.tags) {
    delete trimmed.tags;
  }

  return trimmed;
};

const extractErrorMessage = (
  error: unknown,
  t: (key: string) => string
): string => {
  if (!error) return t("apps.form.error.request");
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    "message" in (error as Record<string, unknown>)
  ) {
    return String((error as { message?: unknown }).message);
  }
  return t("apps.form.error.request");
};

export function AppEditForm({ app, userRole, userTeamId }: AppEditFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const defaultValues = useMemo(() => toFormValues(app), [app]);

  // 역할 기반 제한 여부
  const isRestricted = userRole === "MEMBER" || userRole === "VIEWER";

  // 팀 목록 로드 (역할 기반 필터링)
  useEffect(() => {
    const loadTeams = async () => {
      const result = await getTeams();
      if (result.success && result.data) {
        let filteredTeams = result.data;

        // MEMBER/VIEWER는 본인 팀만 표시
        if (isRestricted && userTeamId) {
          filteredTeams = result.data.filter((team) => team.id === userTeamId);
        }

        setTeams(filteredTeams);
      }
    };
    loadTeams();
  }, [isRestricted, userTeamId]);

  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    register,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AppFormValues, HttpError, AppFormValues>({
    refineCoreProps: {
      resource: "apps",
      id: app.id,
      action: "edit",
      redirect: false,
      queryOptions: { enabled: false },
      onMutationError: (error) => setSubmitError(extractErrorMessage(error, t)),
    },
    resolver: zodResolver(appFormSchema),
    defaultValues,
  });

  const isPending = formLoading || isSubmitting;
  const errorMessage = submitError;

  const handleCancel = () => {
    router.back();
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onFinish(normalizePayload(values));
      router.push(`/apps/${app.id}`);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, t));
    }
  });

  // 팀 옵션 변환
  const teamOptions = teams.map((team) => ({
    id: team.id,
    name: team.name,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("apps.form.edit.title")}</CardTitle>
        <CardDescription>{t("apps.form.edit.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <AppFormFields
            register={register}
            control={control}
            errors={errors}
            includeStatus
            disabled={isPending}
            teamOptions={teamOptions}
            isRestricted={isRestricted}
            userTeamId={userTeamId}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("apps.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("apps.actions.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
