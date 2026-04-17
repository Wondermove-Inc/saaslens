// src/lib/services/erp/types.ts
// ERP 연동 어댑터 공통 타입 정의

import type { IntegrationType } from "@prisma/client";

/** ERP에서 가져온 결제/지출 항목 (정규화된 형태) */
export interface ERPPaymentItem {
  transactionDate: Date;
  merchantName: string;
  amount: number;
  currency: string;
  category?: string;
  memo?: string;
  /** ERP 내부 문서 번호 (중복 방지용) */
  documentNumber?: string;
  /** 원본 데이터 */
  rawData: Record<string, unknown>;
}

/** ERP 동기화 결과 */
export interface ERPSyncResult {
  success: boolean;
  items: ERPPaymentItem[];
  totalCount: number;
  errorMessage?: string;
}

/** ERP 동기화 요청 파라미터 */
export interface ERPSyncRequest {
  /** 조회 시작일 */
  fromDate: Date;
  /** 조회 종료일 */
  toDate: Date;
  /** 회사 코드 (SAP) / Business Unit (Oracle) */
  companyCode?: string;
  /** 최대 조회 건수 */
  maxItems?: number;
}

/** SAP S/4HANA 크리덴셜 */
export interface SapCredentials {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
  companyCode?: string;
}

/** Oracle ERP Cloud 크리덴셜 */
export interface OracleCredentials {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  businessUnit?: string;
}

/** 통합 ERP 크리덴셜 타입 */
export type ERPCredentials = SapCredentials | OracleCredentials;

/** ERP 결제 어댑터 인터페이스 */
export interface ERPPaymentAdapter {
  /** 어댑터가 지원하는 IntegrationType */
  readonly type: IntegrationType;
  /** 어댑터 표시명 */
  readonly name: string;
  /** 연결 테스트 */
  testConnection(credentials: ERPCredentials): Promise<boolean>;
  /** 결제/지출 데이터 조회 */
  fetchPayments(
    credentials: ERPCredentials,
    request: ERPSyncRequest
  ): Promise<ERPSyncResult>;
}
