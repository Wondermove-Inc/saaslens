import { PaymentsSidebar } from "@/components/payments/payments-sidebar";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

interface PaymentsLayoutProps {
  children: React.ReactNode;
}

export default async function PaymentsLayout({
  children,
}: PaymentsLayoutProps) {
  const t = await getTranslations("sidebar.menu.payments");

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t("root")}</h2>
      </div>

      {/* 사이드바와 콘텐츠 영역 */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* 좌측 사이드바 메뉴 - Card */}
        <aside className="lg:w-64 lg:shrink-0">
          <Card className="border-border/50 rounded-sm p-2 shadow-sm transition-shadow hover:shadow-md">
            <PaymentsSidebar />
          </Card>
        </aside>

        {/* 우측 콘텐츠 영역 - Card */}
        <main className="flex-1">
          <Card className="border-border/50 rounded-sm p-6 shadow-sm transition-shadow hover:shadow-md">
            {children}
          </Card>
        </main>
      </div>
    </div>
  );
}
