// src/app/(auth)/reset-password/[token]/page.tsx
// 비밀번호 재설정 페이지

import { resetPassword } from "@/actions/password";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

interface ResetPasswordPageProps {
  params: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps) {
  const t = await getTranslations();
  const { token } = await params;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">
              {t("auth.reset.invalid.title")}
            </CardTitle>
            <CardDescription>
              {t("auth.reset.invalid.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/forgot-password">{t("auth.reset.invalid.cta")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 토큰 유효성 검증
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">
              {t("auth.reset.invalidLink.title")}
            </CardTitle>
            <CardDescription>
              {t("auth.reset.invalidLink.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/forgot-password">
                {t("auth.reset.invalidLink.cta")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 만료 확인
  if (new Date() > resetToken.expires) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">
              {t("auth.reset.expired.title")}
            </CardTitle>
            <CardDescription>
              {t("auth.reset.expired.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/forgot-password">{t("auth.reset.expired.cta")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {t("auth.reset.title")}
          </CardTitle>
          <CardDescription>{t("auth.reset.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              "use server";
              formData.set("token", token);
              const result = await resetPassword(formData);
              if (result.success) {
                redirect("/login?message=password-reset");
              }
              // TODO: 에러 처리는 클라이언트 컴포넌트로 분리 필요
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.reset.form.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t("auth.reset.form.passwordPlaceholder")}
                required
              />
              <p className="text-muted-foreground text-xs">
                {t("auth.reset.form.passwordHint")}
              </p>
            </div>
            <Button type="submit" className="w-full" size="lg">
              {t("auth.reset.form.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
