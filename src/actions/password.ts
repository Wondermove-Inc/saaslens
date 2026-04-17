// src/actions/password.ts
"use server";

import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { sendPasswordResetEmail } from "@/lib/services/notification/email-auth";
import { passwordSchema } from "@/lib/validation/password";
import type { ActionState } from "@/types";
import { z } from "zod";

const requestResetSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "토큰이 필요합니다"),
  password: passwordSchema,
});

/**
 * 비밀번호 재설정 요청
 * 1. 이메일로 사용자 확인
 * 2. 재설정 토큰 생성 (1시간 유효)
 * 3. 이메일 발송
 *
 * 보안상 사용자 존재 여부와 관계없이 같은 응답 반환
 */
async function _requestPasswordReset(
  input: { email: string } | FormData
): Promise<ActionState> {
  try {
    // FormData 또는 객체에서 데이터 추출
    const rawData =
      input instanceof FormData ? { email: input.get("email") } : input;

    // 유효성 검사
    const parsed = requestResetSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.flatten().fieldErrors.email?.[0] ||
          "유효한 이메일을 입력하세요",
      };
    }

    const { email } = parsed.data;

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, passwordHash: true },
    });

    // 사용자가 없거나 비밀번호가 설정되지 않은 경우 (OAuth 전용 계정)
    // 보안상 같은 응답 반환
    if (!user || !user.passwordHash) {
      return {
        success: true,
        message: "이메일이 발송되었습니다. 메일함을 확인해주세요.",
      };
    }

    // 기존 토큰 삭제
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // 새 토큰 생성 (1시간 유효)
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    // 이메일 발송
    await sendPasswordResetEmail({
      to: email,
      token,
      userName: user.name || undefined,
    });

    return {
      success: true,
      message: "이메일이 발송되었습니다. 메일함을 확인해주세요.",
    };
  } catch (error) {
    logger.error({ err: error }, "비밀번호 재설정 요청 오류");
    return {
      success: false,
      message: "비밀번호 재설정 요청 중 오류가 발생했습니다",
    };
  }
}
export const requestPasswordReset = withLogging(
  "requestPasswordReset",
  _requestPasswordReset
);

/**
 * 비밀번호 재설정 실행
 * 1. 토큰 검증
 * 2. 만료 확인
 * 3. 비밀번호 해싱 및 업데이트
 * 4. 토큰 삭제
 */
async function _resetPassword(
  input: { token: string; password: string } | FormData
): Promise<ActionState> {
  try {
    // FormData 또는 객체에서 데이터 추출
    const rawData =
      input instanceof FormData
        ? { token: input.get("token"), password: input.get("password") }
        : input;

    // 유효성 검사
    const parsed = resetPasswordSchema.safeParse(rawData);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        fieldErrors.token?.[0] ||
        fieldErrors.password?.[0] ||
        "입력값을 확인해주세요";

      return {
        success: false,
        message: firstError,
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const { token, password } = parsed.data;

    // 토큰 조회
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return {
        success: false,
        message: "유효하지 않은 재설정 링크입니다",
      };
    }

    // 만료 확인
    if (new Date() > resetToken.expires) {
      // 만료된 토큰 삭제
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      return {
        success: false,
        message: "재설정 링크가 만료되었습니다. 다시 요청해주세요.",
      };
    }

    // 비밀번호 해싱
    const passwordHash = await hashPassword(password);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    // 사용된 토큰 삭제
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return {
      success: true,
      message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.",
    };
  } catch (error) {
    logger.error({ err: error }, "비밀번호 재설정 오류");
    return {
      success: false,
      message: "비밀번호 재설정 중 오류가 발생했습니다",
    };
  }
}
export const resetPassword = withLogging("resetPassword", _resetPassword);
