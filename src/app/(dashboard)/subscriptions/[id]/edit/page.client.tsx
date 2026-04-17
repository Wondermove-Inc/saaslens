// src/app/(dashboard)/subscriptions/[id]/edit/page.client.tsx
"use client";

import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import type {
  AppWithTeams,
  UserOption,
} from "@/components/subscriptions/subscription-form-assignment";
import { Button } from "@/components/ui/button";
import type { SubscriptionDetail } from "@/types/subscription";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SubscriptionEditPageClientProps {
  apps: AppWithTeams[];
  users: UserOption[];
  isAdmin: boolean;
  subscription: SubscriptionDetail;
  title: string;
}

export function SubscriptionEditPageClient({
  apps,
  users,
  isAdmin,
  subscription,
  title,
}: SubscriptionEditPageClientProps) {
  const t = useTranslations("subscriptions");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="space-y-6">
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
            form="subscription-edit-form"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("actions.save")}
          </Button>
        </div>
      </div>

      <SubscriptionForm
        apps={apps}
        users={users}
        isAdmin={isAdmin}
        subscription={subscription}
        hideActions={true}
        formId="subscription-edit-form"
        onPendingChange={setIsPending}
      />
    </div>
  );
}
