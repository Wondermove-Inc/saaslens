// src/app/(dashboard)/apps/[id]/page.tsx
import { AppDetailClient } from "@/components/apps/app-detail-client";
import { getCachedSession } from "@/lib/auth/require-auth";

interface AppDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppDetailPage({ params }: AppDetailPageProps) {
  const { id } = await params;
  const session = await getCachedSession();
  const role = session?.user?.role ?? null;
  return (
    <AppDetailClient
      id={id}
      role={role as "ADMIN" | "MEMBER" | "VIEWER" | null}
    />
  );
}
