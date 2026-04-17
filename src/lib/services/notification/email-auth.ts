// src/lib/services/notification/email-auth.ts
// 인증 관련 이메일 발송 (회원가입 인증, 비밀번호 재설정)

import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY || "dummy-key-for-build";
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@saas-mgmt.com";
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export interface VerificationEmailParams {
  to: string;
  token: string;
  userName?: string;
}

export interface PasswordResetEmailParams {
  to: string;
  token: string;
  userName?: string;
}

export interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * 이메일 인증 메일 발송
 */
export async function sendVerificationEmail(
  params: VerificationEmailParams
): Promise<EmailResult> {
  const { to, token, userName } = params;
  const verifyUrl = `${BASE_URL}/verify-email/${token}`;

  try {
    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: "[SaaS 관리 플랫폼] 이메일 인증을 완료해주세요",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>이메일 인증</h2>
          <p>${userName ? `안녕하세요, ${userName}님!` : "안녕하세요!"}</p>
          <p>SaaS 관리 플랫폼에 가입해 주셔서 감사합니다.</p>
          <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
          <div style="margin: 30px 0;">
            <a href="${verifyUrl}"
               style="background-color: #0070f3; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              이메일 인증하기
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            이 링크는 24시간 동안 유효합니다.
          </p>
          <p style="color: #666; font-size: 14px;">
            본인이 요청하지 않은 경우 이 메일을 무시하세요.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br />
            <a href="${verifyUrl}" style="color: #0070f3;">${verifyUrl}</a>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("인증 이메일 발송 실패:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("인증 이메일 발송 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "이메일 발송 실패",
    };
  }
}

/**
 * 비밀번호 재설정 이메일 발송
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<EmailResult> {
  const { to, token, userName } = params;
  const resetUrl = `${BASE_URL}/reset-password/${token}`;

  try {
    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: "[SaaS 관리 플랫폼] 비밀번호 재설정",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>비밀번호 재설정</h2>
          <p>${userName ? `안녕하세요, ${userName}님!` : "안녕하세요!"}</p>
          <p>비밀번호 재설정을 요청하셨습니다.</p>
          <p>아래 버튼을 클릭하여 새 비밀번호를 설정하세요.</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #0070f3; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              비밀번호 재설정
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            이 링크는 1시간 동안 유효합니다.
          </p>
          <p style="color: #666; font-size: 14px;">
            본인이 요청하지 않은 경우 이 메일을 무시하세요. 비밀번호는 변경되지 않습니다.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br />
            <a href="${resetUrl}" style="color: #0070f3;">${resetUrl}</a>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("비밀번호 재설정 이메일 발송 실패:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("비밀번호 재설정 이메일 발송 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "이메일 발송 실패",
    };
  }
}

export interface OtpEmailParams {
  to: string;
  code: string;
  userName?: string;
}

export async function sendOtpEmail(
  params: OtpEmailParams
): Promise<EmailResult> {
  const { to, code, userName } = params;

  try {
    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: "[SaaS 관리 플랫폼] 로그인 인증 코드",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>로그인 인증 코드</h2>
          <p>${userName ? `안녕하세요, ${userName}님!` : "안녕하세요!"}</p>
          <p>SaaS 관리 플랫폼 로그인을 위한 인증 코드입니다.</p>
          <div style="margin: 30px 0; text-align: center;">
            <div style="display: inline-block; background-color: #f4f4f5;
                        padding: 16px 32px; border-radius: 8px;
                        font-size: 32px; font-weight: bold;
                        letter-spacing: 8px; font-family: monospace;">
              ${code}
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">
            이 코드는 <strong>10분</strong> 동안 유효합니다.
          </p>
          <p style="color: #666; font-size: 14px;">
            본인이 요청하지 않은 경우 이 메일을 무시하세요.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            이 코드를 다른 사람과 공유하지 마세요.
          </p>
        </div>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "이메일 발송 실패",
    };
  }
}
