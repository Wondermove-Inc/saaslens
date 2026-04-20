// src/app/(dashboard)/users/page.tsx
import { OrgLayout } from "@/components/org/org-layout";
import { UserPageClient } from "@/components/users/user-page-client";
import { getCachedSession } from "@/lib/auth/require-auth";

export default async function UsersPage() {
  const session = await getCachedSession();
  const role = session?.user?.role ?? null;

  return (
    <OrgLayout>
      <UserPageClient role={role as "ADMIN" | "MEMBER" | "VIEWER" | null} />
    </OrgLayout>
  );
}
