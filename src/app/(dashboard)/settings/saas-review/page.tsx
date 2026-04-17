// src/app/(dashboard)/settings/saas-review/page.tsx
import { getInferenceMetrics } from "@/actions/inference-insights";
import { getSaasReviewData } from "@/actions/saas-review";
import { requireAdmin } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { SaasReviewDashboard } from "./saas-review-dashboard";

export const metadata: Metadata = {
  title: "SaaS 검토/승인 | SaaS 관리 플랫폼",
  description: "LLM이 발견한 SaaS를 검토하고 승인합니다",
};

export default async function SaasReviewPage() {
  await requireAdmin();

  const [data, inferenceMetrics] = await Promise.all([
    getSaasReviewData(),
    getInferenceMetrics(),
  ]);

  return (
    <SaasReviewDashboard data={data} inferenceMetrics={inferenceMetrics} />
  );
}
