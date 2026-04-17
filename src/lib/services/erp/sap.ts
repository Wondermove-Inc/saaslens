// src/lib/services/erp/sap.ts
// SAP S/4HANA OData API 어댑터

import { logger } from "@/lib/logger";
import type {
  ERPPaymentAdapter,
  ERPPaymentItem,
  ERPSyncResult,
  SapCredentials,
} from "./types";

/** SAP OData 날짜 포맷 → Date 변환 ("/Date(1743465600000)/" 또는 "2026-04-01") */
function parseSapDate(dateValue: string): Date {
  const timestampMatch = dateValue.match(/\/Date\((\d+)\)\//);
  if (timestampMatch) {
    return new Date(parseInt(timestampMatch[1], 10));
  }
  return new Date(dateValue);
}

/** SAP 비용 계정 필터 (6xxx = 비용, 8xxx = 판관비) */
function isExpenseAccount(glAccount: string): boolean {
  const cleaned = glAccount.replace(/^0+/, "");
  return cleaned.startsWith("6") || cleaned.startsWith("8");
}

/** SAP 금액 파싱 */
function parseAmount(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value.replace(/,/g, "")) || 0;
}

/** OAuth 토큰 캐시 */
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(credentials: SapCredentials): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  // Basic Auth fallback (username/password)
  if (credentials.username && credentials.password) {
    return Buffer.from(
      `${credentials.username}:${credentials.password}`
    ).toString("base64");
  }

  // OAuth2 Client Credentials
  const tokenUrl = `${credentials.baseUrl}/sap/bc/sec/oauth2/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `SAP OAuth failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.accessToken;
}

function buildAuthHeaders(
  credentials: SapCredentials,
  token: string
): Record<string, string> {
  if (credentials.username && credentials.password) {
    return {
      Authorization: `Basic ${token}`,
      Accept: "application/json",
    };
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

/** 재시도 래퍼 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, attempt))
        );
      }
    }
  }
  throw lastError;
}

export const sapAdapter: ERPPaymentAdapter = {
  type: "SAP_S4HANA",
  name: "SAP S/4HANA",

  async testConnection(credentials): Promise<boolean> {
    try {
      const sapCreds = credentials as SapCredentials;
      const token = await getAccessToken(sapCreds);
      const headers = buildAuthHeaders(sapCreds, token);

      const response = await fetch(
        `${sapCreds.baseUrl}/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_JournalEntryItemBasic?$top=1`,
        { headers }
      );
      return response.ok;
    } catch (error) {
      logger.error({ err: error }, "SAP connection test failed");
      return false;
    }
  },

  async fetchPayments(credentials, request): Promise<ERPSyncResult> {
    const sapCreds = credentials as SapCredentials;

    try {
      const token = await getAccessToken(sapCreds);
      const headers = buildAuthHeaders(sapCreds, token);

      const fromDateStr = request.fromDate.toISOString().split("T")[0];
      const toDateStr = request.toDate.toISOString().split("T")[0];

      let filter = `PostingDate ge datetime'${fromDateStr}T00:00:00' and PostingDate le datetime'${toDateStr}T23:59:59'`;
      if (sapCreds.companyCode || request.companyCode) {
        filter += ` and CompanyCode eq '${sapCreds.companyCode || request.companyCode}'`;
      }

      const top = request.maxItems || 1000;
      const url = `${sapCreds.baseUrl}/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_JournalEntryItemBasic?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=CompanyCode,AccountingDocument,PostingDate,GLAccount,GLAccountName,AmountInCompanyCodeCurrency,CompanyCodeCurrency,DocumentItemText,SupplierName`;

      const response = await withRetry(() => fetch(url, { headers }));

      if (!response.ok) {
        return {
          success: false,
          items: [],
          totalCount: 0,
          errorMessage: `SAP API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      const results = data?.d?.results || [];

      const items: ERPPaymentItem[] = results
        .filter((r: Record<string, string>) =>
          isExpenseAccount(r.GLAccount || "")
        )
        .map((r: Record<string, string | number>) => ({
          transactionDate: parseSapDate(String(r.PostingDate)),
          merchantName: String(
            r.SupplierName || r.DocumentItemText || r.GLAccountName || ""
          ),
          amount: parseAmount(r.AmountInCompanyCodeCurrency),
          currency: String(r.CompanyCodeCurrency || "KRW"),
          category: String(r.GLAccountName || ""),
          memo: String(r.DocumentItemText || ""),
          documentNumber: String(r.AccountingDocument || ""),
          rawData: r as Record<string, unknown>,
        }));

      return {
        success: true,
        items,
        totalCount: items.length,
      };
    } catch (error) {
      logger.error({ err: error }, "SAP fetchPayments failed");
      return {
        success: false,
        items: [],
        totalCount: 0,
        errorMessage:
          error instanceof Error ? error.message : "SAP API 호출 실패",
      };
    }
  },
};
