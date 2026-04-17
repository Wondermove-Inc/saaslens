// src/app/(dashboard)/integrations/[id]/edit/page.tsx
import { IntegrationEditClient } from "@/components/integrations/integration-edit-client";
import { requireAdmin } from "@/lib/auth/require-auth";

interface IntegrationEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function IntegrationEditPage({
  params,
}: IntegrationEditPageProps) {
  await requireAdmin("/integrations");
  const { id } = await params;
  return <IntegrationEditClient id={id} />;
}
