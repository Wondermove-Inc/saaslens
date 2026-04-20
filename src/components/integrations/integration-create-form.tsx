// src/components/integrations/integration-create-form.tsx
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { Loader2, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller } from "react-hook-form";
import {
  integrationCreateSchema,
  type IntegrationCreateValues,
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

export function IntegrationCreateForm() {
  const t = useTranslations();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    register,
    control,
    formState: { errors, isSubmitting },
  } = useForm<IntegrationCreateValues, HttpError, IntegrationCreateValues>({
    refineCoreProps: {
      resource: "integrations",
      action: "create",
      redirect: false,
      onMutationError: (error) => setSubmitError(extractErrorMessage(error, t)),
    },
    resolver: zodResolver(integrationCreateSchema),
    defaultValues: {
      type: "GOOGLE_WORKSPACE",
      domain: "",
      adminEmail: "",
      serviceAccountEmail: "",
      privateKey: "",
    },
  });

  const isPending = formLoading || isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = {
      type: values.type,
      credentials: {
        adminEmail: values.adminEmail || undefined,
        serviceAccountEmail: values.serviceAccountEmail || undefined,
        privateKey: values.privateKey || undefined,
      },
      metadata: {
        domain: values.domain || undefined,
      },
    };

    try {
      await onFinish(payload);
      router.push("/integrations");
    } catch (error) {
      setSubmitError(extractErrorMessage(error, t));
    }
  });

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("integrations.form.create.title")}</CardTitle>
        <CardDescription>
          {t("integrations.form.create.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">{t("integrations.list.columns.type")}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) =>
                    field.onChange(value as IntegrationCreateValues["type"])
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="type">
                    <SelectValue
                      placeholder={t(
                        "integrations.form.create.typePlaceholder"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOGLE_WORKSPACE">
                      {t("integrations.type.googleWorkspace")}
                    </SelectItem>
                    <SelectItem value="OKTA">
                      {t("integrations.type.okta")}
                    </SelectItem>
                    <SelectItem value="AZURE_AD">
                      {t("integrations.type.microsoftEntra")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type?.message && (
              <p className="text-destructive text-sm">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">
              {t("integrations.form.create.domainLabel")}
            </Label>
            <Input
              id="domain"
              placeholder={t("integrations.form.create.domainPlaceholder")}
              disabled={isPending}
              {...register("domain")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">
                {t("integrations.form.create.adminEmailLabel")}
              </Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder={t(
                  "integrations.form.create.adminEmailPlaceholder"
                )}
                disabled={isPending}
                {...register("adminEmail")}
              />
              {errors.adminEmail?.message && (
                <p className="text-destructive text-sm">
                  {errors.adminEmail.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceAccountEmail">
                {t("integrations.form.create.serviceAccountEmailLabel")}
              </Label>
              <Input
                id="serviceAccountEmail"
                type="email"
                placeholder={t(
                  "integrations.form.create.serviceAccountEmailPlaceholder"
                )}
                disabled={isPending}
                {...register("serviceAccountEmail")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privateKey" className="flex items-center gap-2">
              {t("integrations.form.create.privateKeyLabel")}
              <Shield className="text-muted-foreground h-4 w-4" />
            </Label>
            <Textarea
              id="privateKey"
              placeholder={t("integrations.form.create.privateKeyPlaceholder")}
              rows={4}
              disabled={isPending}
              {...register("privateKey")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              {t("integrations.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("integrations.actions.create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
