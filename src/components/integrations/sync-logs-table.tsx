// src/components/integrations/sync-logs-table.tsx
"use client";

import type { SyncLogEntry } from "@/actions/integrations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKoreanDateTime } from "@/lib/date";
import { AlertCircle, History } from "lucide-react";
import { useTranslations } from "next-intl";

interface SyncLogsTableProps {
  logs: SyncLogEntry[];
  isLoading?: boolean;
}

function getStatusBadge(
  status: SyncLogEntry["status"],
  t: ReturnType<typeof useTranslations>
) {
  const statusConfig: Record<
    SyncLogEntry["status"],
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    RUNNING: {
      label: t("integrations.syncLogs.status.running"),
      variant: "secondary",
    },
    SUCCESS: {
      label: t("integrations.syncLogs.status.success"),
      variant: "default",
    },
    PARTIAL: {
      label: t("integrations.syncLogs.status.partial"),
      variant: "outline",
    },
    FAILED: {
      label: t("integrations.syncLogs.status.failed"),
      variant: "destructive",
    },
  };
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function formatDuration(
  startedAt: string,
  completedAt: string | null,
  t: ReturnType<typeof useTranslations>
): string {
  if (!completedAt) {
    return t("integrations.syncLogs.duration.inProgress");
  }

  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  if (minutes > 0) {
    return t("integrations.syncLogs.duration.format", { minutes, seconds });
  }
  return t("integrations.syncLogs.duration.seconds", { seconds });
}

export function SyncLogsTable({ logs, isLoading = false }: SyncLogsTableProps) {
  const t = useTranslations();
  if (isLoading) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("integrations.syncLogs.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            {t("integrations.syncLogs.loading")}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("integrations.syncLogs.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground">
              {t("integrations.syncLogs.empty")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t("integrations.syncLogs.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("integrations.syncLogs.table.startedAt")}
              </TableHead>
              <TableHead>{t("integrations.syncLogs.table.status")}</TableHead>
              <TableHead className="text-right">
                {t("integrations.syncLogs.table.itemsFound")}
              </TableHead>
              <TableHead className="text-right">
                {t("integrations.syncLogs.table.itemsCreated")}
              </TableHead>
              <TableHead className="text-right">
                {t("integrations.syncLogs.table.itemsUpdated")}
              </TableHead>
              <TableHead className="text-right">
                {t("integrations.syncLogs.table.duration")}
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{formatKoreanDateTime(log.startedAt)}</TableCell>
                <TableCell>{getStatusBadge(log.status, t)}</TableCell>
                <TableCell className="text-right">{log.itemsFound}</TableCell>
                <TableCell className="text-right text-emerald-700 dark:text-emerald-400">
                  {log.itemsCreated}
                </TableCell>
                <TableCell className="text-right text-blue-700 dark:text-blue-400">
                  {log.itemsUpdated}
                </TableCell>
                <TableCell className="text-right">
                  {formatDuration(log.startedAt, log.completedAt, t)}
                </TableCell>
                <TableCell>
                  {log.errors && log.errors.length > 0 && (
                    <span
                      data-testid="error-indicator"
                      title={log.errors.map((e) => e.message).join(", ")}
                    >
                      <AlertCircle className="text-destructive h-4 w-4" />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
