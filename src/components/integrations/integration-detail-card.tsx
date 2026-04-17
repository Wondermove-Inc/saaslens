// src/components/integrations/integration-detail-card.tsx
"use client";

import { syncIntegrationNow } from "@/actions/integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKoreanDateTime } from "@/lib/date";
import { Link2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export interface IntegrationDetailProps {
  id: string;
  type: "GOOGLE_WORKSPACE" | "OKTA" | "MICROSOFT_ENTRA" | "HR_SYSTEM";
  status: "PENDING" | "ACTIVE" | "ERROR" | "DISCONNECTED";
  lastSyncAt: string | null;
  lastError: string | null;
  syncCount: number;
  lastSyncResult?: {
    status: "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";
    itemsFound: number;
    itemsCreated: number;
    itemsUpdated: number;
    errors: Array<{ code: string; message: string }>;
  };
  metadata: {
    domain?: string;
    autoSync?: boolean;
    syncInterval?: "hourly" | "daily" | "weekly";
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

interface IntegrationDetailCardProps {
  integration: IntegrationDetailProps;
  canManage?: boolean;
}

function getIntegrationTypeName(
  type: IntegrationDetailProps["type"],
  t: (key: string) => string
): string {
  const typeNames: Record<IntegrationDetailProps["type"], string> = {
    GOOGLE_WORKSPACE: t("integrations.type.googleWorkspace"),
    OKTA: t("integrations.type.okta"),
    MICROSOFT_ENTRA: t("integrations.type.microsoftEntra"),
    HR_SYSTEM: t("integrations.type.hrSystem"),
  };
  return typeNames[type] || type;
}

function getStatusBadge(
  status: IntegrationDetailProps["status"],
  t: (key: string) => string
) {
  const statusConfig: Record<
    IntegrationDetailProps["status"],
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    ACTIVE: { label: t("integrations.status.active"), variant: "default" },
    PENDING: { label: t("integrations.status.pending"), variant: "secondary" },
    ERROR: { label: t("integrations.status.error"), variant: "destructive" },
    DISCONNECTED: {
      label: t("integrations.status.disconnected"),
      variant: "outline",
    },
  };
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function IntegrationDetailCard({
  integration,
  canManage = true,
}: IntegrationDetailCardProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isSyncing, startSyncTransition] = useTransition();

  const handleSync = () => {
    startSyncTransition(async () => {
      try {
        await syncIntegrationNow(integration.id);
        router.refresh();
      } catch (error) {
        console.error(t("integrations.sync.errorLog"), error);
      }
    });
  };

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Link2 className="text-primary h-6 w-6" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {getIntegrationTypeName(integration.type, t)}
                {getStatusBadge(integration.status, t)}
              </CardTitle>
              {integration.metadata.domain && (
                <p className="text-muted-foreground text-sm">
                  {integration.metadata.domain}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={
              !canManage ||
              isSyncing ||
              !["ACTIVE", "PENDING"].includes(integration.status)
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing
              ? t("integrations.actions.syncing")
              : t("integrations.actions.sync")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* 동기화 정보 */}
          <div className="space-y-4">
            <div>
              <p className="text-muted-foreground text-sm">
                {t("integrations.detail.lastSync")}
              </p>
              <p className="font-medium">
                {integration.lastSyncAt
                  ? formatKoreanDateTime(integration.lastSyncAt)
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {t("integrations.detail.totalSyncCount")}
              </p>
              <p className="font-medium">{integration.syncCount}</p>
            </div>
          </div>

          {/* 마지막 동기화 결과 */}
          {integration.lastSyncResult && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {t("integrations.detail.lastSyncResult")}
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-gray rounded-lg p-3 text-center">
                  <p className="text-muted-foreground text-xs">
                    {t("integrations.detail.itemsFound")}
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {integration.lastSyncResult.itemsFound}
                  </p>
                </div>
                <div className="bg-purple-gray rounded-lg p-3 text-center">
                  <p className="text-muted-foreground text-xs">
                    {t("integrations.detail.itemsCreated")}
                  </p>
                  <p className="text-2xl font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                    {integration.lastSyncResult.itemsCreated}
                  </p>
                </div>
                <div className="bg-purple-gray rounded-lg p-3 text-center">
                  <p className="text-muted-foreground text-xs">
                    {t("integrations.detail.itemsUpdated")}
                  </p>
                  <p className="text-2xl font-semibold text-blue-700 tabular-nums dark:text-blue-400">
                    {integration.lastSyncResult.itemsUpdated}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 오류 메시지 */}
        {integration.lastError && (
          <div className="bg-destructive/10 text-destructive mt-4 rounded-lg p-3">
            <p className="text-sm font-medium">
              {t("integrations.detail.error")}
            </p>
            <p className="text-sm">{integration.lastError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
