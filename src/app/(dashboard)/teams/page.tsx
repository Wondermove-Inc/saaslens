import { Suspense } from "react";

import { PageHeader } from "@/components/common/page-header";
import { OrgLayout } from "@/components/org/org-layout";
import { TeamsPageClient } from "@/components/teams/teams-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("teams.page");
  return {
    title: `${t("title")} | SaaS Management Platform`,
    description: t("description"),
  };
}

function TeamsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[500px]" />
    </div>
  );
}

export default async function TeamsPage() {
  const t = await getTranslations("teams.page");
  return (
    <OrgLayout>
      <div className="flex flex-col gap-4">
        <PageHeader title={t("title")} description={t("description")} />

        <Suspense fallback={<TeamsLoading />}>
          <TeamsPageClient />
        </Suspense>
      </div>
    </OrgLayout>
  );
}
