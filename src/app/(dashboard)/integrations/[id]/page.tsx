// src/app/(dashboard)/integrations/[id]/page.tsx
import { IntegrationDetailClient } from "@/components/integrations/integration-detail-client";
import { requireOrganization } from "@/lib/auth/require-auth";

interface IntegrationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IntegrationDetailPage({
  params,
}: IntegrationDetailPageProps) {
  const { role } = await requireOrganization();
  const { id } = await params;
  const canManage = role === "ADMIN";
  return <IntegrationDetailClient id={id} canManage={canManage} />;
}
