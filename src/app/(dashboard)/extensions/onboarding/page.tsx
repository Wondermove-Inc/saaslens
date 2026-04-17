// src/app/(dashboard)/extensions/onboarding/page.tsx
/**
 * Extension 온보딩 모니터링 페이지
 * 전체 활성 사용자 대비 온보딩 완료 여부 확인
 */

import { getOnboardingMonitorData } from "@/actions/extensions/onboarding-monitor";
import { getTranslations } from "next-intl/server";
import { OnboardingMonitorClient } from "./onboarding-monitor-client";

export default async function ExtensionOnboardingPage() {
  const t = await getTranslations();
  const { items, total, completedCount, pendingCount } =
    await getOnboardingMonitorData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t("extensions.onboarding.page.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("extensions.onboarding.page.description")}
        </p>
      </div>

      <OnboardingMonitorClient
        items={items}
        total={total}
        completedCount={completedCount}
        pendingCount={pendingCount}
      />
    </div>
  );
}
