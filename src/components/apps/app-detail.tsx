// src/components/apps/app-detail.tsx
import { KpiCard, KpiCardsGrid } from "@/components/common/kpi-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAppStatusMeta } from "@/lib/app-status";
import { formatKoreanDate } from "@/lib/date";
import type { AppDetail as AppDetailType } from "@/types/app";
import {
  Calendar,
  CreditCard,
  ExternalLink,
  Globe,
  Tag,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface AppDetailProps {
  app: AppDetailType;
  canEdit?: boolean;
}

export function AppDetail({ app, canEdit = true }: AppDetailProps) {
  const t = useTranslations();
  const logoUrl = app.customLogoUrl || app.catalogLogoUrl || null;
  const statusMeta = getAppStatusMeta(app.status, t);

  return (
    <div className="space-y-6">
      {/* 상단 KPI 카드 */}
      <KpiCardsGrid columns={4}>
        <KpiCard
          title={t("apps.detail.kpi.subscriptionCount")}
          value={app.subscriptionCount}
          icon={CreditCard}
        />
        <KpiCard
          title={t("apps.detail.kpi.userAccessCount")}
          value={app.userAccessCount}
          icon={Users}
        />
        <KpiCard
          title={t("apps.detail.kpi.status")}
          value={statusMeta.label}
          icon={Tag}
        />
        <KpiCard
          title={t("apps.detail.kpi.createdAt")}
          value={formatKoreanDate(app.createdAt)}
          icon={Calendar}
        />
      </KpiCardsGrid>

      {/* 2컬럼 레이아웃 - 레퍼런스: pages-products-1.png */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌측 (span-2): 메인 콘텐츠 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 앱 로고 및 기본 정보 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* 로고 */}
                <div className="shrink-0">
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={app.name}
                      width={120}
                      height={120}
                      className="rounded-xl border"
                    />
                  ) : (
                    <div className="bg-muted flex h-[120px] w-[120px] items-center justify-center rounded-xl border text-4xl font-semibold">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* 정보 */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusMeta.badgeVariant}>
                      {statusMeta.label}
                    </Badge>
                    {app.category && (
                      <Badge variant="outline">{app.category}</Badge>
                    )}
                  </div>
                  {app.customWebsite && (
                    <a
                      href={app.customWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center text-sm hover:underline"
                    >
                      <Globe className="mr-1 h-4 w-4" />
                      {app.customWebsite.replace(/^https?:\/\//, "")}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <dt className="text-muted-foreground text-sm">
                        {t("apps.detail.info.registrationMethod")}
                      </dt>
                      <dd className="font-medium">
                        {app.source === "MANUAL"
                          ? t("apps.detail.info.manual")
                          : t("apps.detail.info.discovered")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-sm">
                        {t("apps.detail.info.lastModified")}
                      </dt>
                      <dd className="font-medium">
                        {formatKoreanDate(app.updatedAt)}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 메모 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{t("apps.detail.notes.title")}</CardTitle>
              <CardDescription>
                {t("apps.detail.notes.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {app.notes ? (
                <p className="whitespace-pre-wrap">{app.notes}</p>
              ) : (
                <p className="text-muted-foreground">
                  {t("apps.detail.notes.empty")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 리스크 정보 카드 (있을 경우) */}
          {app.riskScore !== null && (
            <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{t("apps.detail.risk.title")}</CardTitle>
                <CardDescription>
                  {t("apps.detail.risk.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
                      app.riskScore <= 3
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : app.riskScore <= 6
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {app.riskScore}
                  </div>
                  <div>
                    <p className="font-medium">
                      {app.riskScore <= 3
                        ? t("apps.detail.risk.low")
                        : app.riskScore <= 6
                          ? t("apps.detail.risk.medium")
                          : t("apps.detail.risk.high")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("apps.detail.risk.scoreRange")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 우측 (span-1): 메타데이터 카드 */}
        <div className="space-y-6">
          {/* 담당자 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle>{t("apps.detail.owner.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {app.ownerName ? (
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium">
                    {app.ownerName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{app.ownerName}</div>
                    {app.ownerEmail && (
                      <div className="text-muted-foreground text-sm">
                        {app.ownerEmail}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("apps.detail.owner.empty")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 배정 팀 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle>{t("apps.detail.assignedTeam.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {app.teams && app.teams.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {app.teams.map((team) => (
                    <Badge key={team.id} variant="secondary">
                      {team.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("apps.detail.assignedTeam.empty")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 카테고리 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle>{t("apps.detail.category.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Tag className="text-muted-foreground h-4 w-4" />
                <span>
                  {app.category || t("apps.detail.category.uncategorized")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 날짜 정보 카드 */}
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle>{t("apps.detail.dates.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("apps.detail.dates.createdAt")}
                </span>
                <span>{formatKoreanDate(app.createdAt)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("apps.detail.dates.updatedAt")}
                </span>
                <span>{formatKoreanDate(app.updatedAt)}</span>
              </div>
              {app.discoveredAt && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("apps.detail.dates.discoveredAt")}
                    </span>
                    <span>{formatKoreanDate(app.discoveredAt)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 태그 카드 */}
          {app.tags && app.tags.length > 0 && (
            <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle>{t("apps.detail.tags.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {app.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
