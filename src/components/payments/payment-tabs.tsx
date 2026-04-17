"use client";

import { PaymentCsvUpload } from "@/components/payments/payment-csv-upload";
import { PaymentRecordsTable } from "@/components/payments/payment-records-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const VALID_TABS = ["records", "import"] as const;
type TabValue = (typeof VALID_TABS)[number];

function isValidTab(value: string | null): value is TabValue {
  return VALID_TABS.includes(value as TabValue);
}

interface PaymentTabsProps {
  apps: { id: string; name: string }[];
  subscriptions: { id: string; appName: string }[];
  appsWithTeams?: {
    id: string;
    name: string;
    teams: { id: string; name: string }[];
  }[];
}

export function PaymentTabs({
  apps,
  subscriptions,
  appsWithTeams,
}: PaymentTabsProps) {
  const t = useTranslations("payments.page");
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: TabValue = isValidTab(rawTab) ? rawTab : "records";

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "records") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      const query = params.toString();
      router.replace(query ? `/payments?${query}` : "/payments");
    },
    [router, searchParams]
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="records">
          <CreditCard className="mr-2 h-4 w-4" />
          {t("tabs.records")}
        </TabsTrigger>
        <TabsTrigger value="import">
          <Upload className="mr-2 h-4 w-4" />
          {t("tabs.upload")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="records" className="mt-6">
        <PaymentRecordsTable
          apps={apps}
          subscriptions={subscriptions}
          appsWithTeams={appsWithTeams}
        />
      </TabsContent>

      <TabsContent value="import" className="mt-6">
        <PaymentCsvUpload />
      </TabsContent>
    </Tabs>
  );
}
