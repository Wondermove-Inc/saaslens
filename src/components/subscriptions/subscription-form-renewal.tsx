// src/components/subscriptions/subscription-form-renewal.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { SubscriptionFormValues } from "./subscription-form-schema";

interface SubscriptionFormRenewalProps {
  control: Control<SubscriptionFormValues>;
  isPending: boolean;
}

export function SubscriptionFormRenewal({
  control,
  isPending,
}: SubscriptionFormRenewalProps) {
  const t = useTranslations("subscriptions.form");

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("autoRenewal.title")}</CardTitle>
        <CardDescription>{t("autoRenewal.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="autoRenewal">{t("autoRenewal.label")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("autoRenewal.helpText")}
            </p>
          </div>
          <Controller
            control={control}
            name="autoRenewal"
            render={({ field }) => (
              <Switch
                id="autoRenewal"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
        </div>

        <div className="border-t pt-4">
          <Label className="text-sm font-medium">
            {t("renewalAlert.title")}
          </Label>
          <p className="text-muted-foreground mb-3 text-xs">
            {t("renewalAlert.helpText")}
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Controller
                control={control}
                name="renewalAlert30"
                render={({ field }) => (
                  <Checkbox
                    id="renewalAlert30"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                    disabled={isPending}
                  />
                )}
              />
              <Label htmlFor="renewalAlert30" className="font-normal">
                {t("renewalAlert.alert30")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                control={control}
                name="renewalAlert60"
                render={({ field }) => (
                  <Checkbox
                    id="renewalAlert60"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                    disabled={isPending}
                  />
                )}
              />
              <Label htmlFor="renewalAlert60" className="font-normal">
                {t("renewalAlert.alert60")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                control={control}
                name="renewalAlert90"
                render={({ field }) => (
                  <Checkbox
                    id="renewalAlert90"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                    disabled={isPending}
                  />
                )}
              />
              <Label htmlFor="renewalAlert90" className="font-normal">
                {t("renewalAlert.alert90")}
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
