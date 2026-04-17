// src/app/(dashboard)/subscriptions/page.tsx
import { SubscriptionPageClient } from "@/components/subscriptions/subscription-page-client";
import { getCachedSession } from "@/lib/auth/require-auth";

export default async function SubscriptionsPage() {
  const session = await getCachedSession();
  const role = session?.user?.role;
  const canManage = role === "ADMIN";
  return <SubscriptionPageClient canManage={canManage} />;
}
