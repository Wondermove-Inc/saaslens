// src/components/subscriptions/subscription-detail-client.tsx
"use client";

import { PageHeader } from "@/components/common/page-header";
import { SubscriptionDetail } from "@/components/subscriptions/subscription-detail";
import { Button } from "@/components/ui/button";
import type { SubscriptionDetail as SubscriptionDetailType } from "@/types/subscription";
import { useShow } from "@refinedev/core";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface SubscriptionDetailClientProps {
  id: string;
  role?: "ADMIN" | "MEMBER" | "VIEWER" | null;
}

export function SubscriptionDetailClient({
  id,
  role,
}: SubscriptionDetailClientProps) {
  const canEdit = role === "ADMIN";
  const canDelete = role === "ADMIN";
  const {
    query: { data, isLoading },
  } = useShow<SubscriptionDetailType>({
    resource: "subscriptions",
    id,
    queryOptions: { enabled: Boolean(id) },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">
        구독 정보를 불러오는 중...
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">구독을 찾을 수 없습니다.</p>
        <Link href="/subscriptions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Button>
        </Link>
      </div>
    );
  }

  const subscription = data.data;
  const appName = subscription.appName || "알 수 없음";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${appName} 구독`}
        description="구독 정보를 확인하고 관리하세요"
        showBack
        backHref="/subscriptions"
        actions={[
          {
            label: "수정",
            icon: Pencil,
            href: `/subscriptions/${id}/edit`,
            variant: "outline",
            disabled: !canEdit,
          },
          ...(canDelete
            ? [
                {
                  label: "삭제",
                  icon: Trash2,
                  variant: "destructive" as const,
                  // onClick 핸들러는 SubscriptionDetail 내부에서 처리
                },
              ]
            : []),
        ]}
      />
      <SubscriptionDetail subscription={subscription} hideHeader />
    </div>
  );
}
