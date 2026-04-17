// src/app/(auth)/forgot-password/page.tsx
// 비밀번호 재설정 요청 페이지

import { requestPasswordReset } from "@/actions/password";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import { ArrowLeft, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

interface ForgotPasswordPageProps {
  searchParams: Promise<{
    success?: string;
  }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const t = await getTranslations();
  const { success } = await searchParams;

  // 이미 로그인된 사용자 체크
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  // 이메일 발송 성공 시
  if (success === "true") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>{t("auth.forgot.success.title")}</CardTitle>
            <CardDescription>
              {t("auth.forgot.success.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                {t("auth.forgot.success.notice")}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("auth.forgot.success.backToLogin")}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {t("auth.forgot.title")}
          </CardTitle>
          <CardDescription>{t("auth.forgot.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              "use server";
              const result = await requestPasswordReset(formData);
              if (result.success) {
                redirect("/forgot-password?success=true");
              }
              // 에러 처리는 클라이언트 컴포넌트로 분리 필요
              // 일단 같은 페이지로 리다이렉트
              redirect("/forgot-password?success=true");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.forgot.form.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("auth.forgot.form.emailPlaceholder")}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              {t("auth.forgot.form.submit")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-primary text-sm hover:underline"
          >
            <ArrowLeft className="mr-1 inline-block h-4 w-4" />
            {t("auth.forgot.footer.backToLogin")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
