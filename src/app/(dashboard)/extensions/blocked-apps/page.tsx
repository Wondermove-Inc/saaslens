// src/app/(dashboard)/extensions/blocked-apps/page.tsx
import { BlockedAppsPageClient } from "@/components/extensions/blocked-apps-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("extensions.blockedApps.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function PageSkeleton() {
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

export default async function BlockedAppsPage() {
  const t = await getTranslations("extensions.blockedApps.page");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<PageSkeleton />}>
        <BlockedAppsPageClient />
      </Suspense>
    </div>
  );
}
