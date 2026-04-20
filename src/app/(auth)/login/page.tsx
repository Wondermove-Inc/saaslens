// src/app/(auth)/login/page.tsx
// 로그인 페이지 (이메일/OTP + Google OAuth)

import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { auth, signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { getTranslations } from "next-intl/server";

import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

/**
 * 로그인 페이지
 * 이메일/OTP 및 Google OAuth를 통한 로그인 지원
 * 이미 로그인된 사용자는 적절한 페이지로 리다이렉트
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations();
  const { error } = await searchParams;

  // 이미 로그인된 사용자 체크
  const session = await auth();

  if (session?.user) {
    // 조직이 있으면 /dashboard로, 없으면 /onboarding으로
    if (session.user.organizationId) {
      redirect("/dashboard");
    } else {
      redirect("/onboarding");
    }
  }

  // 에러/안내 메시지 처리
  const errorMessage = error
    ? error === "CredentialsSignin"
      ? t("auth.login.errors.invalidOtp")
      : t("auth.login.errors.default")
    : null;

  /** credentials 로그인 Server Action */
  async function loginAction(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const otp = formData.get("otp") as string;

    try {
      await signIn("credentials", {
        email,
        otp,
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=${err.type}`);
      }
      throw err;
    }
  }

  return (
    <div
      data-testid="login-page"
      className="w-full"
      style={{ animation: "auth-fade-up 0.6s ease-out 0.2s both" }}
    >
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-foreground text-2xl font-semibold">
          {t("auth.login.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("auth.login.description")}
        </p>
      </div>

      {/* 에러 메시지 */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Google 로그인 버튼 (소셜 먼저) */}
      <form
        data-testid="login-form"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <Button type="submit" variant="outline" className="w-full grow">
          <GoogleIcon className="mr-2.5 h-[18px] w-[18px]" />
          {t("auth.login.social.google")}
        </Button>
      </form>

      {/* 구분선 */}
      <div className="my-6 flex items-center gap-4">
        <div className="bg-border h-px flex-1" />
        <p className="text-muted-foreground text-sm">
          {t("auth.login.socialDivider")}
        </p>
        <div className="bg-border h-px flex-1" />
      </div>

      {/* 이메일/OTP 폼 */}
      <LoginForm
        action={loginAction}
        translations={{
          email: t("auth.login.form.email"),
          emailPlaceholder: t("auth.login.form.emailPlaceholder"),
          sendOtp: t("auth.login.form.sendOtp"),
          sendingOtp: t("auth.login.form.sendingOtp"),
          resendOtp: t("auth.login.form.resendOtp"),
          resendCooldown: t.raw("auth.login.form.resendCooldown") as string,
          otpLabel: t("auth.login.form.otpLabel"),
          otpPlaceholder: t("auth.login.form.otpDescription"),
          submit: t("auth.login.form.submit"),
          signingIn: t("auth.login.form.signingIn"),
          changeEmail: t("auth.login.form.changeEmail"),
          errors: {
            userNotFound: t("auth.login.errors.userNotFound"),
            cooldownActive: t.raw("auth.login.errors.cooldownActive") as string,
            emailSendFailed: t("auth.login.errors.emailSendFailed"),
            default: t("auth.login.errors.default"),
          },
        }}
      />
    </div>
  );
}

/**
 * Google 아이콘 컴포넌트
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
