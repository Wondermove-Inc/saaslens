// src/components/integrations/integration-detail-client.tsx
"use client";

import { deleteIntegration, type SyncLogEntry } from "@/actions/integrations";
import { PageHeader } from "@/components/common/page-header";
import {
  IntegrationDetailCard,
  type IntegrationDetailProps,
} from "@/components/integrations/integration-detail-card";
import { IntegrationSettingsForm } from "@/components/integrations/integration-settings-form";
import { SyncLogsTable } from "@/components/integrations/sync-logs-table";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useShow } from "@refinedev/core";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

interface IntegrationDetailClientProps {
  id: string;
  canManage: boolean;
}

export function IntegrationDetailClient({
  id,
  canManage,
}: IntegrationDetailClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const getIntegrationTypeName = (type: string): string => {
    const typeNames: Record<string, string> = {
      GOOGLE_WORKSPACE: t("integrations.type.googleWorkspace"),
      MICROSOFT_ENTRA: t("integrations.type.microsoftEntra"),
      OKTA: t("integrations.type.okta"),
    };
    return typeNames[type] || type;
  };

  const {
    query: { data, isLoading },
  } = useShow<IntegrationDetailProps>({
    resource: "integrations",
    id,
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/v1/integrations/${id}/logs`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) {
          setLogs(json.logs ?? []);
        }
      } finally {
        if (mounted) setLogsLoading(false);
      }
    };
    fetchLogs();
    return () => {
      mounted = false;
    };
  }, [id]);

  const integrationDetail = useMemo(() => {
    const record = data?.data;
    if (!record) return null;

    return record as IntegrationDetailProps;
  }, [data?.data]);

  const handleDelete = () => {
    startDeleteTransition(async () => {
      try {
        const result = await deleteIntegration(id);
        if (result?.success) {
          toast.success(t("integrations.delete.success"));
          router.push("/integrations");
        } else {
          toast.error(result?.message || t("integrations.delete.error"));
        }
      } catch {
        toast.error(t("integrations.delete.errorUnknown"));
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Page Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="mt-2 h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* Detail Card Skeleton */}
        <Card className="border-border/50 rounded-sm shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="mt-2 h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!integrationDetail) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          {t("integrations.actions.notFound")}
        </p>
        <Link href="/integrations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("integrations.actions.back")}
          </Button>
        </Link>
      </div>
    );
  }

  const initialSettings = {
    autoSync: (integrationDetail.metadata.autoSync as boolean) ?? false,
    syncInterval:
      (integrationDetail.metadata.syncInterval as
        | "hourly"
        | "daily"
        | "weekly") ?? "daily",
    syncUsers: (integrationDetail.metadata.syncUsers as boolean) ?? true,
    syncApps: (integrationDetail.metadata.syncApps as boolean) ?? false,
  };

  const typeName = getIntegrationTypeName(integrationDetail.type);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("integrations.detail.title", { typeName })}
        description={t("integrations.detail.description")}
        showBack
        backHref="/integrations"
        actions={[
          {
            label: t("integrations.actions.edit"),
            icon: Pencil,
            href: `/integrations/${id}/edit`,
            variant: "outline",
            disabled: !canManage,
          },
          ...(canManage
            ? [
                {
                  label: isDeleting
                    ? t("integrations.actions.deleting")
                    : t("integrations.actions.delete"),
                  icon: Trash2,
                  variant: "destructive" as const,
                  onClick: () => setDeleteDialogOpen(true),
                  disabled: isDeleting,
                },
              ]
            : []),
        ]}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("integrations.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("integrations.delete.description", { typeName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("integrations.delete.cancelled")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting
                ? t("integrations.actions.deleting")
                : t("integrations.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IntegrationDetailCard integration={integrationDetail} />

      <div className="grid gap-6 lg:grid-cols-2">
        <IntegrationSettingsForm
          integrationId={integrationDetail.id}
          initialSettings={initialSettings}
          disabled={!canManage}
        />
        <SyncLogsTable logs={logs} isLoading={logsLoading} />
      </div>
    </div>
  );
}
