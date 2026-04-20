// src/app/(super-admin)/extension-builds/page.tsx
import { listExtensionBuilds } from "@/actions/super-admin/extension-builds";
import { ExtensionBuildsTable } from "@/components/super-admin/extension-builds-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Extension 빌드 | Super Admin",
};

export default async function ExtensionBuildsPage() {
  const result = await listExtensionBuilds();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Extension 빌드</h1>
        <p className="text-muted-foreground">
          브라우저 확장 프로그램 빌드를 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>빌드 목록</CardTitle>
          <CardDescription>
            새 빌드를 생성하거나 기존 빌드를 다운로드합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success && result.data ? (
            <ExtensionBuildsTable initialBuilds={result.data} />
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
