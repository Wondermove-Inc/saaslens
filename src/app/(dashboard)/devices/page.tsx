import { DevicesPageClient } from "@/components/devices";
import { requireOrganization } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("devices.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function DevicesPage() {
  const { role } = await requireOrganization();

  return <DevicesPageClient role={role} />;
}
