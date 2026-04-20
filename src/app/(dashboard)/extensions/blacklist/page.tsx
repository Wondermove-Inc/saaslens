// src/app/(dashboard)/extensions/blacklist/page.tsx
import { BlacklistPageClient } from "@/components/extensions/blacklist-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "블랙리스트 | SaaS Management Platform",
  description: "차단 도메인 관리",
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

export default function BlacklistPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">블랙리스트</h1>
      <Suspense fallback={<PageSkeleton />}>
        <BlacklistPageClient />
      </Suspense>
    </div>
  );
}
