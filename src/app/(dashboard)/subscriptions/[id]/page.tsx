// src/app/(dashboard)/subscriptions/[id]/page.tsx
import { getSubscriptionCached } from "@/actions/subscriptions";
import { SubscriptionDetailClient } from "@/components/subscriptions/subscription-detail-client";
import { getCachedSession } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface SubscriptionDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SubscriptionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const subscription = await getSubscriptionCached(id);

  if (!subscription) {
    return { title: "구독을 찾을 수 없음" };
  }

  return {
    title: `${subscription.appName} 구독 | SaaS 관리 플랫폼`,
    description: `${subscription.appName} 구독 상세 정보`,
  };
}

export default async function SubscriptionDetailPage({
  params,
}: SubscriptionDetailPageProps) {
  const { id } = await params;
  const subscription = await getSubscriptionCached(id);
  if (!subscription) {
    notFound();
  }
  const session = await getCachedSession();
  const role = session?.user?.role ?? null;
  return (
    <SubscriptionDetailClient
      id={id}
      role={role as "ADMIN" | "MEMBER" | "VIEWER" | null}
    />
  );
}
