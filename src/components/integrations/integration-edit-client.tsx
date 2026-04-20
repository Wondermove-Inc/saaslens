// src/components/integrations/integration-edit-client.tsx
"use client";

import { IntegrationStatusForm } from "@/components/integrations/integration-status-form";
import { Button } from "@/components/ui/button";
import { useShow } from "@refinedev/core";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";
import type { IntegrationStatusValues } from "./integration-form-schema";

interface IntegrationEditClientProps {
  id: string;
}

export function IntegrationEditClient({ id }: IntegrationEditClientProps) {
  const t = useTranslations();
  const {
    query: { data, isLoading },
  } = useShow({
    resource: "integrations",
    id,
    queryOptions: { enabled: Boolean(id) },
  });

  const status: IntegrationStatusValues["status"] = useMemo(() => {
    const record = data?.data as
      | { status?: IntegrationStatusValues["status"] }
      | undefined;
    return record?.status ?? "PENDING";
  }, [data?.data]);

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">
        {t("integrations.actions.editInfo")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-4">
        <Link href={`/integrations/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("integrations.actions.editStatus")}
          </h1>
          <p className="text-muted-foreground">
            {t("integrations.actions.editStatusDescription")}
          </p>
        </div>
      </div>

      <IntegrationStatusForm id={id} defaultStatus={status} />
    </div>
  );
}
