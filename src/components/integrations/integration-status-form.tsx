// src/components/integrations/integration-status-form.tsx
"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  integrationStatusSchema,
  type IntegrationStatusValues,
} from "./integration-form-schema";

const extractErrorMessage = (
  error: unknown,
  t: (key: string) => string
): string => {
  if (!error) return t("integrations.form.error.request");
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    "message" in (error as Record<string, unknown>)
  ) {
    return String((error as { message?: unknown }).message);
  }
  return t("integrations.form.error.request");
};

interface IntegrationStatusFormProps {
  id: string;
  defaultStatus: IntegrationStatusValues["status"];
}

export function IntegrationStatusForm({
  id,
  defaultStatus,
}: IntegrationStatusFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<IntegrationStatusValues, HttpError, IntegrationStatusValues>({
    refineCoreProps: {
      resource: "integrations",
      id,
      action: "edit",
      redirect: false,
      onMutationError: (error) => setSubmitError(extractErrorMessage(error, t)),
    },
    resolver: zodResolver(integrationStatusSchema),
    defaultValues: { status: defaultStatus },
  });

  const isPending = formLoading || isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onFinish(values);
      router.push(`/integrations/${id}`);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, t));
    }
  });

  return (
    <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("integrations.form.editStatus.title")}</CardTitle>
        <CardDescription>
          {t("integrations.form.editStatus.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">
              {t("integrations.list.columns.status")}
            </Label>
            <Select
              defaultValue={defaultStatus}
              onValueChange={(value) =>
                setValue("status", value as IntegrationStatusValues["status"])
              }
              disabled={isPending}
            >
              <SelectTrigger id="status">
                <SelectValue
                  placeholder={t(
                    "integrations.form.editStatus.statusPlaceholder"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">
                  {t("integrations.status.active")}
                </SelectItem>
                <SelectItem value="PENDING">
                  {t("integrations.status.pending")}
                </SelectItem>
                <SelectItem value="ERROR">
                  {t("integrations.status.error")}
                </SelectItem>
                <SelectItem value="DISCONNECTED">
                  {t("integrations.status.disconnected")}
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.status?.message && (
              <p className="text-destructive text-sm">
                {errors.status.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              {t("integrations.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("integrations.actions.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
