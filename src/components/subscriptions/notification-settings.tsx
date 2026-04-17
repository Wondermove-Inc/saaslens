// src/components/subscriptions/notification-settings.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";

export type NotificationField =
  | "renewalAlert30"
  | "renewalAlert60"
  | "renewalAlert90";

export interface NotificationSettingsProps {
  subscriptionId: string;
  renewalAlert30: boolean;
  renewalAlert60: boolean;
  renewalAlert90: boolean;
  onChange: (field: NotificationField, value: boolean) => void;
  disabled?: boolean;
}

export function NotificationSettings({
  renewalAlert30,
  renewalAlert60,
  renewalAlert90,
  onChange,
  disabled = false,
}: NotificationSettingsProps) {
  const t = useTranslations();
  const alerts = [
    {
      field: "renewalAlert30" as NotificationField,
      label: t("subscriptions.notifications.alert30.label"),
      description: t("subscriptions.notifications.alert30.description"),
      checked: renewalAlert30,
    },
    {
      field: "renewalAlert60" as NotificationField,
      label: t("subscriptions.notifications.alert60.label"),
      description: t("subscriptions.notifications.alert60.description"),
      checked: renewalAlert60,
    },
    {
      field: "renewalAlert90" as NotificationField,
      label: t("subscriptions.notifications.alert90.label"),
      description: t("subscriptions.notifications.alert90.description"),
      checked: renewalAlert90,
    },
  ];

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="text-primary h-5 w-5" />
          <CardTitle>{t("subscriptions.notifications.title")}</CardTitle>
        </div>
        <CardDescription>
          {t("subscriptions.notifications.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.field}
            className="flex items-center justify-between space-x-4"
          >
            <div className="flex-1 space-y-1">
              <Label
                htmlFor={alert.field}
                className="cursor-pointer font-medium"
              >
                {alert.label}
              </Label>
              <p className="text-muted-foreground text-sm">
                {alert.description}
              </p>
            </div>
            <Switch
              id={alert.field}
              checked={alert.checked}
              onCheckedChange={(checked) => onChange(alert.field, checked)}
              disabled={disabled}
              aria-label={alert.label}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
