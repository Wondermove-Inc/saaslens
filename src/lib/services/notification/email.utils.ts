// src/lib/services/notification/email.utils.ts
import { Resend } from "resend";

// Resend 클라이언트 지연 초기화 (빌드 타임에 환경변수 없어도 동작)
let resend: Resend | null = null;

export function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY || "dummy-key-for-build";
    resend = new Resend(apiKey);
  }
  return resend;
}

/**
 * 이메일 설정
 */
export const EmailConfig = {
  fromEmail: process.env.EMAIL_FROM || "noreply@saas-mgmt.com",
  fromName: process.env.EMAIL_FROM_NAME || "SaaS 관리 플랫폼",
  get from() {
    return `${this.fromName} <${this.fromEmail}>`;
  },
};

/**
 * 금액 포맷팅
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * 기본 URL 가져오기
 */
export function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}
