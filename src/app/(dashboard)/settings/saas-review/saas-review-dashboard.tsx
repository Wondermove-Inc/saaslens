// src/app/(dashboard)/settings/saas-review/saas-review-dashboard.tsx
"use client";

import {
  sendInferenceMetricsEmail,
  type InferenceMetrics,
} from "@/actions/inference-insights";
import {
  approvePendingApp,
  rejectPendingApp,
  type SaasReviewData,
} from "@/actions/saas-review";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, ScanSearch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

function formatDate(value: Date) {
  return new Date(value).toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SaasReviewDashboardProps {
  data: SaasReviewData;
  inferenceMetrics: InferenceMetrics;
}

export function SaasReviewDashboard({
  data,
  inferenceMetrics,
}: SaasReviewDashboardProps) {
  const t = useTranslations("saasReview");
  const [isPending, startTransition] = useTransition();
  const [isSendingEmail, startSendEmail] = useTransition();

  const handleApprove = (appId: string) => {
    startTransition(async () => {
      const result = await approvePendingApp(appId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || t("approveFailed"));
      }
    });
  };

  const handleReject = (appId: string) => {
    startTransition(async () => {
      const result = await rejectPendingApp(appId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || t("rejectFailed"));
      }
    });
  };

  const handleSendEmail = () => {
    startSendEmail(async () => {
      const result = await sendInferenceMetricsEmail();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || t("emailFailed"));
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        showBack
        backHref="/settings"
        badge={{ label: "Review", icon: ScanSearch }}
        breadcrumbs={[
          { label: t("breadcrumbs.settings"), href: "/settings" },
          { label: t("breadcrumbs.saasReview") },
        ]}
        actions={[
          {
            label: t("sendMetricsEmail"),
            icon: Mail,
            variant: "outline",
            onClick: handleSendEmail,
            disabled: isSendingEmail,
          },
        ]}
      />

      {/* LLM 호출 현황 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.totalLogs")}</CardTitle>
            <CardDescription>{t("stats.totalLogsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {t("stats.count", { count: data.stats.totalLogs })}
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.saasDetected")}</CardTitle>
            <CardDescription>{t("stats.saasDetectedDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-600">
            {t("stats.count", { count: data.stats.saasLogs })}
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.nonSaas")}</CardTitle>
            <CardDescription>{t("stats.nonSaasDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-600">
            {t("stats.count", { count: data.stats.nonSaasLogs })}
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("stats.avgConfidence")}
            </CardTitle>
            <CardDescription>{t("stats.avgConfidenceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {(data.stats.avgConfidence * 100).toFixed(0)}%
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.successRate")}</CardTitle>
            <CardDescription>{t("stats.successRateDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {inferenceMetrics.successRate.toFixed(1)}%
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.avgTokens")}</CardTitle>
            <CardDescription>{t("stats.avgTokensDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {inferenceMetrics.averageTokens.prompt ?? "-"} /{" "}
            {inferenceMetrics.averageTokens.completion ?? "-"} /{" "}
            {inferenceMetrics.averageTokens.total ?? "-"}
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("stats.errorCodesTop")}
            </CardTitle>
            <CardDescription>{t("stats.errorCodesTopDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.keys(inferenceMetrics.errorCounts).length === 0 ? (
              <p className="text-muted-foreground">{t("stats.noErrors")}</p>
            ) : (
              Object.entries(inferenceMetrics.errorCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([code, count]) => (
                  <div key={code} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{code}</span>
                    <span className="font-medium">
                      {t("stats.count", { count })}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("stats.recentFailures")}
            </CardTitle>
            <CardDescription>{t("stats.recentFailuresDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {inferenceMetrics.recentFailures.length === 0 ? (
              <p className="text-muted-foreground">{t("stats.noFailures")}</p>
            ) : (
              inferenceMetrics.recentFailures.map((item, idx) => (
                <div
                  key={`${item.merchantName}-${idx}`}
                  className="border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.merchantName}</span>
                    <Badge variant="outline">
                      {item.errorCode || "unknown"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {item.reasoning ? (
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {item.reasoning}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 대기 중인 SaaS */}
      <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{t("pendingApps.title")}</CardTitle>
          <CardDescription>{t("pendingApps.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.pendingApps.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("pendingApps.empty")}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("pendingApps.tableHeaders.appName")}
                    </TableHead>
                    <TableHead>
                      {t("pendingApps.tableHeaders.catalog")}
                    </TableHead>
                    <TableHead>
                      {t("pendingApps.tableHeaders.createdAt")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("pendingApps.tableHeaders.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pendingApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.name}</TableCell>
                      <TableCell>
                        {app.catalogName ? (
                          <Badge variant="outline">{app.catalogName}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t("pendingApps.noCatalog")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(app.createdAt)}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app.id)}
                          disabled={isPending}
                        >
                          {t("pendingApps.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(app.id)}
                          disabled={isPending}
                        >
                          {t("pendingApps.reject")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 추론 로그 */}
      <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{t("logs.title")}</CardTitle>
          <CardDescription>{t("logs.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("logs.empty")}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("logs.tableHeaders.merchantName")}</TableHead>
                    <TableHead>
                      {t("logs.tableHeaders.suggestedName")}
                    </TableHead>
                    <TableHead>{t("logs.tableHeaders.confidence")}</TableHead>
                    <TableHead>{t("logs.tableHeaders.result")}</TableHead>
                    <TableHead>{t("logs.tableHeaders.createdAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.merchantName}</TableCell>
                      <TableCell>{log.suggestedName || "-"}</TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {(log.confidence * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.isSaaS ? "secondary" : "outline"}
                          className={
                            log.isSaaS ? "bg-green-100 text-green-800" : ""
                          }
                        >
                          {log.isSaaS ? t("logs.saas") : t("logs.nonSaas")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
