// src/app/(dashboard)/users/[id]/page.tsx
import { getUserCached } from "@/actions/users";
import { UserDetailClient } from "@/components/users/user-detail-client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: UserDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getUserCached(id);

  if (!user) {
    return {
      title: "사용자를 찾을 수 없습니다 | SaaS 관리 플랫폼",
    };
  }

  return {
    title: `${user.name || user.email} | SaaS 관리 플랫폼`,
    description: `${user.name || user.email}의 상세 정보 및 앱 접근 권한`,
  };
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const user = await getUserCached(id);

  if (!user) {
    notFound();
  }

  return <UserDetailClient id={id} />;
}
