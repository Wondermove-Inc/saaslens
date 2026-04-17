"use client";

import { sendOtp } from "@/actions/otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type OtpState = "idle" | "sending" | "sent";

/** 부모 Server Component에서 주입하는 번역 문자열 */
export interface LoginFormTranslations {
  email: string;
  emailPlaceholder: string;
  sendOtp: string;
  sendingOtp: string;
  resendOtp: string;
  resendCooldown: string;
  otpLabel: string;
  otpPlaceholder: string;
  submit: string;
  signingIn: string;
  changeEmail: string;
  errors: {
    userNotFound: string;
    cooldownActive: string;
    emailSendFailed: string;
    default: string;
  };
}

export interface LoginFormProps {
  /** Server Action — credentials 로그인 처리 */
  action: (formData: FormData) => void;
  translations: LoginFormTranslations;
}

/**
 * Submit 버튼 — useFormStatus로 pending 상태를 감지합니다.
 * useFormStatus는 반드시 <form> 자식 컴포넌트에서 호출해야 합니다.
 */
function SubmitButton({
  label,
  pendingLabel,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full">
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * 로그인 폼 컴포넌트 (이메일/OTP)
 *
 * Step 1: 이메일 입력 + 인증 코드 발송 버튼
 * Step 2: OTP 입력 + 재발송 + 로그인 버튼 (fade-in)
 */
export function LoginForm({ action, translations: t }: LoginFormProps) {
  const [otpState, setOtpState] = useState<OtpState>("idle");
  const [otpValue, setOtpValue] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    const email = emailRef.current?.value ?? "";
    if (!email) return;

    setOtpState("sending");
    setError(null);

    const result = await sendOtp(email);

    if (result.success) {
      setOtpState("sent");
      setCooldown(60);
    } else {
      setOtpState("idle");
      const errorMap: Record<string, string> = {
        USER_NOT_FOUND: t.errors.userNotFound,
        COOLDOWN_ACTIVE: t.errors.cooldownActive,
        EMAIL_SEND_FAILED: t.errors.emailSendFailed,
      };
      setError(
        result.error
          ? (errorMap[result.error] ?? t.errors.default)
          : t.errors.default
      );
    }
  };

  const handleChangeEmail = () => {
    setOtpState("idle");
    setOtpValue("");
    setError(null);
    setCooldown(0);
  };

  const isSending = otpState === "sending";
  const isSent = otpState === "sent";
  const emailDisabled = isSent || isSending;
  const isOtpSectionVisible = isSent;
  const canSubmit = otpValue.length === 6 && isSent;

  const resendButtonLabel =
    cooldown > 0
      ? t.resendCooldown.replace("{seconds}", String(cooldown))
      : t.resendOtp;
  const resendButtonDisabled = isSending || cooldown > 0;

  return (
    <form
      action={action}
      className="space-y-4"
      data-testid="login-credentials-form"
    >
      {/* 이메일 + 발송/변경 버튼 */}
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.email}</Label>
        <div className="flex gap-2">
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            placeholder={t.emailPlaceholder}
            autoComplete="email"
            required
            readOnly={emailDisabled}
            tabIndex={emailDisabled ? -1 : undefined}
            className={`flex-1 ${emailDisabled ? "pointer-events-none opacity-50" : ""}`}
          />
          {!isOtpSectionVisible ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendOtp}
              disabled={isSending}
              className="shrink-0"
            >
              {isSending ? t.sendingOtp : t.sendOtp}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={handleChangeEmail}
              className="text-muted-foreground shrink-0"
              data-testid="change-email-btn"
            >
              {t.changeEmail}
            </Button>
          )}
        </div>
      </div>

      {/* Step 1 에러 */}
      {!isOtpSectionVisible && error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      {/* Step 2: OTP 영역 + 로그인 버튼 */}
      {isOtpSectionVisible && (
        <>
          <div
            className="space-y-1.5"
            style={{ animation: "auth-fade-up 0.35s ease-out both" }}
            data-testid="otp-section"
          >
            <Label>{t.otpLabel}</Label>
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={setOtpValue}
              className="w-full"
            >
              <InputOTPGroup className="flex-1">
                <InputOTPSlot index={0} />
              </InputOTPGroup>
              <InputOTPGroup className="flex-1">
                <InputOTPSlot index={1} />
              </InputOTPGroup>
              <InputOTPGroup className="flex-1">
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="flex-1">
                <InputOTPSlot index={3} />
              </InputOTPGroup>
              <InputOTPGroup className="flex-1">
                <InputOTPSlot index={4} />
              </InputOTPGroup>
              <InputOTPGroup className="flex-1">
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <input type="hidden" name="otp" value={otpValue} />

            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleSendOtp}
              disabled={resendButtonDisabled}
              className="text-muted-foreground h-auto px-0 text-xs"
            >
              {resendButtonLabel}
            </Button>
          </div>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <div style={{ animation: "auth-fade-up 0.35s ease-out 0.05s both" }}>
            <SubmitButton
              label={t.submit}
              pendingLabel={t.signingIn}
              disabled={!canSubmit}
            />
          </div>
        </>
      )}
    </form>
  );
}
