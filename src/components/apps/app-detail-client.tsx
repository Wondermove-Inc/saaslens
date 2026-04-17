// src/components/apps/app-detail-client.tsx
"use client";

import { useCan, useShow } from "@refinedev/core";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { AppDetail } from "@/components/apps/app-detail";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import type { AppDetail as AppDetailType } from "@/types/app";
import { useTranslations } from "next-intl";

interface AppDetailClientProps {
  id: string;
  role?: "ADMIN" | "MEMBER" | "VIEWER" | null;
}

export function AppDetailClient({ id, role }: AppDetailClientProps) {
  const t = useTranslations();
  const {
    query: { data, isLoading },
  } = useShow<AppDetailType>({
    resource: "apps",
    id,
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const { data: editAccess } = useCan({
    resource: "apps",
    action: "edit",
    params: { user: { role } },
    queryOptions: {
      enabled: true,
    },
  });

  const { data: deleteAccess } = useCan({
    resource: "apps",
    action: "delete",
    params: { user: { role } },
    queryOptions: {
      enabled: true,
    },
  });

  const canEdit = editAccess?.can ?? role === "ADMIN";
  const canDelete = deleteAccess?.can ?? role === "ADMIN";

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">
        {t("apps.actions.loading")}
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          {t("apps.detail.notFound.title")}
        </p>
        <Link href="/apps">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("apps.actions.back")}
          </Button>
        </Link>
      </div>
    );
  }

  const app = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={app.name}
        description={t("apps.detail.notFound.description")}
        showBack
        backHref="/apps"
        actions={[
          {
            label: t("apps.actions.edit"),
            icon: Pencil,
            href: `/apps/${id}/edit`,
            variant: "outline",
            disabled: !canEdit,
          },
          ...(canDelete
            ? [
                {
                  label: t("apps.actions.delete"),
                  icon: Trash2,
                  variant: "destructive" as const,
                  // 삭제 핸들러는 AppDetail 내부에서 처리
                },
              ]
            : []),
        ]}
      />
      <AppDetail app={app} canEdit={canEdit} />
    </div>
  );
}
