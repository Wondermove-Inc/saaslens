// src/app/(auth)/signup/page.tsx
// 회원가입 페이지 (이메일/비밀번호 + Google OAuth)

import { registerUser } from "@/actions/auth-credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { auth, signIn } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

interface SignupPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const t = await getTranslations();
  const { error } = await searchParams;
  // 이미 로그인된 사용자 체크
  const session = await auth();

  if (session?.user) {
    if (session.user.organizationId) {
      redirect("/dashboard");
    } else {
      redirect("/onboarding");
    }
  }

  const errorConfig: Record<
    string,
    { message: string; type: "google" | "credentials" | "default" }
  > = {
    EMAIL_EXISTS_OAUTH_GOOGLE: {
      message: t("auth.signup.errors.emailExistsGoogle"),
      type: "google",
    },
    EMAIL_EXISTS_CREDENTIALS: {
      message: t("auth.signup.errors.emailExistsCredentials"),
      type: "credentials",
    },
    EMAIL_EXISTS: {
      message: t("auth.signup.errors.emailExists"),
      type: "default",
    },
    default: {
      message: t("auth.signup.errors.default"),
      type: "default",
    },
  };
  const errorLabels = {
    googleLogin: t("auth.signup.errors.googleLogin"),
    loginLink: t("auth.signup.errors.loginLink"),
  };

  return (
    <div
      data-testid="signup-page"
      className="w-full"
      style={{ animation: "auth-fade-up 0.6s ease-out 0.2s both" }}
    >
      {/* 헤더 */}
      <div className="mb-10">
        <h2
          className="text-[28px] font-semibold"
          style={{ color: "var(--auth-text-primary)" }}
        >
          {t("auth.signup.title")}
        </h2>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--auth-text-secondary)" }}
        >
          {t("auth.signup.description")}
        </p>
      </div>

      {/* 에러 메시지 */}
      <ErrorAlert error={error} config={errorConfig} labels={errorLabels} />

      {/* Google 회원가입 버튼 - 이메일 중복 에러 시 숨김 */}
      {!["google", "credentials"].includes(
        errorConfig[error ?? ""]?.type ?? ""
      ) && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <Button
            type="submit"
            variant="outline"
            className="h-[50px] w-full rounded-xl text-sm transition-colors"
            style={{
              background: "transparent",
              border: "1px solid var(--auth-border)",
              color: "var(--auth-text-primary)",
            }}
          >
            <GoogleIcon className="mr-2.5 h-[18px] w-[18px]" />
            {t("auth.signup.social.googleContinue")}
          </Button>
        </form>
      )}

      {/* 구분선 */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full bg-[var(--auth-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span
            className="px-4 text-[12px]"
            style={{
              background: "var(--auth-panel-bg)",
              color: "var(--auth-text-secondary)",
            }}
          >
            {t("auth.signup.emailDivider")}
          </span>
        </div>
      </div>

      {/* 이메일/비밀번호 폼 */}
      <form
        action={async (formData: FormData) => {
          "use server";
          const result = await registerUser(formData);
          const { redirect } = await import("next/navigation");

          if (result.success) {
            redirect("/login?message=verify-email");
          }
          if (result.error) {
            redirect(`/signup?error=${result.error}`);
          }
        }}
        className="space-y-5"
      >
        {/* 이름 */}
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-[13px] font-medium"
            style={{ color: "var(--auth-text-secondary)" }}
          >
            {t("auth.signup.form.name")}
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder={t("auth.signup.form.namePlaceholder")}
            required
            className="h-12 rounded-xl border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] text-[var(--auth-text-primary)] placeholder:text-[var(--auth-text-muted)] focus-visible:border-[#06d6a0] focus-visible:ring-[#06d6a020]"
          />
        </div>

        {/* 이메일 */}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-[13px] font-medium"
            style={{ color: "var(--auth-text-secondary)" }}
          >
            {t("auth.signup.form.email")}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t("auth.signup.form.emailPlaceholder")}
            required
            className="h-12 rounded-xl border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] text-[var(--auth-text-primary)] placeholder:text-[var(--auth-text-muted)] focus-visible:border-[#06d6a0] focus-visible:ring-[#06d6a020]"
          />
        </div>

        {/* 비밀번호 */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-[13px] font-medium"
            style={{ color: "var(--auth-text-secondary)" }}
          >
            {t("auth.signup.form.password")}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={t("auth.signup.form.passwordPlaceholder")}
            required
            className="h-12 rounded-xl border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] text-[var(--auth-text-primary)] placeholder:text-[var(--auth-text-muted)] focus-visible:border-[#06d6a0] focus-visible:ring-[#06d6a020]"
          />
          <p className="text-xs" style={{ color: "var(--auth-text-muted)" }}>
            {t("auth.signup.form.passwordHint")}
          </p>
        </div>

        {/* 회원가입 버튼 */}
        <Button
          type="submit"
          className="h-12 w-full rounded-xl border-none text-[15px] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(6,214,160,0.3)]"
          style={{
            background: "linear-gradient(135deg, #06d6a0, #0891b2)",
            color: "#0a0e1a",
          }}
        >
          {t("auth.signup.form.submit")}
        </Button>
      </form>

      {/* 푸터 */}
      <div className="mt-8 space-y-3 text-center">
        <p
          className="text-[13px]"
          style={{ color: "var(--auth-text-secondary)" }}
        >
          {t("auth.signup.footer.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium hover:underline"
            style={{ color: "#06d6a0" }}
          >
            {t("auth.signup.footer.login")}
          </Link>
        </p>
        <p
          className="text-center text-xs"
          style={{ color: "var(--auth-text-muted)" }}
        >
          {t("auth.signup.footer.agreePrefix")}{" "}
          <Link href="/terms" className="underline hover:opacity-80">
            {t("auth.signup.footer.terms")}
          </Link>{" "}
          {t("auth.signup.footer.and")}{" "}
          <Link href="/privacy" className="underline hover:opacity-80">
            {t("auth.signup.footer.privacy")}
          </Link>
          {t("auth.signup.footer.agreeSuffix")}
        </p>
      </div>
    </div>
  );
}

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

/**
 * 에러 메시지 Alert 컴포넌트
 */
function ErrorAlert({
  error,
  config,
  labels,
}: {
  error: string | undefined;
  config: Record<
    string,
    { message: string; type: "google" | "credentials" | "default" }
  >;
  labels: { googleLogin: string; loginLink: string };
}) {
  if (!error) return null;

  const errorConfig = config[error] || config.default;

  return (
    <div className="bg-destructive/10 border-destructive/20 mb-6 rounded-lg border p-4">
      <p className="text-destructive mb-3 text-sm font-medium">
        {errorConfig.message}
      </p>

      {/* Google OAuth 에러: Google 로그인 버튼 표시 */}
      {errorConfig.type === "google" && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit" variant="outline" size="sm" className="w-full">
            <GoogleIcon className="mr-2 h-4 w-4" />
            {labels.googleLogin}
          </Button>
        </form>
      )}

      {/* Credentials 에러: 로그인 페이지 링크 */}
      {errorConfig.type === "credentials" && (
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/login">{labels.loginLink}</Link>
        </Button>
      )}
    </div>
  );
}
