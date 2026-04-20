// src/app/(dashboard)/extensions/recommended-apps/page.tsx
import { RecommendedAppsPageClient } from "@/components/extensions/recommended-apps-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "추천 앱 리스트 | SaaS Management Platform",
  description: "AI 기반 SaaS 식별로 발견된 미등록 앱",
};

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

export default function RecommendedAppsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">추천 앱 리스트</h1>
      <Suspense fallback={<PageSkeleton />}>
        <RecommendedAppsPageClient />
      </Suspense>
    </div>
  );
}
