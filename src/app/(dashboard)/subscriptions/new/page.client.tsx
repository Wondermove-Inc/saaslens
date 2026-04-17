// src/app/(dashboard)/subscriptions/new/page.client.tsx
"use client";

import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import type {
  AppWithTeams,
  UserOption,
} from "@/components/subscriptions/subscription-form-assignment";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SubscriptionNewPageClientProps {
  apps: AppWithTeams[];
  users: UserOption[];
  isAdmin: boolean;
  title: string;
}

export function SubscriptionNewPageClient({
  apps,
  users,
  isAdmin,
  title,
}: SubscriptionNewPageClientProps) {
  const t = useTranslations("subscriptions");
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
          <Button
            type="submit"
            form="subscription-new-form"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("actions.register")}
          </Button>
        </div>
      </div>

      <SubscriptionForm
        apps={apps}
        users={users}
        isAdmin={isAdmin}
        hideActions={true}
        formId="subscription-new-form"
        onPendingChange={setIsPending}
      />
    </div>
  );
}
