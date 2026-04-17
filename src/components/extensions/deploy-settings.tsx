// src/components/extensions/deploy-settings.tsx
"use client";

import type {
  ExtensionDeployMethod,
  ExtensionDeploySettings,
} from "@/actions/extensions/builds";
import { updateExtensionDeploySettings } from "@/actions/extensions/builds";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Globe, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

interface DeploySettingsProps {
  initialSettings: ExtensionDeploySettings;
}

export function DeploySettings({ initialSettings }: DeploySettingsProps) {
  const t = useTranslations("extensions.deploySettings");
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState<ExtensionDeployMethod>(
    initialSettings.extensionDeployMethod
  );
  const [webstoreUrl, setWebstoreUrl] = useState(
    initialSettings.extensionWebstoreUrl
  );

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const result = await updateExtensionDeploySettings({
        extensionDeployMethod: method,
        extensionWebstoreUrl: webstoreUrl,
      });
      if (result.success) {
        toast.success(t("saveSuccess"));
      } else {
        toast.error(result.error || t("saveFailed"));
      }
    });
  }, [method, webstoreUrl, t]);

  const hasChanges =
    method !== initialSettings.extensionDeployMethod ||
    webstoreUrl !== initialSettings.extensionWebstoreUrl;

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={method}
          onValueChange={(value) => setMethod(value as ExtensionDeployMethod)}
          className="space-y-4"
        >
          <div className="flex items-start space-x-3 rounded-sm border p-4">
            <RadioGroupItem value="auto" id="deploy-auto" className="mt-1" />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="deploy-auto"
                className="flex items-center gap-2 font-medium"
              >
                <Monitor className="h-4 w-4" />
                {t("auto.label")}
              </Label>
              <p className="text-muted-foreground text-sm">
                {t("auto.description")}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-sm border p-4">
            <RadioGroupItem
              value="webstore"
              id="deploy-webstore"
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="deploy-webstore"
                className="flex items-center gap-2 font-medium"
              >
                <Globe className="h-4 w-4" />
                {t("webstore.label")}
              </Label>
              <p className="text-muted-foreground text-sm">
                {t("webstore.description")}
              </p>
              {method === "webstore" && (
                <div className="mt-3">
                  <Label htmlFor="webstore-url" className="text-sm">
                    {t("webstore.urlLabel")}
                  </Label>
                  <Input
                    id="webstore-url"
                    type="url"
                    placeholder={t("webstore.urlPlaceholder")}
                    value={webstoreUrl}
                    onChange={(e) => setWebstoreUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        </RadioGroup>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending || !hasChanges}>
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
