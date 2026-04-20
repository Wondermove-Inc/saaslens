// src/lib/services/notification/email-alerts.ts
/**
 * 알림 이메일: 갱신 알림, 퇴사자 계정 알림
 */
import type {
  EmailResult,
  RenewalAlertEmailParams,
  TerminatedUserAlertParams,
} from "./email.types";
import {
  EmailConfig,
  formatCurrency,
  formatDate,
  getBaseUrl,
  getResendClient,
} from "./email.utils";

/**
 * 갱신 알림 이메일 발송
 */
export async function sendRenewalAlertEmail(
  params: RenewalAlertEmailParams
): Promise<EmailResult> {
  const {
    to,
    appName,
    renewalDate,
    daysUntilRenewal,
    amount,
    currency,
    organizationName,
  } = params;

  const urgencyText =
    daysUntilRenewal <= 30
      ? "⚠️ 긴급"
      : daysUntilRenewal <= 60
        ? "📅 알림"
        : "📋 사전 안내";

  const subject = `${urgencyText} [${appName}] 구독 갱신 ${daysUntilRenewal}일 전`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔔 구독 갱신 알림</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">안녕하세요, <strong>${organizationName}</strong> 관리자님!</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h2 style="margin: 0 0 15px; color: #667eea;">${appName}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">갱신일</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatDate(renewalDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">남은 기간</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${daysUntilRenewal <= 30 ? "#e74c3c" : "#667eea"};">${daysUntilRenewal}일</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">갱신 금액</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatCurrency(amount, currency)}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #666;">
          구독 갱신 여부를 검토하시고, 필요한 경우 플랫폼에서 구독 설정을 변경해 주세요.
        </p>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${getBaseUrl()}/subscriptions"
             style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            구독 관리 바로가기
          </a>
        </div>
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
 * 퇴사자 미회수 계정 알림 이메일 발송
 */
export async function sendTerminatedUserAlertEmail(
  params: TerminatedUserAlertParams
): Promise<EmailResult> {
  const {
    to,
    terminatedUserName,
    terminatedUserEmail,
    unrevokedApps,
    terminatedAt,
    organizationName,
  } = params;

  const subject = `⚠️ [${terminatedUserName}] 퇴사자 미회수 계정 ${unrevokedApps.length}건 발견`;

  const appListHtml = unrevokedApps
    .map(
      (app) =>
        `<li style="margin-bottom: 8px; padding: 10px; background: #fff3f3; border-radius: 4px; border-left: 3px solid #e74c3c;">${app}</li>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ 퇴사자 계정 알림</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">안녕하세요, <strong>${organizationName}</strong> 관리자님!</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
          <h2 style="margin: 0 0 15px; color: #e74c3c;">퇴사자 정보</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">이름</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${terminatedUserName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">이메일</td>
              <td style="padding: 8px 0; text-align: right;">${terminatedUserEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">퇴사일</td>
              <td style="padding: 8px 0; text-align: right;">${formatDate(terminatedAt)}</td>
            </tr>
          </table>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px; color: #e74c3c;">🔓 미회수 계정 목록 (${unrevokedApps.length}건)</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${appListHtml}
          </ul>
        </div>

        <p style="font-size: 14px; color: #e74c3c; font-weight: bold;">
          보안을 위해 해당 계정들을 즉시 회수해 주세요!
        </p>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${getBaseUrl()}/users"
             style="display: inline-block; background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            계정 관리 바로가기
          </a>
        </div>
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
