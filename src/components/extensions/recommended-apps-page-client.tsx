// src/components/extensions/recommended-apps-page-client.tsx
"use client";

import {
  dismissRecommendedApp,
  getRecommendedApps,
  registerRecommendedApp,
  scanUnregisteredDomains,
  type RecommendedAppItem,
} from "@/actions/extensions/recommended-apps";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Scan,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function RecommendedAppsPageClient() {
  const t = useTranslations("extensions");
  const router = useRouter();
  const [items, setItems] = useState<RecommendedAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [pendingScanCount, setPendingScanCount] = useState(0);
  const [search, setSearch] = useState("");
  const [registering, setRegistering] = useState<string | null>(null);
  const [dismissConfirm, setDismissConfirm] =
    useState<RecommendedAppItem | null>(null);

  async function fetchData() {
    setLoading(true);
    const result = await getRecommendedApps({ search });
    if (result.success && result.data) {
      setItems(result.data.items);
      setPendingScanCount(result.data.pendingScanCount);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScan() {
    setScanning(true);
    const result = await scanUnregisteredDomains({ batchSize: 10 });
    if (result.success) {
      toast.success(result.message);
      fetchData();
    } else {
      toast.error(result.error || t("common.scanFailed"));
    }
    setScanning(false);
  }

  async function handleRegister(item: RecommendedAppItem) {
    setRegistering(item.id);
    const result = await registerRecommendedApp(item.id);
    if (result.success) {
      toast.success(t("recommendedApps.appRegistered"));
      if (result.data?.appId) {
        router.push(`/apps/${result.data.appId}`);
      }
      fetchData();
    } else {
      toast.error(result.error || t("common.registerFailed"));
    }
    setRegistering(null);
  }

  async function handleDismiss(item: RecommendedAppItem) {
    const result = await dismissRecommendedApp(item.id);
    if (result.success) {
      toast.success(t("recommendedApps.dismissed"));
      fetchData();
    } else {
      toast.error(result.error || t("common.processFailed"));
    }
    setDismissConfirm(null);
  }

  function handleSearch() {
    fetchData();
  }

  function formatConfidence(confidence: number | null): string {
    if (!confidence) return "-";
    return `${Math.round(confidence * 100)}%`;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingScanCount > 0 && (
        <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              {t("recommendedApps.unscannedTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("recommendedApps.unscannedDescription", {
                    count: pendingScanCount,
                  })}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("recommendedApps.unscannedHint")}
                </p>
              </div>
              <Button onClick={handleScan} disabled={scanning}>
                <Scan
                  className={`mr-2 h-4 w-4 ${scanning ? "animate-pulse" : ""}`}
                />
                {scanning ? t("common.scanning") : t("common.startScan")}
              </Button>
            </div>
            {scanning && (
              <div className="mt-4">
                <Progress value={33} className="h-2" />
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("recommendedApps.progressHint")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={t("recommendedApps.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            {t("common.search")}
          </Button>
        </div>
        <Button variant="outline" onClick={handleScan} disabled={scanning}>
          <Scan className={`mr-2 h-4 w-4 ${scanning ? "animate-pulse" : ""}`} />
          {t("common.manualScan")}
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">
                {t("recommendedApps.emptyTitle")}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("recommendedApps.emptyDescription")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("recommendedApps.tableHeaders.domain")}
                  </TableHead>
                  <TableHead>
                    {t("recommendedApps.tableHeaders.serviceName")}
                  </TableHead>
                  <TableHead>
                    {t("recommendedApps.tableHeaders.category")}
                  </TableHead>
                  <TableHead>
                    {t("recommendedApps.tableHeaders.confidence")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("recommendedApps.tableHeaders.visitCount")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("recommendedApps.tableHeaders.uniqueUsers")}
                  </TableHead>
                  <TableHead>
                    {t("recommendedApps.tableHeaders.lastSeen")}
                  </TableHead>
                  <TableHead className="w-[150px]">
                    {t("recommendedApps.tableHeaders.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{item.domain}</span>
                        {item.website && (
                          <a
                            href={item.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {item.serviceName || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.category && (
                        <Badge variant="outline">{item.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (item.confidence ?? 0) >= 0.8
                            ? "default"
                            : (item.confidence ?? 0) >= 0.6
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {formatConfidence(item.confidence)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.visitCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.uniqueUsers}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {new Date(item.lastSeenAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleRegister(item)}
                          disabled={registering === item.id}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {registering === item.id
                            ? t("common.registering")
                            : t("common.register")}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDismissConfirm(item)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              {t("common.dismiss")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!dismissConfirm}
        onOpenChange={(open) => !open && setDismissConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("recommendedApps.confirmDismissTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("recommendedApps.confirmDismiss", {
                domain: dismissConfirm?.domain ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dismissConfirm && handleDismiss(dismissConfirm)}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
