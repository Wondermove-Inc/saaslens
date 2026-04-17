// src/app/(dashboard)/settings/devices/page.tsx
import { DevicesPageClient } from "@/components/devices";
import { requireOrganization } from "@/lib/auth/require-auth";

export const metadata = {
  title: "디바이스 관리 | SaaS Management Platform",
  description: "FleetDM 에이전트 디바이스 목록 및 앱 사용 현황 관리",
};

export default async function DevicesPage() {
  const { role } = await requireOrganization();

  return <DevicesPageClient role={role} />;
}
