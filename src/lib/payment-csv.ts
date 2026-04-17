// src/lib/payment-csv.ts

import { parseCSV } from "./csv";

// CSV 형식 타입
export type PaymentCSVFormat =
  | "CARD_COMPANY"
  | "CARD_COMPANY_EN"
  | "ERP"
  | "ERP_DUZON_ICUBE"
  | "ERP_DUZON_WEHAGO"
  | "ERP_SAP_FI"
  | "ERP_ORACLE_JOURNAL"
  | "ERP_ECOUNT"
  | "ERP_GENERIC"
  | "CUSTOM"
  | "UNKNOWN";

// ERP 세부 포맷인지 확인하는 헬퍼
export function isERPFormat(format: PaymentCSVFormat): boolean {
  return format === "ERP" || format.startsWith("ERP_") || format === "CUSTOM";
}

// 파싱된 결제 데이터 행
export interface PaymentCSVRow {
  transactionDate: Date;
  merchantName: string;
  amount: number;
  cardLast4?: string;
  approvalNumber?: string;
  category?: string;
  memo?: string;
  rawData: Record<string, string>;
}

// 유효성 검증 오류
export interface PaymentValidationError {
  row: number;
  field: string;
  message: string;
}

// 파싱 결과
export interface PaymentCSVParseResult {
  success: boolean;
  format?: PaymentCSVFormat;
  data?: PaymentCSVRow[];
  errors?: PaymentValidationError[];
  error?: string;
}

// 카드사 CSV 헤더 매핑 (한글)
const CARD_COMPANY_HEADERS = {
  date: ["결제일", "거래일", "이용일", "사용일", "승인일"],
  merchant: ["가맹점명", "상호명", "가맹점", "이용가맹점", "사용처"],
  amount: ["결제금액", "이용금액", "사용금액", "금액", "결제액", "승인금액"],
  cardNumber: ["카드번호"],
  approval: ["승인번호", "승인 번호"],
};

// ERP CSV 헤더 매핑 (기존 범용)
const ERP_HEADERS = {
  date: ["거래일자", "일자", "전표일자"],
  merchant: ["거래처명", "거래처", "상대계정"],
  amount: ["출금액", "지출액", "금액", "차변"],
  category: ["계정과목", "계정", "과목"],
  memo: ["비고", "적요", "메모"],
};

// 더존 iCUBE 헤더 매핑
const ERP_DUZON_ICUBE_HEADERS = {
  date: ["전표일자"],
  debitAccount: ["차변계정코드"],
  debitAccountName: ["차변계정명"],
  creditAccount: ["대변계정코드"],
  creditAccountName: ["대변계정명"],
  memo: ["적요"],
  amount: ["금액"],
  merchantCode: ["거래처코드"],
  merchant: ["거래처명"],
  managementNumber: ["관리번호"],
};

// 더존 WEHAGO 헤더 매핑
const ERP_DUZON_WEHAGO_HEADERS = {
  date: ["전표일자", "일자"],
  debitAccount: ["차변계정코드", "차변코드"],
  debitAccountName: ["차변계정명", "차변과목"],
  creditAccount: ["대변계정코드", "대변코드"],
  creditAccountName: ["대변계정명", "대변과목"],
  memo: ["적요"],
  amount: ["금액"],
  merchant: ["거래처명", "거래처"],
};

// SAP S/4HANA FI 헤더 매핑
const ERP_SAP_FI_HEADERS = {
  date: ["PostingDate", "DocumentDate"],
  glAccount: ["GLAccount"],
  glAccountName: ["GLAccountName"],
  amount: ["AmountInCompanyCodeCurrency", "Amount"],
  currency: ["CompanyCodeCurrency", "Currency"],
  documentText: ["DocumentItemText"],
  supplier: ["SupplierName", "Supplier"],
  companyCode: ["CompanyCode"],
  document: ["AccountingDocument"],
};

// Oracle ERP Cloud Journal 헤더 매핑
const ERP_ORACLE_JOURNAL_HEADERS = {
  date: ["AccountingDate", "JournalDate"],
  debitAmount: ["EnteredDebit", "DebitAmount"],
  creditAmount: ["EnteredCredit", "CreditAmount"],
  accountClass: ["AccountClass", "AccountType"],
  description: ["Description", "LineDescription"],
  currency: ["Currency", "EnteredCurrency"],
  journalName: ["JournalName"],
};

// 이카운트 헤더 매핑
const ERP_ECOUNT_HEADERS = {
  date: ["일자", "날짜"],
  merchant: ["거래처", "거래처명"],
  amount: ["금액", "출금"],
  category: ["계정과목"],
  memo: ["적요", "비고"],
};

// 영문 카드사 CSV 헤더 매핑
const CARD_COMPANY_EN_HEADERS = {
  date: ["Transaction Date", "Date", "Trans Date", "Posted Date"],
  merchant: ["Merchant", "Description", "Merchant Name", "Vendor"],
  amount: ["Amount", "Transaction Amount", "Charge Amount"],
  cardNumber: ["Card Number", "Card No", "Card"],
  approval: ["Approval", "Authorization", "Approval Code"],
};

/**
 * 금액 문자열을 숫자로 파싱
 */
export function parsePaymentAmount(amountStr: string): number {
  if (!amountStr || !amountStr.trim()) {
    return 0;
  }

  let cleaned = amountStr.trim();

  // 회계 표기법 (괄호는 음수)
  const isNegativeParens = /^\(.*\)$/.test(cleaned);
  if (isNegativeParens) {
    cleaned = cleaned.replace(/[()]/g, "");
  }

  // 통화 기호 제거
  cleaned = cleaned.replace(/[₩\\$€£¥]/g, "");
  cleaned = cleaned.replace(/^(USD|KRW|EUR|JPY|GBP)\s*/i, "");
  cleaned = cleaned.replace(/\s*(원|달러|엔)$/g, "");

  // 쉼표 제거
  cleaned = cleaned.replace(/,/g, "");

  // 공백 제거
  cleaned = cleaned.trim();

  const value = parseFloat(cleaned);

  if (isNaN(value)) {
    return 0;
  }

  return isNegativeParens ? -value : value;
}

/**
 * 다양한 날짜 형식을 파싱 (UTC 기준)
 */
export function parsePaymentDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }

  let cleaned = dateStr.trim();

  // YYYY-MM-DD HH:MM:SS 또는 YYYY-MM-DD HH:MM 형식 → 날짜 부분만 추출
  const datetimeMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}/);
  if (datetimeMatch) {
    cleaned = datetimeMatch[1];
  }

  // 한글 날짜 형식: 2025년 12월 26일, 2025년12월26일
  const koreanMatch = cleaned.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    const year = parseInt(koreanMatch[1], 10);
    const month = parseInt(koreanMatch[2], 10) - 1;
    const day = parseInt(koreanMatch[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    return isNaN(date.getTime()) ? null : date;
  }

  // YYYYMMDD (8자리 숫자)
  if (/^\d{8}$/.test(cleaned)) {
    const year = parseInt(cleaned.substring(0, 4), 10);
    const month = parseInt(cleaned.substring(4, 6), 10) - 1;
    const day = parseInt(cleaned.substring(6, 8), 10);
    const date = new Date(Date.UTC(year, month, day));
    return isNaN(date.getTime()) ? null : date;
  }

  // YY.MM.DD
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(cleaned)) {
    const parts = cleaned.split(".");
    const year = 2000 + parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(year, month, day));
    return isNaN(date.getTime()) ? null : date;
  }

  // YYYY.MM.DD
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(cleaned)) {
    const parts = cleaned.split(".");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(year, month, day));
    return isNaN(date.getTime()) ? null : date;
  }

  // YYYY-MM-DD 또는 YYYY/MM/DD
  const standardized = cleaned.replace(/\//g, "-");
  // YYYY-MM-DD 형식인지 확인하고 UTC로 파싱
  if (/^\d{4}-\d{2}-\d{2}$/.test(standardized)) {
    const [year, month, day] = standardized.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return isNaN(date.getTime()) ? null : date;
  }

  // 그 외 형식
  const date = new Date(standardized);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

/**
 * 헤더 매칭 함수
 */
function matchHeader(
  headers: string[],
  patterns: string[]
): string | undefined {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const pattern of patterns) {
    const idx = lowerHeaders.findIndex(
      (h) => h === pattern.toLowerCase() || h.includes(pattern.toLowerCase())
    );
    if (idx !== -1) {
      return headers[idx];
    }
  }
  return undefined;
}

/**
 * CSV 형식 감지 - ERP 벤더별 세분화 포함
 */
export function detectCSVFormat(headers: string[]): PaymentCSVFormat {
  // 카드사 한글 형식 감지
  const hasKoreanDate = matchHeader(headers, CARD_COMPANY_HEADERS.date);
  const hasKoreanMerchant = matchHeader(headers, CARD_COMPANY_HEADERS.merchant);
  const hasKoreanAmount = matchHeader(headers, CARD_COMPANY_HEADERS.amount);

  if (hasKoreanDate && hasKoreanMerchant && hasKoreanAmount) {
    return "CARD_COMPANY";
  }

  // ERP 세분화 감지 (구체적인 벤더부터 매칭)

  // 더존 iCUBE: 차변계정코드 + 대변계정코드가 핵심 식별자
  const hasDuzonDebit = matchHeader(
    headers,
    ERP_DUZON_ICUBE_HEADERS.debitAccount
  );
  const hasDuzonCredit = matchHeader(
    headers,
    ERP_DUZON_ICUBE_HEADERS.creditAccount
  );
  const hasDuzonDate = matchHeader(headers, ERP_DUZON_ICUBE_HEADERS.date);
  if (hasDuzonDebit && hasDuzonCredit && hasDuzonDate) {
    // iCUBE vs WEHAGO 구분: 관리번호 필드가 있으면 iCUBE
    const hasManagementNumber = matchHeader(
      headers,
      ERP_DUZON_ICUBE_HEADERS.managementNumber
    );
    if (hasManagementNumber) {
      return "ERP_DUZON_ICUBE";
    }
    return "ERP_DUZON_WEHAGO";
  }

  // SAP FI: PostingDate + GLAccount가 핵심 식별자
  const hasSAPDate = matchHeader(headers, ERP_SAP_FI_HEADERS.date);
  const hasSAPGL = matchHeader(headers, ERP_SAP_FI_HEADERS.glAccount);
  const hasSAPAmount = matchHeader(headers, ERP_SAP_FI_HEADERS.amount);
  if (hasSAPDate && hasSAPGL && hasSAPAmount) {
    return "ERP_SAP_FI";
  }

  // Oracle Journal: AccountingDate + EnteredDebit/EnteredCredit가 핵심 식별자
  const hasOracleDate = matchHeader(headers, ERP_ORACLE_JOURNAL_HEADERS.date);
  const hasOracleDebit = matchHeader(
    headers,
    ERP_ORACLE_JOURNAL_HEADERS.debitAmount
  );
  const hasOracleCredit = matchHeader(
    headers,
    ERP_ORACLE_JOURNAL_HEADERS.creditAmount
  );
  if (hasOracleDate && (hasOracleDebit || hasOracleCredit)) {
    return "ERP_ORACLE_JOURNAL";
  }

  // 이카운트: 범용 ERP와 유사하지만 계정과목 + 적요 조합으로 구분
  const hasEcountDate = matchHeader(headers, ERP_ECOUNT_HEADERS.date);
  const hasEcountMerchant = matchHeader(headers, ERP_ECOUNT_HEADERS.merchant);
  const hasEcountAmount = matchHeader(headers, ERP_ECOUNT_HEADERS.amount);
  const hasEcountCategory = matchHeader(headers, ERP_ECOUNT_HEADERS.category);
  if (
    hasEcountDate &&
    hasEcountMerchant &&
    hasEcountAmount &&
    hasEcountCategory
  ) {
    return "ERP_ECOUNT";
  }

  // 범용 ERP 형식 감지 (기존 로직)
  const hasERPDate = matchHeader(headers, ERP_HEADERS.date);
  const hasERPMerchant = matchHeader(headers, ERP_HEADERS.merchant);
  const hasERPAmount = matchHeader(headers, ERP_HEADERS.amount);

  if (hasERPDate && hasERPMerchant && hasERPAmount) {
    return "ERP";
  }

  // 영문 카드사 형식 감지
  const hasEnDate = matchHeader(headers, CARD_COMPANY_EN_HEADERS.date);
  const hasEnMerchant = matchHeader(headers, CARD_COMPANY_EN_HEADERS.merchant);
  const hasEnAmount = matchHeader(headers, CARD_COMPANY_EN_HEADERS.amount);

  if (hasEnDate && hasEnMerchant && hasEnAmount) {
    return "CARD_COMPANY_EN";
  }

  return "UNKNOWN";
}

/**
 * 카드 번호에서 마지막 4자리 추출
 */
function extractCardLast4(cardNumber: string | undefined): string | undefined {
  if (!cardNumber) return undefined;

  // 숫자만 추출
  const digits = cardNumber.replace(/\D/g, "");

  if (digits.length >= 4) {
    return digits.slice(-4);
  }

  return undefined;
}

/**
 * 원본 데이터를 정규화된 형식으로 변환
 */
export function normalizePaymentData(
  row: Record<string, string>,
  format: PaymentCSVFormat
): PaymentCSVRow | null {
  const headers = Object.keys(row);

  let dateField: string | undefined;
  let merchantField: string | undefined;
  let amountField: string | undefined;
  let cardField: string | undefined;
  let approvalField: string | undefined;
  let categoryField: string | undefined;
  let memoField: string | undefined;

  switch (format) {
    case "CARD_COMPANY":
      dateField = matchHeader(headers, CARD_COMPANY_HEADERS.date);
      merchantField = matchHeader(headers, CARD_COMPANY_HEADERS.merchant);
      amountField = matchHeader(headers, CARD_COMPANY_HEADERS.amount);
      cardField = matchHeader(headers, CARD_COMPANY_HEADERS.cardNumber);
      approvalField = matchHeader(headers, CARD_COMPANY_HEADERS.approval);
      break;

    case "ERP":
    case "ERP_GENERIC":
    case "ERP_ECOUNT":
      dateField = matchHeader(headers, ERP_HEADERS.date);
      merchantField = matchHeader(headers, ERP_HEADERS.merchant);
      amountField = matchHeader(headers, ERP_HEADERS.amount);
      categoryField = matchHeader(headers, ERP_HEADERS.category);
      memoField = matchHeader(headers, ERP_HEADERS.memo);
      break;

    case "ERP_DUZON_ICUBE":
    case "ERP_DUZON_WEHAGO":
      dateField = matchHeader(headers, ERP_DUZON_ICUBE_HEADERS.date);
      merchantField = matchHeader(headers, ERP_DUZON_ICUBE_HEADERS.merchant);
      amountField = matchHeader(headers, ERP_DUZON_ICUBE_HEADERS.amount);
      memoField = matchHeader(headers, ERP_DUZON_ICUBE_HEADERS.memo);
      // 차변계정명을 category로 매핑
      categoryField = matchHeader(
        headers,
        ERP_DUZON_ICUBE_HEADERS.debitAccountName
      );
      break;

    case "ERP_SAP_FI":
      dateField = matchHeader(headers, ERP_SAP_FI_HEADERS.date);
      merchantField = matchHeader(headers, ERP_SAP_FI_HEADERS.supplier);
      amountField = matchHeader(headers, ERP_SAP_FI_HEADERS.amount);
      categoryField = matchHeader(headers, ERP_SAP_FI_HEADERS.glAccountName);
      memoField = matchHeader(headers, ERP_SAP_FI_HEADERS.documentText);
      break;

    case "ERP_ORACLE_JOURNAL":
      dateField = matchHeader(headers, ERP_ORACLE_JOURNAL_HEADERS.date);
      merchantField = matchHeader(
        headers,
        ERP_ORACLE_JOURNAL_HEADERS.description
      );
      amountField = matchHeader(
        headers,
        ERP_ORACLE_JOURNAL_HEADERS.debitAmount
      );
      categoryField = matchHeader(
        headers,
        ERP_ORACLE_JOURNAL_HEADERS.accountClass
      );
      break;

    case "CUSTOM":
      // CUSTOM 포맷은 외부에서 매핑 설정을 제공해야 하므로 여기서는 기본 ERP 로직 사용
      dateField = matchHeader(headers, ERP_HEADERS.date);
      merchantField = matchHeader(headers, ERP_HEADERS.merchant);
      amountField = matchHeader(headers, ERP_HEADERS.amount);
      categoryField = matchHeader(headers, ERP_HEADERS.category);
      memoField = matchHeader(headers, ERP_HEADERS.memo);
      break;

    case "CARD_COMPANY_EN":
      dateField = matchHeader(headers, CARD_COMPANY_EN_HEADERS.date);
      merchantField = matchHeader(headers, CARD_COMPANY_EN_HEADERS.merchant);
      amountField = matchHeader(headers, CARD_COMPANY_EN_HEADERS.amount);
      cardField = matchHeader(headers, CARD_COMPANY_EN_HEADERS.cardNumber);
      approvalField = matchHeader(headers, CARD_COMPANY_EN_HEADERS.approval);
      break;

    default:
      return null;
  }

  if (!dateField || !merchantField || !amountField) {
    return null;
  }

  const transactionDate = parsePaymentDate(row[dateField]);
  const merchantName = row[merchantField]?.trim();
  const amount = parsePaymentAmount(row[amountField]);

  if (!transactionDate || !merchantName) {
    return null;
  }

  const result: PaymentCSVRow = {
    transactionDate,
    merchantName,
    amount,
    rawData: row,
  };

  if (cardField && row[cardField]) {
    result.cardLast4 = extractCardLast4(row[cardField]);
  }

  if (approvalField && row[approvalField]) {
    result.approvalNumber = row[approvalField].trim();
  }

  if (categoryField && row[categoryField]) {
    result.category = row[categoryField].trim();
  }

  if (memoField && row[memoField]) {
    result.memo = row[memoField].trim();
  }

  return result;
}

/**
 * CSV 행을 스캔하여 실제 헤더 행 인덱스를 찾는다.
 * 은행 명세서처럼 상단에 제목/요약 행이 있는 경우를 처리한다.
 */
function findHeaderRow(lines: string[], maxScanRows: number = 20): number {
  const headerKeywords = [
    ...CARD_COMPANY_HEADERS.date,
    ...CARD_COMPANY_HEADERS.merchant,
    ...CARD_COMPANY_HEADERS.amount,
    ...ERP_HEADERS.date,
    ...ERP_HEADERS.merchant,
    ...ERP_HEADERS.amount,
    ...ERP_DUZON_ICUBE_HEADERS.date,
    ...ERP_DUZON_ICUBE_HEADERS.debitAccount,
    ...ERP_SAP_FI_HEADERS.date,
    ...ERP_SAP_FI_HEADERS.glAccount,
    ...ERP_ORACLE_JOURNAL_HEADERS.date,
    ...ERP_ORACLE_JOURNAL_HEADERS.debitAmount,
    ...CARD_COMPANY_EN_HEADERS.date,
    ...CARD_COMPANY_EN_HEADERS.merchant,
    ...CARD_COMPANY_EN_HEADERS.amount,
  ];

  const limit = Math.min(lines.length, maxScanRows);
  for (let i = 0; i < limit; i++) {
    const line = lines[i].toLowerCase();
    const matchCount = headerKeywords.filter((kw) =>
      line.includes(kw.toLowerCase())
    ).length;
    if (matchCount >= 2) {
      return i;
    }
  }
  return 0;
}

/**
 * 결제 CSV 파싱 메인 함수
 */
export function parsePaymentCSV(csvContent: string): PaymentCSVParseResult {
  // UTF-8 BOM 제거
  let content = csvContent;
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.substring(1);
  }

  if (!content.trim()) {
    return {
      success: false,
      error: "빈 CSV 파일입니다",
    };
  }

  // 헤더 행 자동 탐색 (은행 명세서 등 상단 비데이터 행 스킵)
  const lines = content.split(/\r?\n/);
  const headerRowIndex = findHeaderRow(lines);
  const effectiveContent =
    headerRowIndex > 0 ? lines.slice(headerRowIndex).join("\n") : content;

  // 기존 CSV 파서 사용
  const rows = parseCSV(effectiveContent);

  if (rows.length === 0) {
    return {
      success: false,
      error: "데이터가 없습니다",
    };
  }

  // 헤더 추출 (첫 번째 행의 키들)
  const headers = Object.keys(rows[0]);

  // 형식 감지
  const format = detectCSVFormat(headers);

  if (format === "UNKNOWN") {
    return {
      success: false,
      error: "지원하지 않는 CSV 형식입니다",
    };
  }

  // 데이터 정규화 및 유효성 검증
  const data: PaymentCSVRow[] = [];
  const errors: PaymentValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 1;

    const normalized = normalizePaymentData(row, format);

    if (!normalized) {
      // 필수 필드 누락 체크
      const headersList = Object.keys(row);
      let dateField: string | undefined;
      let merchantField: string | undefined;

      if (format === "CARD_COMPANY") {
        dateField = matchHeader(headersList, CARD_COMPANY_HEADERS.date);
        merchantField = matchHeader(headersList, CARD_COMPANY_HEADERS.merchant);
      } else if (isERPFormat(format)) {
        // ERP 계열 포맷은 벤더별 헤더를 사용하되, 범용 ERP 헤더로 폴백
        if (format === "ERP_DUZON_ICUBE" || format === "ERP_DUZON_WEHAGO") {
          dateField = matchHeader(headersList, ERP_DUZON_ICUBE_HEADERS.date);
          merchantField = matchHeader(
            headersList,
            ERP_DUZON_ICUBE_HEADERS.merchant
          );
        } else if (format === "ERP_SAP_FI") {
          dateField = matchHeader(headersList, ERP_SAP_FI_HEADERS.date);
          merchantField = matchHeader(headersList, ERP_SAP_FI_HEADERS.supplier);
        } else if (format === "ERP_ORACLE_JOURNAL") {
          dateField = matchHeader(headersList, ERP_ORACLE_JOURNAL_HEADERS.date);
          merchantField = matchHeader(
            headersList,
            ERP_ORACLE_JOURNAL_HEADERS.description
          );
        } else {
          dateField = matchHeader(headersList, ERP_HEADERS.date);
          merchantField = matchHeader(headersList, ERP_HEADERS.merchant);
        }
      } else if (format === "CARD_COMPANY_EN") {
        dateField = matchHeader(headersList, CARD_COMPANY_EN_HEADERS.date);
        merchantField = matchHeader(
          headersList,
          CARD_COMPANY_EN_HEADERS.merchant
        );
      }

      if (dateField && !parsePaymentDate(row[dateField])) {
        errors.push({
          row: rowNum,
          field: "date",
          message: `${rowNum}행: 유효하지 않은 날짜 형식입니다`,
        });
      }

      if (merchantField && !row[merchantField]?.trim()) {
        errors.push({
          row: rowNum,
          field: "merchant",
          message: `${rowNum}행: 가맹점명이 필요합니다`,
        });
      }

      return;
    }

    data.push(normalized);
  });

  return {
    success: true,
    format,
    data,
    errors: errors.length > 0 ? errors : undefined,
  };
}
