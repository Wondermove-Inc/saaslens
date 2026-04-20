// src/components/reports/audit/audit-log-detail-dialog.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKoreanDateTime } from "@/lib/date";
import type { AuditLogEntry } from "@/types/audit";
import { useTranslations } from "next-intl";

interface AuditLogDetailDialogProps {
  log: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getActionCategory(action: string): string {
  if (action.startsWith("CREATE")) return "CREATE";
  if (action.startsWith("UPDATE")) return "UPDATE";
  if (action.startsWith("DELETE")) return "DELETE";
  if (action.startsWith("LOGIN")) return "LOGIN";
  if (action.startsWith("LOGOUT")) return "LOGOUT";
  if (action.startsWith("SYNC")) return "SYNC";
  if (action.startsWith("EXPORT")) return "EXPORT";
  if (action.startsWith("IMPORT")) return "IMPORT";
  return action;
}

function getActionBadge(action: string, t: (key: string) => string) {
  const category = getActionCategory(action);

  const actionConfig: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    CREATE: { label: t("reports.audit.actions.create"), variant: "default" },
    UPDATE: { label: t("reports.audit.actions.update"), variant: "secondary" },
    DELETE: {
      label: t("reports.audit.actions.delete"),
      variant: "destructive",
    },
    LOGIN: { label: t("reports.audit.actions.login"), variant: "outline" },
    LOGOUT: { label: t("reports.audit.actions.logout"), variant: "outline" },
    SYNC: { label: t("reports.audit.actions.sync"), variant: "secondary" },
    EXPORT: { label: t("reports.audit.actions.export"), variant: "outline" },
    IMPORT: { label: t("reports.audit.actions.import"), variant: "outline" },
  };
  const config = actionConfig[category] || {
    label: action,
    variant: "outline" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getEntityTypeName(
  entityType: string,
  t: (key: string) => string
): string {
  const names: Record<string, string> = {
    App: t("reports.audit.entityTypes.app"),
    Subscription: t("reports.audit.entityTypes.subscription"),
    User: t("reports.audit.entityTypes.user"),
    Integration: t("reports.audit.entityTypes.integration"),
    Organization: t("reports.audit.entityTypes.organization"),
    Payment: t("reports.audit.entityTypes.payment"),
  };
  return names[entityType] || entityType;
}

function getEntityDisplayName(log: AuditLogEntry): string | null {
  const metadata = (log.metadata || {}) as Record<string, unknown>;

  switch (log.entityType) {
    case "App":
      return (metadata.appName as string) ?? null;
    case "Subscription": {
      const appName = metadata.appName as string | undefined;
      const amount = metadata.amount as number | undefined;
      if (appName && typeof amount === "number") {
        return `${appName} · ${amount.toLocaleString()}`;
      }
      return appName ?? null;
    }
    case "User":
      return log.userName || log.userEmail;
    default:
      return null;
  }
}

export function AuditLogDetailDialog({
  log,
  open,
  onOpenChange,
}: AuditLogDetailDialogProps) {
  const t = useTranslations();
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("reports.audit.detail.title")}
            {getActionBadge(log.action, t)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm">
                {t("reports.audit.detail.fields.time")}
              </p>
              <p className="font-medium">
                {formatKoreanDateTime(log.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {t("reports.audit.detail.fields.user")}
              </p>
              <p className="font-medium">{log.userName || "-"}</p>
              <p className="text-muted-foreground text-xs">{log.userEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {t("reports.audit.detail.fields.entityType")}
              </p>
              <p className="font-medium">
                {getEntityTypeName(log.entityType, t)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {t("reports.audit.detail.fields.entityName")}
              </p>
              <p className="text-sm">{getEntityDisplayName(log) || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {t("reports.audit.detail.fields.entityId")}
              </p>
              <p className="font-mono text-sm">{log.entityId || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {t("reports.audit.detail.fields.ipAddress")}
              </p>
              <p className="font-mono text-sm">{log.ipAddress || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {t("reports.audit.detail.fields.userAgent")}
              </p>
              <p
                className="text-muted-foreground truncate text-xs"
                title={log.userAgent || ""}
              >
                {log.userAgent || "-"}
              </p>
            </div>
          </div>

          {/* 변경 사항 */}
          {log.changes && Object.keys(log.changes).length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm">
                {t("reports.audit.detail.fields.changes")}
              </p>
              <pre className="bg-muted max-h-48 overflow-auto rounded-lg p-4 text-sm">
                {JSON.stringify(log.changes, null, 2)}
              </pre>
            </div>
          )}

          {/* 메타데이터 */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm">
                {t("reports.audit.detail.fields.metadata")}
              </p>
              <pre className="bg-muted max-h-48 overflow-auto rounded-lg p-4 text-sm">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* 로그 ID */}
          <div className="border-t pt-4">
            <p className="text-muted-foreground text-xs">
              {t("reports.audit.detail.fields.logId")}:{" "}
              <span className="font-mono">{log.id}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
