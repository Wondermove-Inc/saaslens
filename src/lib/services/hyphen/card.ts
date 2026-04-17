/**
 * Hyphen 법인카드 API 서비스
 */
import { createAuthHeaders } from "./auth";
import {
  ApprovalRequest,
  ApprovalResponse,
  CardCredentials,
  HyphenApiError,
  HyphenApiResponse,
  PurchaseRequest,
  PurchaseResponse,
} from "./types";

const HYPHEN_API_BASE = "https://api.hyphen.im";

// API 엔드포인트
const ENDPOINTS = {
  CARD_APPROVAL: "/in0007000559", // 승인내역 조회
  CARD_PURCHASE: "/in0007000561", // 매입내역 조회
};

/**
 * Hyphen API 응답 처리
 * @param response API 응답
 * @throws HyphenApiError 에러 발생 시
 */
function handleResponse<T>(response: HyphenApiResponse<T>): T {
  if (response.common.errYn === "Y") {
    throw new HyphenApiError(
      response.common.errCd || "UNKNOWN",
      response.common.errMsg || "알 수 없는 오류가 발생했습니다",
      response.common
    );
  }
  return response.data;
}

/**
 * 카드 승인내역 조회
 * @param request 조회 조건
 * @param credentials 카드사 인증 정보
 */
export async function getCardApprovals(
  request: ApprovalRequest,
  credentials: CardCredentials
): Promise<ApprovalResponse> {
  const body = {
    ...credentials,
    ...request,
    // 카드번호에서 하이픈 제거
    cardNo:
      credentials.cardNo?.replace(/-/g, "") ||
      request.cardNo?.replace(/-/g, ""),
  };

  const headers = createAuthHeaders();

  const response = await fetch(`${HYPHEN_API_BASE}${ENDPOINTS.CARD_APPROVAL}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data: ApprovalResponse = await response.json();

  if (!response.ok) {
    throw new HyphenApiError(
      "API_REQUEST_FAILED",
      `승인내역 조회 요청 실패: ${response.status} ${response.statusText}`
    );
  }

  // 에러 체크
  handleResponse(data);

  return data;
}

/**
 * 카드 매입내역 조회
 * @param request 조회 조건
 * @param credentials 카드사 인증 정보
 */
export async function getCardPurchases(
  request: PurchaseRequest,
  credentials: CardCredentials
): Promise<PurchaseResponse> {
  const body = {
    ...credentials,
    ...request,
    // 카드번호에서 하이픈 제거
    cardNo:
      credentials.cardNo?.replace(/-/g, "") ||
      request.cardNo?.replace(/-/g, ""),
  };

  const headers = createAuthHeaders();

  const response = await fetch(`${HYPHEN_API_BASE}${ENDPOINTS.CARD_PURCHASE}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data: PurchaseResponse = await response.json();

  if (!response.ok) {
    throw new HyphenApiError(
      "API_REQUEST_FAILED",
      `매입내역 조회 요청 실패: ${response.status} ${response.statusText}`
    );
  }

  // 에러 체크
  handleResponse(data);

  return data;
}

/**
 * 날짜 문자열 생성 (YYYYMMDD 형식)
 * @param date Date 객체
 */
export function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 이번 달 시작일 ~ 오늘 기간 반환
 */
export function getCurrentMonthRange(): { sdate: string; edate: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    sdate: formatDateYYYYMMDD(startOfMonth),
    edate: formatDateYYYYMMDD(now),
  };
}

/**
 * 지난 N일 기간 반환
 * @param days 일수
 */
export function getLastNDaysRange(days: number): {
  sdate: string;
  edate: string;
} {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  return {
    sdate: formatDateYYYYMMDD(startDate),
    edate: formatDateYYYYMMDD(now),
  };
}

/**
 * 재시도 로직이 포함된 API 호출 wrapper
 * @param operation 실행할 API 호출 함수
 * @param maxRetries 최대 재시도 횟수
 * @param delayMs 재시도 간 대기 시간
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // HyphenApiError이고 재시도 가능한 에러인 경우에만 재시도
      if (error instanceof HyphenApiError) {
        const retryableCodes = ["TIMEOUT", "API_REQUEST_FAILED"];
        if (!retryableCodes.includes(error.code)) {
          throw error;
        }
      }

      if (attempt < maxRetries) {
        await delay(delayMs * attempt); // 지수 백오프
      }
    }
  }

  throw lastError || new Error("알 수 없는 오류");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
