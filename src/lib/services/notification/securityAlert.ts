// src/lib/services/notification/securityAlert.ts
import { Resend } from "resend";

// Resend 클라이언트 지연 초기화 (빌드 타임에 환경변수 없어도 동작)
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY || "dummy-key-for-build";
    resend = new Resend(apiKey);
  }
  return resend;
}

// 이메일 설정
const EmailConfig = {
  fromEmail: process.env.EMAIL_FROM || "noreply@saas-mgmt.com",
  fromName: process.env.EMAIL_FROM_NAME || "SaaS 관리 플랫폼",
  get from() {
    return `${this.fromName} <${this.fromEmail}>`;
  },
};

// 결과 타입
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Shadow IT 알림 파라미터
export interface ShadowITAlertParams {
  to: string;
  organizationName: string;
  shadowApps: Array<{
    name: string;
    detectedAt: Date;
    source: string;
  }>;
}

// 비용 이상 알림 파라미터
export interface CostAnomalyAlertParams {
  to: string;
  organizationName: string;
  appName: string;
  previousCost: number;
  currentCost: number;
  percentageIncrease: number;
  currency: string;
  period: string;
}

// 금액 포맷팅
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

// 날짜 포맷팅
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// 소스 라벨 변환
function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    card: "카드 결제",
    sso: "SSO 로그인",
    fleetdm: "FleetDM",
    manual: "수동 등록",
  };
  return labels[source] || source;
}

// Shadow IT 알림 이메일 발송
export async function sendShadowITAlertEmail(
  params: ShadowITAlertParams
): Promise<EmailResult> {
  const { to, organizationName, shadowApps } = params;

  const subject = `🚨 [Shadow IT 경고] 승인되지 않은 SaaS ${shadowApps.length}건 탐지`;

  const appListHtml = shadowApps
    .map(
      (app) =>
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">${app.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">${formatDate(app.detectedAt)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">${getSourceLabel(app.source)}</td>
        </tr>`
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
      <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Shadow IT 경고</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">안녕하세요, <strong>${organizationName}</strong> 관리자님!</p>

        <div style="background: #fff3f3; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
          <p style="margin: 0; color: #c0392b; font-weight: bold;">
            조직 내에서 승인되지 않은 SaaS 앱 ${shadowApps.length}건이 탐지되었습니다.
          </p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; overflow: hidden;">
          <h3 style="margin: 0 0 15px; color: #e74c3c;">탐지된 앱 목록</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">앱 이름</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">탐지일</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">탐지 소스</th>
              </tr>
            </thead>
            <tbody>
              ${appListHtml}
            </tbody>
          </table>
        </div>

        <div style="background: #fff9e6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f1c40f;">
          <h4 style="margin: 0 0 10px; color: #d35400;">⚠️ 권장 조치</h4>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li style="margin-bottom: 8px;">해당 앱의 사용 목적과 필요성을 확인하세요</li>
            <li style="margin-bottom: 8px;">보안 정책 준수 여부를 검토하세요</li>
            <li style="margin-bottom: 8px;">필요시 공식 앱으로 등록하거나 사용을 차단하세요</li>
          </ul>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/apps"
             style="display: inline-block; background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            앱 관리 바로가기
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>이 메일은 SaaS 관리 플랫폼에서 자동 발송되었습니다.</p>
        <p>© ${new Date().getFullYear()} SaaS Management Platform</p>
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

// 비용 이상 알림 이메일 발송
export async function sendCostAnomalyAlertEmail(
  params: CostAnomalyAlertParams
): Promise<EmailResult> {
  const {
    to,
    organizationName,
    appName,
    previousCost,
    currentCost,
    percentageIncrease,
    currency,
    period,
  } = params;

  const isCritical = percentageIncrease >= 100;
  const urgencyEmoji = isCritical ? "🚨" : "⚠️";
  const subject = `${urgencyEmoji} [비용 이상 감지] ${appName} - ${percentageIncrease}% 증가`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${isCritical ? "#e74c3c 0%, #c0392b" : "#f39c12 0%, #d68910"} 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${urgencyEmoji} 비용 이상 감지</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">안녕하세요, <strong>${organizationName}</strong> 관리자님!</p>

        <div style="background: ${isCritical ? "#fff3f3" : "#fff9e6"}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isCritical ? "#e74c3c" : "#f1c40f"};">
          <p style="margin: 0; color: ${isCritical ? "#c0392b" : "#d35400"}; font-weight: bold;">
            ${appName}의 비용이 전월 대비 ${percentageIncrease}% 증가했습니다.
          </p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isCritical ? "#e74c3c" : "#f1c40f"};">
          <h2 style="margin: 0 0 15px; color: ${isCritical ? "#e74c3c" : "#f39c12"};">${appName}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; color: #666;">기간</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold;">${period}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #666;">이전 비용</td>
              <td style="padding: 12px 0; text-align: right;">${formatCurrency(previousCost, currency)}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #666;">현재 비용</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: ${isCritical ? "#e74c3c" : "#f39c12"};">${formatCurrency(currentCost, currency)}</td>
            </tr>
            <tr style="background: #f8f9fa;">
              <td style="padding: 12px; color: #666; font-weight: bold;">증가율</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: ${isCritical ? "#e74c3c" : "#f39c12"};">+${percentageIncrease}%</td>
            </tr>
          </table>
        </div>

        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
          <h4 style="margin: 0 0 10px; color: #2980b9;">💡 확인 사항</h4>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li style="margin-bottom: 8px;">사용자 수 또는 라이선스 추가 여부 확인</li>
            <li style="margin-bottom: 8px;">요금제 변경 여부 확인</li>
            <li style="margin-bottom: 8px;">비정상적인 사용 패턴 검토</li>
          </ul>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reports/cost"
             style="display: inline-block; background: ${isCritical ? "#e74c3c" : "#f39c12"}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            비용 리포트 바로가기
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>이 메일은 SaaS 관리 플랫폼에서 자동 발송되었습니다.</p>
        <p>© ${new Date().getFullYear()} SaaS Management Platform</p>
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
