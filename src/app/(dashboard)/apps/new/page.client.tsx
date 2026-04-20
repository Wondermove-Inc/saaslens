// src/app/(dashboard)/apps/new/page.client.tsx
"use client";

import { AppForm } from "@/components/apps/app-form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AppNewPageClientProps {
  userRole: string | undefined;
  userTeamId: string | null;
  title: string;
}

export function AppNewPageClient({
  userRole,
  userTeamId,
  title,
}: AppNewPageClientProps) {
  const t = useTranslations("apps");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="space-y-6">
      {/* 타이틀과 동일 선상의 버튼 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {t("actions.cancel")}
          </Button>
          <Button type="submit" form="app-new-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("form.create.actions.register")}
          </Button>
        </div>
      </div>

      <AppForm
        userRole={userRole}
        userTeamId={userTeamId}
        hideActions={true}
        formId="app-new-form"
        onPendingChange={setIsPending}
      />
    </div>
  );
}
