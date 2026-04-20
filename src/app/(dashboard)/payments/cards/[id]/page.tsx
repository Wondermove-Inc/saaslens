// src/app/(dashboard)/payments/cards/[id]/page.tsx
import {
  getCardTransactions,
  getCardTransactionSummary,
  getCorporateCardCached,
} from "@/actions/corporate-cards";
import { CardTransactionsTable } from "@/components/cards/card-transactions-table";
import { SyncHistoryPanel } from "@/components/cards/sync-history-panel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import {
  CARD_COMPANIES,
  type CardCompanyCode,
} from "@/lib/services/hyphen/types";
import { formatDistanceToNow } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { CheckCircle, Clock, CreditCard, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations("cards.detail");
  const { id } = await params;
  const card = await getCorporateCardCached(id);

  if (!card) {
    return { title: t("notFound") };
  }

  const cardCompany =
    CARD_COMPANIES[card.cardCd as CardCompanyCode] || card.cardCd;
  return {
    title: `${cardCompany} **** ${card.cardLast4 || "****"} | ${t("title")}`,
    description: t("description"),
  };
}

export default async function CardDetailPage({ params }: Props) {
  const t = await getTranslations("cards.detail");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? enUS : ko;
  const { organizationId } = await requireAdmin();

  const { id } = await params;
  const card = await getCorporateCardCached(id);

  if (!card) {
    notFound();
  }

  // 초기 거래내역 조회 (SaaS 탭이 기본)
  const initialTransactions = await getCardTransactions({
    cardId: id,
    page: 1,
    pageSize: 20,
    filter: "saas",
  });

  // 분류 요약 데이터 조회
  const summary = await getCardTransactionSummary(organizationId, id);

  // 매칭용 앱 목록 조회
  const apps = await prisma.app.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const cardCompany =
    CARD_COMPANIES[card.cardCd as CardCompanyCode] || card.cardCd;

  const getSyncStatus = () => {
    if (card.lastError) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t("syncStatus.error")}
        </Badge>
      );
    }
    if (card.lastSyncAt) {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          {t("syncStatus.synced")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        {t("syncStatus.pending")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <CreditCard className="h-8 w-8" />
            {card.cardNm || cardCompany}
          </h1>
          <p className="text-muted-foreground">
            {cardCompany} **** {card.cardLast4 || "****"}
          </p>
        </div>
        {getSyncStatus()}
      </div>

      {/* 카드 정보 요약 */}
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{t("cardInfo")}</CardTitle>
          <CardDescription>{t("cardInfoDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-muted-foreground text-sm">
                {t("cardCompany")}
              </div>
              <div className="font-medium">{cardCompany}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                {t("cardNumber")}
              </div>
              <div className="font-medium">
                **** **** **** {card.cardLast4 || "****"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                {t("loginMethod")}
              </div>
              <div className="font-medium">
                {card.loginMethod === "ID"
                  ? t("loginMethodId")
                  : t("loginMethodCert")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                {t("lastSync")}
              </div>
              <div className="font-medium">
                {card.lastSyncAt
                  ? formatDistanceToNow(new Date(card.lastSyncAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })
                  : t("notSynced")}
              </div>
            </div>
          </div>
          {card.lastError && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <strong>{t("lastError")}</strong> {card.lastError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 동기화 이력 */}
      <SyncHistoryPanel corporateCardId={id} limit={10} />

      {/* 거래내역 테이블 */}
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{t("transactions")}</CardTitle>
          <CardDescription>
            {t("transactionsDescription", {
              total: summary.totalCount,
              saas: summary.saasMatchedCount,
              unmatched: summary.unmatchedCount,
              nonSaas: summary.nonSaaSCount,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CardTransactionsTable
            cardId={id}
            apps={apps}
            initialData={initialTransactions}
            summary={summary}
          />
        </CardContent>
      </Card>
    </div>
  );
}
