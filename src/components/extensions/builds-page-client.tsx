// src/components/extensions/builds-page-client.tsx
"use client";

import { getBuilds } from "@/actions/extensions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExtensionBuildItem } from "@/types/extension";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type BuildStatus = "PENDING" | "BUILDING" | "COMPLETED" | "FAILED";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function BuildsPageClient() {
  const t = useTranslations("extensions");
  const locale = useLocale();
  const [builds, setBuilds] = useState<ExtensionBuildItem[]>([]);
  const [loading, setLoading] = useState(true);

  const statusConfig: Record<
    BuildStatus,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: React.ComponentType<{ className?: string }>;
    }
  > = useMemo(
    () => ({
      PENDING: {
        label: t("builds.status.pending"),
        variant: "outline",
        icon: Clock,
      },
      BUILDING: {
        label: t("builds.status.building"),
        variant: "secondary",
        icon: Loader2,
      },
      COMPLETED: {
        label: t("builds.status.completed"),
        variant: "default",
        icon: CheckCircle,
      },
      FAILED: {
        label: t("builds.status.failed"),
        variant: "destructive",
        icon: AlertCircle,
      },
    }),
    [t]
  );

  const fetchData = useCallback(async () => {
    const result = await getBuilds({ limit: 1 });
    if (result.success && result.data) {
      setBuilds(result.data.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasActiveBuilds = useMemo(() => {
    return builds.some(
      (b) => b.status === "PENDING" || b.status === "BUILDING"
    );
  }, [builds]);

  useEffect(() => {
    if (!hasActiveBuilds) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [hasActiveBuilds, fetchData]);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          {builds.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">{t("builds.emptyTitle")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("builds.tableHeaders.version")}</TableHead>
                  <TableHead>{t("builds.tableHeaders.status")}</TableHead>
                  <TableHead>{t("builds.tableHeaders.fileSize")}</TableHead>
                  <TableHead>{t("builds.tableHeaders.createdAt")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {builds.map((build) => {
                  const config = statusConfig[build.status as BuildStatus];
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={build.id}>
                      <TableCell className="font-mono font-medium">
                        {build.version}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>
                          <StatusIcon
                            className={`mr-1 h-3 w-3 ${build.status === "BUILDING" ? "animate-spin" : ""}`}
                          />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(build.fileSize)}</TableCell>
                      <TableCell>
                        {new Date(build.createdAt).toLocaleString(
                          locale === "en" ? "en-US" : "ko-KR"
                        )}
                      </TableCell>
                      <TableCell>
                        {build.status === "COMPLETED" && build.downloadUrl && (
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={build.downloadUrl}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
