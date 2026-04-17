// src/app/(dashboard)/reports/cost/_components/seat-analysis-section.tsx
"use client";

import { getSeatOptimizationSuggestions } from "@/actions/seat-optimization";
import { getSeatWasteAnalysis } from "@/actions/seat-waste-analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  SeatOptimizationItem,
  SeatWasteAnalysis,
} from "@/types/seat-analytics";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SeatAnalysisSkeleton } from "./cost-report-skeleton";
import { SimulationDialog } from "./simulation-dialog";

function formatCurrency(value: number, currency = "KRW") {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(
    value
  );
}

function getUtilizationBadge(rate: number) {
  if (rate < 50)
    return (
      <Badge className="bg-red-100 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
        {rate}%
      </Badge>
    );
  if (rate < 75)
    return (
      <Badge className="bg-amber-100 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        {rate}%
      </Badge>
    );
  return (
    <Badge className="bg-emerald-100 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      {rate}%
    </Badge>
  );
}

export function SeatAnalysisSection() {
  const t = useTranslations("reports.cost.seatAnalysis");
  const [wasteData, setWasteData] = useState<SeatWasteAnalysis | null>(null);
  const [optimizationItems, setOptimizationItems] = useState<
    SeatOptimizationItem[]
  >([]);
  const [totalMonthlySavings, setTotalMonthlySavings] = useState(0);
  const [totalAnnualSavings, setTotalAnnualSavings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SeatOptimizationItem | null>(
    null
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [wasteResult, optimizationResult] = await Promise.all([
        getSeatWasteAnalysis(),
        getSeatOptimizationSuggestions(),
      ]);
      if (wasteResult.success && wasteResult.data) {
        setWasteData(wasteResult.data);
      }
      if (optimizationResult.success && optimizationResult.data) {
        setOptimizationItems(optimizationResult.data.items);
        setTotalMonthlySavings(optimizationResult.data.totalMonthlySavings);
        setTotalAnnualSavings(optimizationResult.data.totalAnnualSavings);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) {
    return <SeatAnalysisSkeleton />;
  }

  const hasWasteData = wasteData && wasteData.apps.length > 0;
  const hasOptimizationData = optimizationItems.length > 0;

  if (!hasWasteData && !hasOptimizationData) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm">
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seat 낭비 분석 (D-2) */}
      {hasWasteData && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold">{t("wasteTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("wasteDescription")}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="group border-border/50 from-card via-card relative overflow-hidden rounded-sm bg-gradient-to-br to-red-500/[0.03] shadow-sm transition-all duration-300 hover:border-red-500/20 hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.02] to-red-500/[0.06] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative pb-2">
                <CardDescription>{t("monthlyWaste")}</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-2xl font-bold text-red-700 tabular-nums dark:text-red-400">
                    {formatCurrency(wasteData.summary.totalMonthlyWaste)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="group border-border/50 from-card via-card relative overflow-hidden rounded-sm bg-gradient-to-br to-amber-500/[0.03] shadow-sm transition-all duration-300 hover:border-amber-500/20 hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-amber-500/[0.06] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative pb-2">
                <CardDescription>{t("annualWaste")}</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-2xl font-bold text-amber-700 tabular-nums dark:text-amber-400">
                    {formatCurrency(wasteData.summary.totalAnnualWaste)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="group border-border/50 from-card via-card to-primary/[0.03] hover:border-primary/20 relative overflow-hidden rounded-sm bg-gradient-to-br shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="from-primary/[0.02] to-primary/[0.06] absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative pb-2">
                <CardDescription>{t("overallUtilization")}</CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-2">
                <span className="text-2xl font-bold tabular-nums">
                  {wasteData.summary.overallUtilizationRate}%
                </span>
                <Progress
                  value={wasteData.summary.overallUtilizationRate}
                  className="h-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* App-level detail table */}
          <Card className="border-border/50 min-h-[450px] rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{t("appWasteTable")}</CardTitle>
              <CardDescription>
                {t("appWasteCount", { count: wasteData.summary.appCount })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colApp")}</TableHead>
                      <TableHead className="text-right">
                        {t("colTotalSeats")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colAssigned")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colActive")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colWasted")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colMonthlyWaste")}
                      </TableHead>
                      <TableHead>{t("colUtilization")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wasteData.apps.map((app) => (
                      <TableRow
                        key={app.appId}
                        className="hover:bg-purple-gray transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {app.appLogoUrl ? (
                              <Image
                                src={app.appLogoUrl}
                                alt={app.appName}
                                width={24}
                                height={24}
                                className="rounded"
                              />
                            ) : (
                              <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded text-xs font-medium">
                                {app.appName.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium">{app.appName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {app.totalSeats}
                        </TableCell>
                        <TableCell className="text-right">
                          {app.assignedSeats}
                        </TableCell>
                        <TableCell className="text-right">
                          {app.activeSeats}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-red-700 dark:text-red-400">
                            {app.wastedSeats}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-700 dark:text-red-400">
                          {formatCurrency(app.monthlyWaste)}
                        </TableCell>
                        <TableCell>
                          {getUtilizationBadge(app.utilizationRate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Seat 최적화 제안 (D-4) */}
      {hasOptimizationData && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold">{t("optimizationTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("optimizationDescription")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="group border-border/50 from-card via-card relative overflow-hidden rounded-sm bg-gradient-to-br to-emerald-500/[0.03] shadow-sm transition-all duration-300 hover:border-emerald-500/20 hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-emerald-500/[0.06] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative pb-2">
                <CardDescription>{t("monthlySavings")}</CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalMonthlySavings)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="group border-border/50 from-card via-card relative overflow-hidden rounded-sm bg-gradient-to-br to-emerald-500/[0.03] shadow-sm transition-all duration-300 hover:border-emerald-500/20 hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-emerald-500/[0.06] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative pb-2">
                <CardDescription>{t("annualSavings")}</CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalAnnualSavings)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="group border-border/50 from-card via-card to-primary/[0.03] hover:border-primary/20 relative overflow-hidden rounded-sm bg-gradient-to-br shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="from-primary/[0.02] to-primary/[0.06] absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative pb-2">
                <CardDescription>{t("optimizableApps")}</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {t("optimizableAppsCount", {
                    count: optimizationItems.length,
                  })}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-border/50 min-h-[450px] rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{t("optimizationTitle")}</CardTitle>
              <CardDescription>{t("optimizationDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colApp")}</TableHead>
                      <TableHead className="text-right">
                        {t("colCurrentSeats")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colActiveUsers")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colRecommended")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colExcess")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colMonthlySaving")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colAnnualSaving")}
                      </TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimizationItems.map((item) => (
                      <TableRow
                        key={item.subscriptionId}
                        className="hover:bg-purple-gray transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.appLogoUrl ? (
                              <Image
                                src={item.appLogoUrl}
                                alt={item.appName}
                                width={24}
                                height={24}
                                className="rounded"
                              />
                            ) : (
                              <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded text-xs">
                                {item.appName.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium">{item.appName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.currentSeats}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.activeUsers}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {item.recommendedSeats}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {item.excessSeats}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(item.monthlySavings)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(item.annualSavings)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            <TrendingDown className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {selectedItem && (
            <SimulationDialog
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
