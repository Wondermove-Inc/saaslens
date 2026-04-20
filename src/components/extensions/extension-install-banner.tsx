// src/components/extensions/extension-install-banner.tsx
"use client";

import type { ExtensionDeployMethod } from "@/actions/extensions/builds";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chrome, ExternalLink, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "extension-install-banner-dismissed";

interface ExtensionInstallBannerProps {
  installed: boolean;
  deployMethod: ExtensionDeployMethod;
  webstoreUrl: string;
}

export function ExtensionInstallBanner({
  installed,
  deployMethod,
  webstoreUrl,
}: ExtensionInstallBannerProps) {
  const t = useTranslations("extensions.installBanner");
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    setDismissed(stored === "true");
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }, []);

  if (installed || dismissed) {
    return null;
  }

  return (
    <Alert className="relative">
      <Chrome className="h-4 w-4" />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {deployMethod === "auto" && t("auto.message")}
          {deployMethod === "webstore" && t("webstore.message")}
          {deployMethod === "manual" && t("manual.message")}
        </span>
        <div className="ml-4 flex shrink-0 items-center gap-2">
          {deployMethod === "webstore" && webstoreUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={webstoreUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" />
                {t("webstore.action")}
              </a>
            </Button>
          )}
          {deployMethod === "manual" && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/extension-guide">{t("manual.action")}</Link>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            aria-label={t("dismiss")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
