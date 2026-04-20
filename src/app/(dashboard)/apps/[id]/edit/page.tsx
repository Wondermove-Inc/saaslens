// src/app/(dashboard)/apps/[id]/edit/page.tsx
import { getApp } from "@/actions/apps";
import { AppEditForm } from "@/components/apps/app-edit-form";
import { PageHeader } from "@/components/common/page-header";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

interface AppEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppEditPage({ params }: AppEditPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const app = await getApp(id);

  if (!app) {
    notFound();
  }

  const userRole = session.user.role;
  const userTeamId = session.user.teamId ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={`${app.name} 수정`}
        description="앱 정보를 수정합니다"
        showBack
        backHref={`/apps/${id}`}
      />

      <AppEditForm app={app} userRole={userRole} userTeamId={userTeamId} />
    </div>
  );
}
