// src/app/(dashboard)/extensions/usage/page.tsx
import { UsageAnalyticsClient } from "@/components/extensions/usage-analytics-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("extensions.usage.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function UsageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function ExtensionUsagePage() {
  const t = await getTranslations("extensions.usage.page");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<UsageSkeleton />}>
        <UsageAnalyticsClient />
      </Suspense>
    </div>
  );
}
