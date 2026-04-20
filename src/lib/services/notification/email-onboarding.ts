// src/lib/services/notification/email-onboarding.ts
/**
 * 온보딩 이메일: 환영, 초대, Extension 온보딩 안내
 */
import type {
  EmailResult,
  ExtensionOnboardingGuideEmailParams,
  InvitationEmailParams,
  WelcomeEmailParams,
} from "./email.types";
import { EmailConfig, getBaseUrl, getResendClient } from "./email.utils";

/**
 * 환영 이메일 발송
 */
export async function sendWelcomeEmail(
  params: WelcomeEmailParams
): Promise<EmailResult> {
  const { to, userName, organizationName } = params;

  const subject = `🎉 ${organizationName}에 오신 것을 환영합니다!`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 환영합니다!</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px;">안녕하세요, <strong>${userName}</strong>님!</p>

        <p style="font-size: 16px;">
          <strong>${organizationName}</strong>의 SaaS 관리 플랫폼에 가입해 주셔서 감사합니다.
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px; color: #667eea;">🚀 시작하기</h3>
          <ul style="padding-left: 20px; color: #666;">
            <li style="margin-bottom: 10px;">SSO/IdP를 연동하여 SaaS 앱을 자동으로 발견하세요</li>
            <li style="margin-bottom: 10px;">구독 정보를 등록하고 갱신 알림을 받아보세요</li>
            <li style="margin-bottom: 10px;">퇴사자 계정을 추적하여 보안을 강화하세요</li>
          </ul>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${getBaseUrl()}/dashboard"
             style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            대시보드 바로가기
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>궁금한 점이 있으시면 언제든지 문의해 주세요.</p>
        <p>&copy; ${new Date().getFullYear()} SaaS Management Platform</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: EmailConfig.from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "이메일 발송 실패",
    };
  }
}

/**
 * Extension 온보딩 안내 이메일 발송
 */
export async function sendExtensionOnboardingGuideEmail(
  params: ExtensionOnboardingGuideEmailParams
): Promise<EmailResult> {
  const { to, userName, orgName } = params;

  const subject = `🚀 ${orgName} Chrome Extension 온보딩 안내`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 26px;">🔌 Extension 온보딩 안내</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px;">안녕하세요, <strong>${userName}</strong>님!</p>

        <p style="font-size: 16px;">
          <strong>${orgName}</strong>에서 Chrome Extension이 배포되었습니다.<br>
          Extension을 설정하여 SaaS 사용 현황 모니터링을 시작해보세요.
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5;">
          <h3 style="margin: 0 0 15px; color: #4F46E5;">📋 Extension 시작하기</h3>
          <ol style="padding-left: 20px; color: #555;">
            <li style="margin-bottom: 10px;">Chrome 브라우저에서 Extension이 설치되어 있는지 확인하세요</li>
            <li style="margin-bottom: 10px;">Extension 아이콘을 클릭하여 온보딩 화면을 진행하세요</li>
            <li style="margin-bottom: 10px;">회사 이메일 계정으로 인증을 완료하세요</li>
          </ol>
        </div>

        <div style="background: #EEF2FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #4338CA;">
            💡 <strong>참고</strong>: Extension은 업무용 SaaS 앱 접속 현황을 자동으로 수집합니다.
            개인 정보는 수집되지 않으며, 회사 정책에 따라 운영됩니다.
          </p>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${getBaseUrl()}/dashboard"
             style="display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            대시보드 바로가기
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>이 메일은 ${orgName} 관리자에 의해 발송되었습니다.</p>
        <p>&copy; ${new Date().getFullYear()} SaaS Management Platform</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: EmailConfig.from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "이메일 발송 실패",
    };
  }
}

/**
 * 초대 이메일 발송
 */
export async function sendInvitationEmail(
  params: InvitationEmailParams
): Promise<EmailResult> {
  const {
    email,
    token,
    organizationName = "조직",
    inviterName = "관리자",
    role = "MEMBER",
  } = params;

  const roleLabels: Record<string, string> = {
    ADMIN: "관리자",
    MEMBER: "멤버",
    VIEWER: "뷰어",
  };

  const roleLabel = roleLabels[role] || "멤버";
  const inviteUrl = `${getBaseUrl()}/invite/${token}`;

  const subject = `📩 ${organizationName}에서 초대가 도착했습니다`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📩 팀 초대</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">안녕하세요!</p>

        <p style="font-size: 16px;">
          <strong>${inviterName}</strong>님이 <strong>${organizationName}</strong>의
          SaaS 관리 플랫폼에 <strong>${roleLabel}</strong>로 초대했습니다.
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin: 0 0 15px; color: #667eea;">🚀 SaaS 관리 플랫폼에서 할 수 있는 것</h3>
          <ul style="padding-left: 20px; color: #666;">
            <li style="margin-bottom: 10px;">조직의 SaaS 앱을 한눈에 파악</li>
            <li style="margin-bottom: 10px;">구독 비용 및 갱신일 관리</li>
            <li style="margin-bottom: 10px;">사용자별 앱 접근 권한 추적</li>
          </ul>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${inviteUrl}"
             style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            초대 수락하기
          </a>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
          이 초대는 7일 후 만료됩니다.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>이 메일은 SaaS 관리 플랫폼에서 자동 발송되었습니다.</p>
        <p>&copy; ${new Date().getFullYear()} SaaS Management Platform</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: EmailConfig.from,
      to: [email],
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "이메일 발송 실패",
    };
  }
}
