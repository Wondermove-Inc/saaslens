// src/app/(super-admin)/layout.tsx
import { ClientProviders } from "@/components/providers/client-providers";
import { SuperAdminSidebar } from "@/components/super-admin/super-admin-sidebar";
import { requireSuperAdmin } from "@/lib/auth/require-auth";

/**
 * Super Admin 레이아웃
 * SUPER_ADMIN role 없으면 /dashboard로 리다이렉트
 */
export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();

  return (
    <ClientProviders>
      <div className="flex h-screen overflow-hidden">
        <SuperAdminSidebar />
        <main className="bg-background flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </ClientProviders>
  );
}
