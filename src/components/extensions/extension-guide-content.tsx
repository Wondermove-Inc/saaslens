// src/components/extensions/extension-guide-content.tsx
"use client";

import type { ExtensionDeployMethod } from "@/actions/extensions/builds";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  Chrome,
  Download,
  ExternalLink,
  Monitor,
  SkipForward,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface ExtensionGuideContentProps {
  deployMethod: ExtensionDeployMethod;
  webstoreUrl: string;
  latestBuildId: string | null;
  latestBuildVersion: string | null;
}

export function ExtensionGuideContent({
  deployMethod,
  webstoreUrl,
  latestBuildId,
  latestBuildVersion,
}: ExtensionGuideContentProps) {
  const t = useTranslations("extensions.extensionGuide");
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <Chrome className="text-primary mx-auto h-12 w-12" />
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {deployMethod === "auto" && <AutoGuide t={t} />}
        {deployMethod === "webstore" && (
          <WebstoreGuide t={t} webstoreUrl={webstoreUrl} />
        )}
        {deployMethod === "manual" && (
          <ManualGuide
            t={t}
            latestBuildId={latestBuildId}
            latestBuildVersion={latestBuildVersion}
          />
        )}

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <SkipForward className="mr-2 h-4 w-4" />
            {t("skipButton")}
          </Button>
          <Button onClick={() => router.push("/dashboard")}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t("doneButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
        {number}
      </div>
      <p className="text-muted-foreground pt-0.5 text-sm">{text}</p>
    </div>
  );
}

function AutoGuide({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          {t("auto.title")}
        </CardTitle>
        <CardDescription>{t("auto.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <StepItem number={1} text={t("auto.step1")} />
        <StepItem number={2} text={t("auto.step2")} />
        <StepItem number={3} text={t("auto.step3")} />
      </CardContent>
    </Card>
  );
}

function WebstoreGuide({
  t,
  webstoreUrl,
}: {
  t: ReturnType<typeof useTranslations>;
  webstoreUrl: string;
}) {
  return (
    <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Chrome className="h-5 w-5" />
          {t("webstore.title")}
        </CardTitle>
        <CardDescription>{t("webstore.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <StepItem number={1} text={t("webstore.step1")} />
          <StepItem number={2} text={t("webstore.step2")} />
          <StepItem number={3} text={t("webstore.step3")} />
        </div>
        {webstoreUrl && (
          <Button asChild className="w-full">
            <a href={webstoreUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("webstore.installButton")}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ManualGuide({
  t,
  latestBuildId,
  latestBuildVersion,
}: {
  t: ReturnType<typeof useTranslations>;
  latestBuildId: string | null;
  latestBuildVersion: string | null;
}) {
  return (
    <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t("manual.title")}
        </CardTitle>
        <CardDescription>{t("manual.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <StepItem number={1} text={t("manual.step1")} />
          <StepItem number={2} text={t("manual.step2")} />
          <StepItem number={3} text={t("manual.step3")} />
          <StepItem number={4} text={t("manual.step4")} />
          <StepItem number={5} text={t("manual.step5")} />
          <StepItem number={6} text={t("manual.step6")} />
        </div>
        {latestBuildId ? (
          <Button asChild className="w-full">
            <a
              href={`/api/v1/extensions/builds/${latestBuildId}/download`}
              download
            >
              <Download className="mr-2 h-4 w-4" />
              {t("manual.downloadButton")}
              {latestBuildVersion && ` (v${latestBuildVersion})`}
            </a>
          </Button>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            {t("manual.noBuilds")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
