// src/app/(auth)/invite/[token]/page.tsx
import { acceptInvitation } from "@/actions/invitations";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

interface InviteAcceptPageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({
  params,
}: InviteAcceptPageProps) {
  const t = await getTranslations();
  const { token } = await params;

  if (!token) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("auth.invite.title")}</h1>
        <p className="text-destructive">{t("auth.invite.invalid")}</p>
      </div>
    );
  }

  const result = await acceptInvitation(token);

  if (result.success) {
    // 세션 갱신 후 /apps로 리다이렉트 (JWT에 organizationId 반영)
    redirect("/api/auth/refresh-session?callbackUrl=/dashboard");
  }

  return (
    <div className="space-y-3 p-6">
      <h1 className="text-2xl font-bold">{t("auth.invite.title")}</h1>
      {result.success ? (
        <>
          <p className="text-muted-foreground">{t("auth.invite.success")}</p>
        </>
      ) : (
        <>
          <p className="text-destructive">{result.message}</p>
          <Link href="/login" className="text-primary underline">
            {t("auth.invite.cta")}
          </Link>
        </>
      )}
    </div>
  );
}
