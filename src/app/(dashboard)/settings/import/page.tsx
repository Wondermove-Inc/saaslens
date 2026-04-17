// src/app/(dashboard)/settings/import/page.tsx
import { PageHeader } from "@/components/common/page-header";
import { CsvUploadForm } from "@/components/import/csv-upload-form";
import { requireAdmin } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("import.page");
  return {
    title: `${t("title")} - SaaS 관리 플랫폼`,
    description: t("description"),
  };
}

export default async function ImportPage() {
  const t = await getTranslations("import.page");
  await requireAdmin();

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        showBack
        backHref="/settings"
      />

      <CsvUploadForm />
    </div>
  );
}
