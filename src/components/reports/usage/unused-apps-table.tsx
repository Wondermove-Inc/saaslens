// src/components/reports/usage/unused-apps-table.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface UnusedAppItem {
  appId: string;
  appName: string;
  lastUsedAt: string | null;
  licenseCount: number | null;
  monthlyWastedCost: number;
}

interface UnusedAppsTableProps {
  apps: UnusedAppItem[];
}

export function UnusedAppsTable({ apps }: UnusedAppsTableProps) {
  const t = useTranslations();
  const formatLastUsed = (dateStr: string | null): string => {
    if (!dateStr) return t("reports.usage.unusedApps.lastUsed.none");
    try {
      return format(parseISO(dateStr), "yyyy-MM-dd", { locale: ko });
    } catch {
      return dateStr;
    }
  };

  if (apps.length === 0) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("reports.usage.unusedApps.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center">
            {t("reports.usage.unusedApps.empty")}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 잠재적 비용 낭비 계산 (실제 구독 금액 기반 월간 비용)
  const estimatedWaste = apps.reduce(
    (sum, app) => sum + app.monthlyWastedCost,
    0
  );

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-warning h-5 w-5" />
            {t("reports.usage.unusedApps.title")}
          </CardTitle>
          {estimatedWaste > 0 && (
            <Badge variant="destructive">
              {t("reports.usage.unusedApps.estimatedWaste", {
                amount: estimatedWaste.toLocaleString(),
              })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("reports.usage.unusedApps.table.appName")}
              </TableHead>
              <TableHead>
                {t("reports.usage.unusedApps.table.lastUsedAt")}
              </TableHead>
              <TableHead>
                {t("reports.usage.unusedApps.table.licenseCount")}
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow
                key={app.appId}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">{app.appName}</TableCell>
                <TableCell>{formatLastUsed(app.lastUsedAt)}</TableCell>
                <TableCell>
                  {app.licenseCount !== null ? (
                    <Badge variant="secondary">
                      {t("reports.usage.unusedApps.lastUsed.count", {
                        count: app.licenseCount,
                      })}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/apps/${app.appId}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
