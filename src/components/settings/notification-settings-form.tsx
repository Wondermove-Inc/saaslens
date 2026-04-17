// src/components/settings/notification-settings-form.tsx
"use client";

import type { NotificationSettings } from "@/actions/organization-notification-settings";
import { updateOrganizationNotificationSettings } from "@/actions/organization-notification-settings";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  UserMinus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface NotificationSettingsFormProps {
  initialSettings: NotificationSettings;
}

const RENEWAL_ALERT_OPTIONS = [
  { value: 30, label: "30일 전" },
  { value: 60, label: "60일 전" },
  { value: 90, label: "90일 전" },
];

export function NotificationSettingsForm({
  initialSettings,
}: NotificationSettingsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] =
    useState<NotificationSettings>(initialSettings);

  const handleEmailEnabledChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, emailEnabled: checked }));
    startTransition(async () => {
      const result = await updateOrganizationNotificationSettings({
        emailEnabled: checked,
      });
      if (result.success) {
        toast.success(t("settings.notifications.toast.emailUpdated"));
      } else {
        toast.error(result.message || t("settings.notifications.toast.failed"));
        setSettings((prev) => ({ ...prev, emailEnabled: !checked }));
      }
    });
  };

  const handleRenewalAlertDaysChange = (day: number, checked: boolean) => {
    const newDays = checked
      ? [...settings.renewalAlertDays, day].sort((a, b) => a - b)
      : settings.renewalAlertDays.filter((d) => d !== day);

    setSettings((prev) => ({ ...prev, renewalAlertDays: newDays }));
    startTransition(async () => {
      const result = await updateOrganizationNotificationSettings({
        renewalAlertDays: newDays,
      });
      if (result.success) {
        toast.success(t("settings.notifications.toast.renewalUpdated"));
      } else {
        toast.error(result.message || t("settings.notifications.toast.failed"));
        setSettings((prev) => ({
          ...prev,
          renewalAlertDays: checked
            ? prev.renewalAlertDays.filter((d) => d !== day)
            : [...prev.renewalAlertDays, day].sort((a, b) => a - b),
        }));
      }
    });
  };

  const handleOffboardingAlertsChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, offboardingAlerts: checked }));
    startTransition(async () => {
      const result = await updateOrganizationNotificationSettings({
        offboardingAlerts: checked,
      });
      if (result.success) {
        toast.success(t("settings.notifications.toast.offboardingUpdated"));
      } else {
        toast.error(result.message || t("settings.notifications.toast.failed"));
        setSettings((prev) => ({ ...prev, offboardingAlerts: !checked }));
      }
    });
  };

  const handleWeeklyDigestChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, weeklyDigest: checked }));
    startTransition(async () => {
      const result = await updateOrganizationNotificationSettings({
        weeklyDigest: checked,
      });
      if (result.success) {
        toast.success(t("settings.notifications.toast.weeklyUpdated"));
      } else {
        toast.error(result.message || t("settings.notifications.toast.failed"));
        setSettings((prev) => ({ ...prev, weeklyDigest: !checked }));
      }
    });
  };

  const handleShadowITAlertsChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, shadowITAlerts: checked }));
    startTransition(async () => {
      const result = await updateOrganizationNotificationSettings({
        shadowITAlerts: checked,
      });
      if (result.success) {
        toast.success(t("settings.notifications.toast.shadowUpdated"));
      } else {
        toast.error(result.message || t("settings.notifications.toast.failed"));
        setSettings((prev) => ({ ...prev, shadowITAlerts: !checked }));
      }
    });
  };

  const handleCostAnomalyAlertsChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, costAnomalyAlerts: checked }));
    startTransition(async () => {
      const result = await updateOrganizationNotificationSettings({
        costAnomalyAlerts: checked,
      });
      if (result.success) {
        toast.success(t("settings.notifications.toast.costUpdated"));
      } else {
        toast.error(result.message || t("settings.notifications.toast.failed"));
        setSettings((prev) => ({ ...prev, costAnomalyAlerts: !checked }));
      }
    });
  };

  const handleCostAnomalyThresholdChange = (threshold: number) => {
    if (threshold < 10 || threshold > 200) return;

    setSettings((prev) => ({ ...prev, costAnomalyThreshold: threshold }));
    startTransition(async () => {
      const result = await updateOrganizationNotificationSettings({
        costAnomalyThreshold: threshold,
      });
      if (result.success) {
        toast.success(t("settings.notifications.toast.thresholdUpdated"));
      } else {
        toast.error(result.message || t("settings.notifications.toast.failed"));
        setSettings((prev) => ({
          ...prev,
          costAnomalyThreshold: initialSettings.costAnomalyThreshold,
        }));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 이메일 알림 활성화 */}
      <div className="hover:bg-purple-gray space-y-3 rounded-lg border p-4 transition-colors">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <h3 className="font-medium">
            {t("settings.notifications.email.title")}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("settings.notifications.email.description")}
        </p>
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <Label htmlFor="email-enabled">
              {t("settings.notifications.email.toggleLabel")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("settings.notifications.email.toggleDescription")}
            </p>
          </div>
          <Switch
            id="email-enabled"
            checked={settings.emailEnabled}
            onCheckedChange={handleEmailEnabledChange}
            disabled={isPending}
          />
        </div>
      </div>

      {/* 갱신 알림 */}
      <div className="hover:bg-purple-gray space-y-3 rounded-lg border p-4 transition-colors">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="font-medium">
            {t("settings.notifications.renewal.title")}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("settings.notifications.renewal.description")}
        </p>
        <div className="space-y-4 pt-2">
          {RENEWAL_ALERT_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`renewal-${option.value}`}
                checked={settings.renewalAlertDays.includes(option.value)}
                onCheckedChange={(checked) =>
                  handleRenewalAlertDaysChange(option.value, checked === true)
                }
                disabled={isPending}
              />
              <Label
                htmlFor={`renewal-${option.value}`}
                className="cursor-pointer"
              >
                {t("settings.notifications.renewal.option", {
                  label: option.label,
                })}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* 퇴사자 알림 */}
      <div className="hover:bg-purple-gray space-y-3 rounded-lg border p-4 transition-colors">
        <div className="flex items-center gap-2">
          <UserMinus className="h-5 w-5" />
          <h3 className="font-medium">
            {t("settings.notifications.offboarding.title")}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("settings.notifications.offboarding.description")}
        </p>
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <Label htmlFor="offboarding-alerts">
              {t("settings.notifications.offboarding.toggleLabel")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("settings.notifications.offboarding.toggleDescription")}
            </p>
          </div>
          <Switch
            id="offboarding-alerts"
            checked={settings.offboardingAlerts}
            onCheckedChange={handleOffboardingAlertsChange}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Shadow IT 알림 */}
      <div className="hover:bg-purple-gray space-y-3 rounded-lg border p-4 transition-colors">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-medium">
            {t("settings.notifications.shadow.title")}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("settings.notifications.shadow.description")}
        </p>
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <Label htmlFor="shadow-it-alerts">
              {t("settings.notifications.shadow.toggleLabel")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("settings.notifications.shadow.toggleDescription")}
            </p>
          </div>
          <Switch
            id="shadow-it-alerts"
            checked={settings.shadowITAlerts}
            onCheckedChange={handleShadowITAlertsChange}
            disabled={isPending}
          />
        </div>
      </div>

      {/* 비용 이상 감지 알림 */}
      <div className="hover:bg-purple-gray space-y-3 rounded-lg border p-4 transition-colors">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          <h3 className="font-medium">
            {t("settings.notifications.cost.title")}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("settings.notifications.cost.description")}
        </p>
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cost-anomaly-alerts">
                {t("settings.notifications.cost.toggleLabel")}
              </Label>
              <p className="text-muted-foreground text-sm">
                {t("settings.notifications.cost.toggleDescription")}
              </p>
            </div>
            <Switch
              id="cost-anomaly-alerts"
              checked={settings.costAnomalyAlerts}
              onCheckedChange={handleCostAnomalyAlertsChange}
              disabled={isPending}
            />
          </div>
          {settings.costAnomalyAlerts && (
            <div className="flex items-center gap-3">
              <Label
                htmlFor="cost-anomaly-threshold"
                className="text-sm whitespace-nowrap"
              >
                {t("settings.notifications.cost.thresholdLabel")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cost-anomaly-threshold"
                  type="number"
                  min={10}
                  max={200}
                  value={settings.costAnomalyThreshold}
                  onChange={(e) =>
                    handleCostAnomalyThresholdChange(Number(e.target.value))
                  }
                  disabled={isPending}
                  className="w-20"
                />
                <span className="text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("settings.notifications.cost.thresholdHint", {
                  percent: settings.costAnomalyThreshold,
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 주간 요약 */}
      <div className="hover:bg-purple-gray space-y-3 rounded-lg border p-4 transition-colors">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h3 className="font-medium">
            {t("settings.notifications.weekly.title")}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("settings.notifications.weekly.description")}
        </p>
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <Label htmlFor="weekly-digest">
              {t("settings.notifications.weekly.toggleLabel")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("settings.notifications.weekly.toggleDescription")}
            </p>
          </div>
          <Switch
            id="weekly-digest"
            checked={settings.weeklyDigest}
            onCheckedChange={handleWeeklyDigestChange}
            disabled={isPending}
          />
        </div>
      </div>

      {isPending && (
        <div className="text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("settings.notifications.saving")}</span>
        </div>
      )}
    </div>
  );
}
