// src/app/(auth)/verify-email/[token]/page.tsx
// 이메일 인증 페이지

import { verifyEmail } from "@/actions/auth-credentials";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface VerifyEmailPageProps {
  params: Promise<{ token: string }>;
}

export default async function VerifyEmailPage({
  params,
}: VerifyEmailPageProps) {
  const t = await getTranslations();
  const { token } = await params;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">
              {t("auth.verify.invalid.title")}
            </CardTitle>
            <CardDescription>
              {t("auth.verify.invalid.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/login">{t("auth.verify.invalid.cta")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await verifyEmail(token);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {result.success ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <CardTitle className="text-green-600">
                {t("auth.verify.success.title")}
              </CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <CardTitle className="text-destructive">
                {t("auth.verify.failure.title")}
              </CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild>
            <Link href="/login">{t("auth.verify.cta")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
