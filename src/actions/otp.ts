"use server";

import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import { sendOtpEmail } from "@/lib/services/notification/email-auth";
import type { ActionState } from "@/types";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

/**
 * 6자리 숫자 OTP 코드 생성
 */
function generateOtpCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(OTP_LENGTH, "0");
}

/**
 * 이메일로 OTP 코드 발송
 * - 미등록 이메일: USER_NOT_FOUND 반환
 * - 60초 쿨다운 중: COOLDOWN_ACTIVE 반환
 * - 기존 OTP 삭제 후 신규 OTP 생성 및 이메일 발송
 */
async function _sendOtp(email: string): Promise<ActionState> {
  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    // 초대받은 이메일인지 확인
    const pendingInvitation = await prisma.invitation.findFirst({
      where: { email, status: "PENDING" },
    });

    if (!pendingInvitation) {
      return { success: false, error: "USER_NOT_FOUND" };
    }

    // 초대받은 경우 임시 계정 생성 (조직 미연결 상태 — 초대 수락 시 연결)
    user = await prisma.user.create({
      data: {
        email,
        role: "MEMBER",
        status: "ACTIVE",
        emailVerified: new Date(),
      },
      select: { id: true, email: true, name: true },
    });
  }

  const recentToken = await prisma.otpToken.findFirst({
    where: {
      email,
      createdAt: { gt: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000) },
    },
  });

  if (recentToken) {
    return { success: false, error: "COOLDOWN_ACTIVE" };
  }

  await prisma.otpToken.deleteMany({ where: { email } });

  const code = generateOtpCode();
  const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpToken.create({
    data: { email, code, expires },
  });

  const emailResult = await sendOtpEmail({
    to: email,
    code,
    userName: user.name ?? undefined,
  });

  if (!emailResult.success) {
    return { success: false, error: "EMAIL_SEND_FAILED" };
  }

  return { success: true, message: "인증 코드가 발송되었습니다" };
}

export const sendOtp = withLogging("sendOtp", _sendOtp);

/**
 * OTP 코드 검증
 * - 유효한 토큰 없음: NO_ACTIVE_OTP 반환
 * - 최대 시도 횟수(5) 초과: MAX_ATTEMPTS_EXCEEDED 반환
 * - 코드 불일치: INVALID_OTP 반환 + 시도 횟수 증가
 * - 코드 일치: 토큰 삭제 후 success 반환
 */
async function _verifyOtp(email: string, code: string): Promise<ActionState> {
  const otpToken = await prisma.otpToken.findFirst({
    where: {
      email,
      expires: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpToken) {
    return { success: false, error: "NO_ACTIVE_OTP" };
  }

  if (otpToken.attempts >= OTP_MAX_ATTEMPTS) {
    return { success: false, error: "MAX_ATTEMPTS_EXCEEDED" };
  }

  if (otpToken.code !== code) {
    await prisma.otpToken.update({
      where: { id: otpToken.id },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, error: "INVALID_OTP" };
  }

  await prisma.otpToken.delete({ where: { id: otpToken.id } });

  return { success: true };
}

export const verifyOtp = withLogging("verifyOtp", _verifyOtp);
