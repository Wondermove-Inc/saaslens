// src/components/integrations/integration-settings-form.tsx
"use client";

import {
  updateIntegrationSettings,
  type IntegrationSettingsInput,
} from "@/actions/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface IntegrationSettingsFormProps {
  integrationId: string;
  initialSettings: IntegrationSettingsInput;
  disabled?: boolean;
}

export function IntegrationSettingsForm({
  integrationId,
  initialSettings,
  disabled = false,
}: IntegrationSettingsFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<IntegrationSettingsInput>({
    autoSync: initialSettings.autoSync ?? false,
    syncInterval: initialSettings.syncInterval ?? "daily",
    syncUsers: initialSettings.syncUsers ?? true,
    syncApps: initialSettings.syncApps ?? false,
  });

  const handleSave = () => {
    startTransition(async () => {
      await updateIntegrationSettings(integrationId, settings);
      router.refresh();
    });
  };

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("integrations.settings.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 자동 동기화 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="autoSync">
              {t("integrations.settings.autoSync.label")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("integrations.settings.autoSync.description")}
            </p>
          </div>
          <Switch
            id="autoSync"
            aria-label={t("integrations.settings.autoSync.ariaLabel")}
            checked={settings.autoSync}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, autoSync: checked }))
            }
            disabled={disabled || isPending}
          />
        </div>

        {/* 동기화 주기 */}
        <div className="space-y-2">
          <Label htmlFor="syncInterval">
            {t("integrations.settings.syncInterval.label")}
          </Label>
          <Select
            value={settings.syncInterval}
            onValueChange={(value: "hourly" | "daily" | "weekly") =>
              setSettings((prev) => ({ ...prev, syncInterval: value }))
            }
            disabled={disabled || isPending || !settings.autoSync}
          >
            <SelectTrigger id="syncInterval">
              <SelectValue
                placeholder={t(
                  "integrations.settings.syncInterval.placeholder"
                )}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">
                {t("integrations.settings.syncInterval.hourly")}
              </SelectItem>
              <SelectItem value="daily">
                {t("integrations.settings.syncInterval.daily")}
              </SelectItem>
              <SelectItem value="weekly">
                {t("integrations.settings.syncInterval.weekly")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 사용자 동기화 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="syncUsers">
              {t("integrations.settings.syncUsers.label")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("integrations.settings.syncUsers.description")}
            </p>
          </div>
          <Switch
            id="syncUsers"
            aria-label={t("integrations.settings.syncUsers.ariaLabel")}
            checked={settings.syncUsers}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, syncUsers: checked }))
            }
            disabled={disabled || isPending}
          />
        </div>

        {/* 앱 동기화 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="syncApps">
              {t("integrations.settings.syncApps.label")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("integrations.settings.syncApps.description")}
            </p>
          </div>
          <Switch
            id="syncApps"
            aria-label={t("integrations.settings.syncApps.ariaLabel")}
            checked={settings.syncApps}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, syncApps: checked }))
            }
            disabled={disabled || isPending}
          />
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={disabled || isPending}>
            {isPending
              ? t("integrations.actions.saving")
              : t("integrations.actions.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
