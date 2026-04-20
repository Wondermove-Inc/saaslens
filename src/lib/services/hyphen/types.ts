/**
 * Korean financial API integration types — Hyphen service (Korean corporate card/banking data aggregator).
 * This module integrates with Korean banking APIs. For other markets, provide an alternative adapter.
 */

/**
 * Hyphen API 타입 정의
 * 법인카드 조회 API (seq=55) 기준
 */

// ==================== 공통 타입 ====================

/** Hyphen API 공통 응답 */
export interface HyphenCommonResponse {
  userTrNo?: string;
  hyphenTrNo?: string;
  errYn: "Y" | "N";
  errCd?: string;
  errMsg?: string;
}

/** Hyphen API 응답 wrapper */
export interface HyphenApiResponse<T> {
  common: HyphenCommonResponse;
  data: T;
}

/** 로그인 방식 */
export type LoginMethod = "ID" | "CERT";

/** 카드사 코드 */
export type CardCompanyCode =
  | "001" // 신한카드
  | "002" // 현대카드
  | "003" // 삼성카드
  | "004" // KB국민카드
  | "005" // 롯데카드
  | "006" // 하나카드
  | "007" // 우리카드
  | "008" // 농협카드
  | "009" // 씨티카드
  | "010" // BC카드
  | "011" // 수협카드
  | "012" // 광주카드
  | "013" // 전북카드
  | "014"; // 제주카드

/** 카드사 정보 */
export const CARD_COMPANIES: Record<CardCompanyCode, string> = {
  "001": "신한카드",
  "002": "현대카드",
  "003": "삼성카드",
  "004": "KB국민카드",
  "005": "롯데카드",
  "006": "하나카드",
  "007": "우리카드",
  "008": "농협카드",
  "009": "씨티카드",
  "010": "BC카드",
  "011": "수협카드",
  "012": "광주카드",
  "013": "전북카드",
  "014": "제주카드",
};

// ==================== 인증 정보 타입 ====================

/** ID 로그인 인증 정보 */
export interface IdLoginCredentials {
  loginMethod: "ID";
  cardNo: string; // 원본 카드번호 (암호화 저장)
  userId: string;
  userPw: string;
  bizNo?: string;
  userIdx?: string; // 롯데카드용
}

/** 인증서 로그인 인증 정보 */
export interface CertLoginCredentials {
  loginMethod: "CERT";
  cardNo: string; // 원본 카드번호 (암호화 저장)
  signCert: string;
  signPri: string;
  signPw: string;
  bizNo?: string;
  userIdx?: string; // 롯데카드용
}

/** 카드사 인증 정보 */
export type CardCredentials = IdLoginCredentials | CertLoginCredentials;

// ==================== 승인내역 조회 ====================

/** 승인내역 조회 요청 */
export interface ApprovalRequest {
  cardCd: CardCompanyCode;
  cardNo: string;
  sdate: string; // YYYYMMDD
  edate: string; // YYYYMMDD
  useArea?: "D" | "G" | "N"; // D:국내, G:해외, N:전체
  svcOption?: "storeDetail"; // 가맹점 상세정보
  viewMethod?: "standard" | "define"; // BC카드용
  cardNoFilter?: "Y" | "N";
}

/** 승인내역 항목 */
export interface ApprovalItem {
  useDt: string; // 사용일자 (YYYYMMDD)
  useTm: string; // 사용시간 (HHmmss)
  apprNo: string; // 승인번호
  useCard: string; // 사용카드명
  useStore: string; // 가맹점명
  useAmt: string; // 사용금액
  useExAmt?: string; // 해외사용금액
  exCurCd?: string; // 해외통화코드
  useDiv: string; // 사용구분 (승인/취소)
  apprSt?: string; // 승인상태
  instMon?: string; // 할부개월
  discAmt?: string; // 할인금액
  savePoint?: string; // 적립포인트
  settleDt?: string; // 결제예정일
  storeBizNo?: string; // 가맹점 사업자번호
  storeCeo?: string; // 가맹점 대표자
  storeAddr?: string; // 가맹점 주소
  storeTel?: string; // 가맹점 전화번호
  storeType?: string; // 가맹점 업종
  addTax?: string; // 부가세
  tip?: string; // 봉사료
  taxType?: string; // 세금유형
  storeSt?: string; // 가맹점 상태
  storeNo?: string; // 가맹점 번호
  givenCardNo?: string; // 부여카드번호
}

/** 승인내역 조회 응답 데이터 */
export interface ApprovalData {
  totalAmt?: string;
  totalCnt?: string;
  list: ApprovalItem[];
}

/** 승인내역 조회 응답 */
export type ApprovalResponse = HyphenApiResponse<ApprovalData>;

// ==================== 매입내역 조회 ====================

/** 매입내역 조회 요청 */
export interface PurchaseRequest {
  cardCd: CardCompanyCode;
  cardNo: string;
  sdate: string; // YYYYMMDD
  edate: string; // YYYYMMDD
  useArea?: "D" | "G" | "N";
  svcOption?: "storeDetail";
  viewMethod?: "standard" | "define";
  cardNoFilter?: "Y" | "N";
}

/** 매입내역 항목 */
export interface PurchaseItem extends ApprovalItem {
  pchDt?: string; // 매입일자
  pchNo?: string; // 매입번호
  virtualYn?: string; // 가상카드 여부
  exYn?: string; // 해외사용 여부
}

/** 매입내역 조회 응답 데이터 */
export interface PurchaseData {
  totalAmt?: string;
  totalCnt?: string;
  list: PurchaseItem[];
}

/** 매입내역 조회 응답 */
export type PurchaseResponse = HyphenApiResponse<PurchaseData>;

// ==================== OAuth 토큰 ====================

/** OAuth 토큰 응답 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// ==================== 에러 타입 ====================

/** Hyphen API 에러 */
export class HyphenApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public response?: HyphenCommonResponse
  ) {
    super(message);
    this.name = "HyphenApiError";
  }
}
