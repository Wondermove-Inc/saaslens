// src/app/api/v1/extensions/onboarding/verify/route.ts
/**
 * Extension 온보딩 이메일 검증 API
 * 이메일이 조직에 속한 사용자인지 확인
 */

import { withExtensionAuth } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import { onboardingVerifySchema } from "@/types/extension-api";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/extensions/onboarding/verify
 * 이메일 검증: User 테이블 또는 Invitation 확인 + 도메인 매칭
 */
export const POST = withExtensionAuth(
  async (request: NextRequest, { auth }) => {
    try {
      const body = await request.json();
      const parseResult = onboardingVerifySchema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              parseResult.error.errors[0]?.message || "Invalid request body",
          },
          { status: 400 }
        );
      }

      const { email } = parseResult.data;

      // 이메일 도메인 추출
      const emailDomain = email.split("@")[1]?.toLowerCase();
      if (!emailDomain) {
        // 구체적 실패 이유 비노출 (이메일 열거 방지)
        return NextResponse.json({
          success: true,
          data: { verified: false },
        });
      }

      // 조직 도메인 확인
      const org = await prisma.organization.findUnique({
        where: { id: auth.organizationId },
        select: { domain: true, googlePrimaryDomain: true, settings: true },
      });

      if (!org) {
        return NextResponse.json({
          success: true,
          data: { verified: false },
        });
      }

      // 도메인 매칭 (organization.domain, googlePrimaryDomain, 또는 settings.domains)
      const orgDomain = org.domain?.toLowerCase();
      const googleDomain = org.googlePrimaryDomain?.toLowerCase();
      const settings = (org.settings as Record<string, unknown>) || {};
      const additionalDomains = ((settings.domains as string[]) || []).map(
        (d) => d.toLowerCase()
      );
      const domainMatches =
        emailDomain === orgDomain ||
        emailDomain === googleDomain ||
        additionalDomains.includes(emailDomain);

      if (!domainMatches) {
        return NextResponse.json({
          success: true,
          data: { verified: false },
        });
      }

      // 사용자 조회 (조직 내)
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          organizationId: auth.organizationId,
        },
        select: { id: true, name: true },
      });

      if (user) {
        return NextResponse.json({
          success: true,
          data: {
            verified: true,
            userId: user.id,
            userName: user.name,
          },
        });
      }

      // 초대 확인 (PENDING 상태)
      const invitation = await prisma.invitation.findFirst({
        where: {
          email: email.toLowerCase(),
          organizationId: auth.organizationId,
          status: "PENDING",
        },
        select: { id: true },
      });

      if (invitation) {
        return NextResponse.json({
          success: true,
          data: {
            verified: true,
            // 초대된 사용자는 아직 User 레코드가 없을 수 있음
          },
        });
      }

      // 검증 실패 (구체적 이유 비노출)
      return NextResponse.json({
        success: true,
        data: { verified: false },
      });
    } catch (error) {
      console.error("Onboarding verify error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to verify email" },
        { status: 500 }
      );
    }
  }
);
