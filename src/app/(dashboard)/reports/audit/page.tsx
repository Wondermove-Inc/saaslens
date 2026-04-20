// src/app/(dashboard)/reports/audit/page.tsx
import { getAuditLogFilterOptions, getAuditLogs } from "@/actions/audit";
import { getDateRangePresets } from "@/actions/reports/browsing-usage";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuditLogPageClient } from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.audit.page");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

interface AuditLogPageProps {
  searchParams: Promise<{
    action?: string;
    userId?: string;
    teamId?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: string;
    period?: string;
  }>;
}

export default async function AuditLogPage({
  searchParams,
}: AuditLogPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const presets = await getDateRangePresets();

  // Determine date range from period preset or custom dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let startDateStr: string;
  let endDateStr: string;

  if (params.period && params.period !== "custom") {
    const preset = presets.find((p) => p.value === params.period);
    if (preset) {
      startDateStr = preset.startDate.toISOString().split("T")[0];
      endDateStr = preset.endDate.toISOString().split("T")[0];
    } else {
      startDateStr = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      endDateStr = today.toISOString().split("T")[0];
    }
  } else if (params.startDate && params.endDate) {
    startDateStr = params.startDate.split("T")[0];
    endDateStr = params.endDate.split("T")[0];
  } else {
    startDateStr = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    endDateStr = today.toISOString().split("T")[0];
  }

  const filters = {
    action: params.action,
    userId: params.userId,
    teamId: params.teamId,
    entityType: params.entityType,
    startDate: `${startDateStr}T00:00:00Z`,
    endDate: `${endDateStr}T23:59:59Z`,
    search: params.search,
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 20,
  };

  const [logsData, filterOptions] = await Promise.all([
    getAuditLogs(filters),
    getAuditLogFilterOptions(),
  ]);

  const t = await getTranslations("reports.audit");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("page.title")}</h1>
      </div>

      <AuditLogPageClient
        initialLogs={logsData.logs}
        pagination={logsData.pagination}
        filterOptions={filterOptions}
        initialFilters={filters}
        canExport={session.user.role !== "VIEWER"}
        presets={presets.map((p) => ({ value: p.value, label: p.label }))}
        currentPeriod={params.period || "30d"}
        currentStartDate={startDateStr}
        currentEndDate={endDateStr}
      />
    </div>
  );
}
