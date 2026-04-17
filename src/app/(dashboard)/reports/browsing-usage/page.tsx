// src/app/(dashboard)/reports/browsing-usage/page.tsx
import {
  getBrowsingUsageReport,
  getDateRangePresets,
} from "@/actions/reports/browsing-usage";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BrowsingUsagePageClient } from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.browsingUsage.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

interface BrowsingUsagePageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: string;
    period?: string;
  }>;
}

export default async function BrowsingUsagePage({
  searchParams,
}: BrowsingUsagePageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const presets = await getDateRangePresets();

  // Determine date range from period preset or custom dates
  let startDate: Date;
  let endDate: Date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (params.period && params.period !== "custom") {
    const preset = presets.find((p) => p.value === params.period);
    if (preset) {
      startDate = preset.startDate;
      endDate = preset.endDate;
    } else {
      // Default to 30 days
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = today;
    }
  } else if (params.startDate && params.endDate) {
    startDate = new Date(params.startDate);
    endDate = new Date(params.endDate);
  } else {
    // Default to 30 days
    startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    endDate = today;
  }

  const filters = {
    startDate,
    endDate,
    search: params.search,
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 50,
  };

  const reportData = await getBrowsingUsageReport(filters);
  const t = await getTranslations("reports.browsingUsage");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("page.title")}</h1>

      <BrowsingUsagePageClient
        initialData={reportData.data}
        pagination={reportData.pagination}
        initialFilters={{
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          search: params.search || "",
          period: params.period || "30d",
        }}
        presets={presets.map((p) => ({
          value: p.value,
          label: p.label,
        }))}
      />
    </div>
  );
}
