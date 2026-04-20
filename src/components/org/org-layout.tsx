"use client";

import { OrgSidebar } from "@/components/org/org-sidebar";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface OrgLayoutProps {
  children: React.ReactNode;
}

export function OrgLayout({ children }: OrgLayoutProps) {
  const t = useTranslations("sidebar.menu.org");

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t("root")}</h2>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <Card className="border-border/50 rounded-sm p-2 shadow-sm transition-shadow hover:shadow-md">
            <OrgSidebar />
          </Card>
        </aside>
        <main className="flex-1">
          <Card className="border-border/50 rounded-sm p-6 shadow-sm transition-shadow hover:shadow-md">
            {children}
          </Card>
        </main>
      </div>
    </div>
  );
}
