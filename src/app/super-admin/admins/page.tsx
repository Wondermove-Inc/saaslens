// src/app/super-admin/admins/page.tsx
import {
  listTenantAdmins,
  listTenantInvitations,
} from "@/actions/super-admin/admin-users";
import { AdminsTable } from "@/components/super-admin/admins-table";
import { InvitationsHistoryTable } from "@/components/super-admin/invitations-history-table";
import { InviteAdminForm } from "@/components/super-admin/invite-admin-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "관리자 관리 | Super Admin",
};

export default async function AdminsPage() {
  const [result, invitationsResult] = await Promise.all([
    listTenantAdmins(),
    listTenantInvitations(),
  ]);

  const noTenant =
    !result.success && result.message === "테넌트 정보를 찾을 수 없습니다.";

  if (noTenant) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">관리자 관리</h1>
          <p className="text-muted-foreground">
            테넌트 관리자를 초대하고 역할을 관리합니다.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">
              관리자를 초대하려면 먼저 테넌트를 생성해야 합니다.
            </p>
            <Button asChild>
              <Link href="/super-admin/tenant">테넌트 생성하기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">관리자 관리</h1>
        <p className="text-muted-foreground">
          테넌트 관리자를 초대하고 역할을 관리합니다.
        </p>
      </div>

      {/* 관리자 초대 */}
      <Card>
        <CardHeader>
          <CardTitle>관리자 초대</CardTitle>
          <CardDescription>
            이메일로 초대장을 발송합니다. ADMIN 역할로 가입됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteAdminForm />
        </CardContent>
      </Card>

      {/* 초대 발송 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>초대 발송 이력</CardTitle>
          <CardDescription>
            발송된 초대 현황입니다. 대기 중인 초대는 재발송할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsResult.success && invitationsResult.data ? (
            <InvitationsHistoryTable invitations={invitationsResult.data} />
          ) : (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
              발송된 초대가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>관리자 목록</CardTitle>
          <CardDescription>
            현재 ADMIN 역할을 가진 사용자 목록입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success && result.data ? (
            <AdminsTable admins={result.data} />
          ) : (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
              {result.message ?? "데이터를 불러올 수 없습니다."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
