// src/app/(dashboard)/integrations/new/page.tsx
import { IntegrationCreateForm } from "@/components/integrations/integration-create-form";
import { requireAdmin } from "@/lib/auth/require-auth";

export default async function NewIntegrationPage() {
  await requireAdmin("/integrations");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">연동 추가</h1>
        <p className="text-muted-foreground">IdP/SSO 연동을 새로 등록합니다</p>
      </div>

      <IntegrationCreateForm />
    </div>
  );
}
