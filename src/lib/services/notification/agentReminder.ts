// src/lib/services/notification/agentReminder.ts
import { Resend } from "resend";

import { EmailConfig, type EmailResult } from "./email";

// Resend 클라이언트 지연 초기화
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY || "dummy-key-for-build";
    resend = new Resend(apiKey);
  }
  return resend;
}

// 에이전트 설치 리마인더 이메일 파라미터
export interface AgentInstallationReminderParams {
  to: string;
  userName: string | null;
  organizationName: string;
}

/**
 * FleetDM 에이전트 설치 리마인더 이메일 발송
 */
export async function sendAgentInstallationReminderEmail(
  params: AgentInstallationReminderParams
): Promise<EmailResult> {
  const { to, userName, organizationName } = params;

  const displayName = userName || to.split("@")[0];
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const installGuideUrl = `${appUrl}/devices`;

  const subject = `[${organizationName}] FleetDM 에이전트 설치 안내`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">💻 FleetDM 에이전트 설치 안내</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">안녕하세요, <strong>${displayName}</strong>님!</p>

        <p style="font-size: 14px; color: #666;">
          <strong>${organizationName}</strong>에서 IT 자산 관리를 위해 FleetDM 에이전트 설치를 요청드립니다.
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h2 style="margin: 0 0 15px; color: #3b82f6; font-size: 18px;">에이전트란?</h2>
          <p style="margin: 0; color: #666; font-size: 14px;">
            FleetDM 에이전트는 회사에서 사용하는 소프트웨어를 안전하게 관리하고,
            보안 위협으로부터 디바이스를 보호하기 위한 경량 프로그램입니다.
          </p>
        </div>

        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px; color: #1d4ed8; font-size: 16px;">✅ 설치가 필요한 이유</h3>
          <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
            <li>회사 보안 정책 준수</li>
            <li>소프트웨어 라이선스 관리</li>
            <li>IT 지원 효율화</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${installGuideUrl}"
             style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            설치 가이드 보기
          </a>
        </div>

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            ⚠️ 설치가 어려우시면 IT 팀에 문의해 주세요. 원격으로 도움을 드릴 수 있습니다.
          </p>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          감사합니다.<br>
          <strong>${organizationName}</strong> IT 관리팀
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>이 이메일은 ${organizationName}의 IT 자산 관리 시스템에서 자동으로 발송되었습니다.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const client = getResendClient();
    const response = await client.emails.send({
      from: EmailConfig.from,
      to,
      subject,
      html,
    });

    if (response.data?.id) {
      return { success: true, messageId: response.data.id };
    }

    return {
      success: false,
      error: "이메일 발송에 실패했습니다",
    };
  } catch (error) {
    console.error("[sendAgentInstallationReminderEmail] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}
