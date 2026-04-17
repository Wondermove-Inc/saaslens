// src/app/(dashboard)/reports/registered-app-usage/page.tsx
import {
  getDateRangePresets,
  getRegisteredAppUsageReport,
} from "@/actions/reports/registered-app-usage";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { RegisteredAppUsagePageClient } from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.registeredAppUsage.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

interface RegisteredAppUsagePageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    appId?: string;
    userId?: string;
    search?: string;
    page?: string;
    period?: string;
  }>;
}

export default async function RegisteredAppUsagePage({
  searchParams,
}: RegisteredAppUsagePageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const presets = await getDateRangePresets();
  const t = await getTranslations("reports.registeredAppUsage");

  // Determine date range from period preset or custom dates
  let startDate: Date;
  let endDate: Date;
  const today = new Date();
  today.setHours(23, 59, 59, 999);

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
    appId: params.appId,
    userId: params.userId,
    search: params.search,
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 50,
  };

  const reportResult = await getRegisteredAppUsageReport(filters);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("page.title")}</h1>

      <RegisteredAppUsagePageClient
        initialData={reportResult.data}
        initialFilters={{
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          appId: params.appId || "",
          userId: params.userId || "",
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
