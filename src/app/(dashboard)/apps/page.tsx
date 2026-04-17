// src/app/(dashboard)/apps/page.tsx
import { AppsPageClient } from "@/components/apps/apps-page-client";
import { getCachedSession } from "@/lib/auth/require-auth";

export default async function AppsPage() {
  const session = await getCachedSession();
  const role = session?.user?.role ?? null;

  return <AppsPageClient role={role as "ADMIN" | "MEMBER" | "VIEWER" | null} />;
}
