// src/actions/auth-credentials.ts
"use server";

import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { sendVerificationEmail } from "@/lib/services/notification/email-auth";
import { passwordSchema } from "@/lib/validation/password";
import type { ActionState } from "@/types";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  password: passwordSchema,
  name: z.string().min(1, "이름을 입력하세요").max(100, "이름이 너무 깁니다"),
});

export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
}

/**
 * 이메일/비밀번호로 회원가입
 * 1. 이메일 중복 확인
 * 2. 비밀번호 해싱
 * 3. User 생성 (emailVerified = null)
 * 4. 인증 토큰 생성 및 이메일 발송
 */
async function _registerUser(
  input: RegisterUserInput | FormData
): Promise<ActionState> {
  try {
    // FormData 또는 객체에서 데이터 추출
    const rawData =
      input instanceof FormData
        ? {
            email: input.get("email"),
            password: input.get("password"),
            name: input.get("name"),
          }
        : input;

    // 유효성 검사
    const parsed = registerSchema.safeParse(rawData);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        fieldErrors.email?.[0] ||
        fieldErrors.password?.[0] ||
        fieldErrors.name?.[0] ||
        "입력값을 확인해주세요";

      return {
        success: false,
        message: firstError,
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const { email, password, name } = parsed.data;

    // 이메일 중복 확인 (Account 테이블 포함하여 OAuth 사용자 판별)
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          select: { provider: true },
        },
      },
    });

    if (existingUser) {
      // Google OAuth 사용자인 경우
      const googleAccount = existingUser.accounts.find(
        (acc) => acc.provider === "google"
      );

      if (googleAccount) {
        return {
          success: false,
          message: "이미 Google 계정으로 가입되어 있습니다",
          error: "EMAIL_EXISTS_OAUTH_GOOGLE",
        };
      }

      // 이메일/비밀번호 사용자인 경우 (passwordHash가 있는 경우)
      if (existingUser.passwordHash) {
        return {
          success: false,
          message: "이미 가입된 이메일입니다",
          error: "EMAIL_EXISTS_CREDENTIALS",
        };
      }

      // 기타 OAuth 사용자 (Okta, Microsoft 등 - 향후 확장)
      return {
        success: false,
        message: "이미 사용 중인 이메일입니다",
        error: "EMAIL_EXISTS",
      };
    }

    // 비밀번호 해싱
    const passwordHash = await hashPassword(password);

    // User 생성 (emailVerified = null, organizationId = null)
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        emailVerified: null,
      },
    });

    // 인증 토큰 생성 (24시간 유효)
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await prisma.emailVerificationToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    // 인증 이메일 발송
    await sendVerificationEmail({
      to: email,
      token,
      userName: name,
    });

    return {
      success: true,
      message:
        "회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.",
    };
  } catch (error) {
    logger.error({ err: error }, "회원가입 오류");
    return {
      success: false,
      message: "회원가입 중 오류가 발생했습니다",
    };
  }
}
export const registerUser = withLogging("registerUser", _registerUser);

/**
 * 이메일 인증 토큰 검증
 */
async function _verifyEmail(token: string): Promise<ActionState> {
  try {
    // 토큰 조회
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return {
        success: false,
        message: "유효하지 않은 인증 링크입니다",
      };
    }

    // 만료 확인
    if (new Date() > verificationToken.expires) {
      // 만료된 토큰 삭제
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      return {
        success: false,
        message: "인증 링크가 만료되었습니다. 다시 요청해주세요.",
      };
    }

    // User의 emailVerified 업데이트
    await prisma.user.update({
      where: { email: verificationToken.email },
      data: { emailVerified: new Date() },
    });

    // 사용된 토큰 삭제
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    return {
      success: true,
      message: "이메일 인증이 완료되었습니다. 로그인해주세요.",
    };
  } catch (error) {
    logger.error({ err: error }, "이메일 인증 오류");
    return {
      success: false,
      message: "이메일 인증 중 오류가 발생했습니다",
    };
  }
}
export const verifyEmail = withLogging("verifyEmail", _verifyEmail);

/**
 * 인증 이메일 재발송
 */
async function _resendVerificationEmail(email: string): Promise<ActionState> {
  try {
    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 보안상 사용자 존재 여부를 노출하지 않음
      return {
        success: true,
        message: "이메일이 발송되었습니다. 메일함을 확인해주세요.",
      };
    }

    // 이미 인증된 경우
    if (user.emailVerified) {
      return {
        success: false,
        message: "이미 인증된 이메일입니다",
      };
    }

    // 기존 토큰 삭제
    await prisma.emailVerificationToken.deleteMany({
      where: { email },
    });

    // 새 토큰 생성
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await prisma.emailVerificationToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    // 이메일 발송
    await sendVerificationEmail({
      to: email,
      token,
      userName: user.name || undefined,
    });

    return {
      success: true,
      message: "인증 이메일이 발송되었습니다. 메일함을 확인해주세요.",
    };
  } catch (error) {
    logger.error({ err: error }, "인증 이메일 재발송 오류");
    return {
      success: false,
      message: "이메일 발송 중 오류가 발생했습니다",
    };
  }
}
export const resendVerificationEmail = withLogging(
  "resendVerificationEmail",
  _resendVerificationEmail
);
