// src/app/(dashboard)/extensions/builds/page.tsx
import { getExtensionDeploySettings } from "@/actions/extensions/builds";
import { BuildsPageClient } from "@/components/extensions/builds-page-client";
import { DeploySettings } from "@/components/extensions/deploy-settings";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("extensions.builds.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function BuildsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

async function DeploySettingsSection() {
  const result = await getExtensionDeploySettings();
  const settings =
    result.success && result.data
      ? result.data
      : { extensionDeployMethod: "manual" as const, extensionWebstoreUrl: "" };

  return <DeploySettings initialSettings={settings} />;
}

export default async function BuildsPage() {
  const t = await getTranslations("extensions.builds.page");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <DeploySettingsSection />
      </Suspense>
      <Suspense fallback={<BuildsSkeleton />}>
        <BuildsPageClient />
      </Suspense>
    </div>
  );
}
