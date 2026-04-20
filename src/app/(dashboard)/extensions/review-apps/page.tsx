// src/app/(dashboard)/extensions/review-apps/page.tsx
import { ReviewAppsPageClient } from "@/components/extensions/review-apps-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("extensions.reviewApps.page");
  return {
    title: `${t("title")} | SaaS Management Platform`,
    description: t("description"),
  };
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function ReviewAppsPage() {
  const t = await getTranslations("extensions.reviewApps.page");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<PageSkeleton />}>
        <ReviewAppsPageClient />
      </Suspense>
    </div>
  );
}
