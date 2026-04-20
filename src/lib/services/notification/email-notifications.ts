// src/lib/services/notification/email-notifications.ts
/**
 * 알림 이메일: LLM Confirm 결과, 주간 요약
 */
import type {
  ConfirmationResultEmailParams,
  EmailResult,
  WeeklyDigestEmailParams,
} from "./email.types";
import { EmailConfig, getBaseUrl, getResendClient } from "./email.utils";

/**
 * LLM Confirm 결과 알림
 */
export async function sendConfirmationResultEmail(
  params: ConfirmationResultEmailParams
): Promise<EmailResult> {
  const { to, organizationName, appName, action, confidence, normalizedName } =
    params;

  const isApproved = action === "approved";
  const subject = isApproved
    ? `✅ [확인 완료] ${appName}가 SaaS로 승인되었습니다`
    : `⛔ [확인 완료] ${appName}가 비-SaaS로 차단되었습니다`;

  const confidenceText =
    typeof confidence === "number" ? `${Math.round(confidence * 100)}%` : "N/A";

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${isApproved ? "#22c55e" : "#f97316"} 0%, ${isApproved ? "#16a34a" : "#ea580c"} 100%); padding: 28px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${
          isApproved ? "✅ SaaS 승인" : "⛔ 비-SaaS 차단"
        }</h1>
      </div>

      <div style="background: #f8f9fa; padding: 26px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 15px;">안녕하세요, <strong>${organizationName}</strong> 관리자님!</p>
        <p style="font-size: 14px; color: #555; margin-top: 8px;">
          대시보드의 확인 필요 항목이 처리되었습니다.
        </p>

        <div style="background: white; padding: 18px; border-radius: 8px; margin: 18px 0; border-left: 4px solid ${
          isApproved ? "#22c55e" : "#f97316"
        };">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #666;">앱 이름</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">${appName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">조치</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${
                isApproved ? "#16a34a" : "#ea580c"
              };">${isApproved ? "SaaS 승인 (ACTIVE)" : "비-SaaS 차단 (BLOCKED)"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">신뢰도</td>
              <td style="padding: 6px 0; text-align: right;">${confidenceText}</td>
            </tr>
            ${
              normalizedName
                ? `<tr>
                    <td style="padding: 6px 0; color: #666;">정규화 이름</td>
                    <td style="padding: 6px 0; text-align: right;">${normalizedName}</td>
                  </tr>`
                : ""
            }
          </table>
        </div>

        <p style="font-size: 13px; color: #666;">
          더 많은 확인 작업이 필요한 경우 대시보드의 "확인 필요" 카드에서 처리해 주세요.
        </p>

        <div style="margin-top: 24px; text-align: center;">
          <a href="${getBaseUrl()}/settings/saas-review"
             style="display: inline-block; background: ${
               isApproved ? "#22c55e" : "#ea580c"
             }; color: white; padding: 11px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            확인 내역 보기
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 16px; color: #999; font-size: 12px;">
        <p>이 메일은 SaaS 관리 플랫폼에서 자동 발송되었습니다.</p>
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
 * 주간 요약 이메일 발송
 */
export async function sendWeeklyDigestEmail(
  params: WeeklyDigestEmailParams
): Promise<EmailResult> {
  const { to, organizationName, weekRange, stats } = params;

  const subject = `📊 주간 요약 리포트 (${weekRange})`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%); padding: 26px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">📊 주간 요약 리포트</h1>
        <p style="color: #e0f2fe; margin: 6px 0 0;">${organizationName} &middot; ${weekRange}</p>
      </div>

      <div style="background: #f8fafc; padding: 22px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="font-size: 14px; color: #475569; margin: 0 0 12px;">안녕하세요, <strong>${organizationName}</strong> 관리자님!</p>
        <p style="font-size: 13px; color: #475569; margin: 0 0 18px;">지난 주 SaaS 관리 현황을 요약해드립니다.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">신규 앱 등록</p>
            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #0f172a;">${stats.newApps}건</p>
          </div>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">미매칭 결제</p>
            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #0f172a;">${stats.unmatchedPayments}건</p>
          </div>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">다가오는 갱신</p>
            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #0f172a;">${stats.upcomingRenewals}건</p>
          </div>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">확인 필요 (LLM)</p>
            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #0f172a;">${stats.pendingConfirmations}건</p>
          </div>
        </div>

        <p style="font-size: 13px; color: #475569; margin: 18px 0 0;">
          대시보드에서 세부 항목을 확인하고 조치해 주세요.
        </p>

        <div style="margin-top: 18px; text-align: center;">
          <a href="${getBaseUrl()}/dashboard"
             style="display: inline-block; background: #6366f1; color: white; padding: 11px 26px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            대시보드 열기
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;">
        <p>이 메일은 SaaS 관리 플랫폼에서 자동 발송되었습니다.</p>
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
