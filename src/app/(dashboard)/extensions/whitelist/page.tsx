// src/app/(dashboard)/extensions/whitelist/page.tsx
import { WhitelistPageClient } from "@/components/extensions/whitelist-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "화이트리스트 | SaaS Management Platform",
  description: "허용 도메인 관리",
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

export default function WhitelistPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">화이트리스트</h1>
      <Suspense fallback={<PageSkeleton />}>
        <WhitelistPageClient />
      </Suspense>
    </div>
  );
}
