// src/lib/services/erp/oracle.ts
// Oracle ERP Cloud REST API 어댑터

import { logger } from "@/lib/logger";
import type {
  ERPPaymentAdapter,
  ERPPaymentItem,
  ERPSyncResult,
  OracleCredentials,
} from "./types";

/** Oracle 금액 파싱 */
function parseAmount(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return parseFloat(value.replace(/,/g, "")) || 0;
}

/** Oracle 비용 계정 필터 */
function isExpenseAccount(accountClass: string): boolean {
  const upper = accountClass.toUpperCase();
  return upper === "EXPENSE" || upper === "EXP";
}

/** OAuth 토큰 캐시 */
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(credentials: OracleCredentials): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const tokenUrl = `${credentials.baseUrl}/fscmRestApi/tokenService`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: credentials.scope || "urn:opc:resource:consumer::all",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Oracle OAuth failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return tokenCache.accessToken;
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

export const oracleAdapter: ERPPaymentAdapter = {
  type: "ORACLE_ERP_CLOUD",
  name: "Oracle ERP Cloud",

  async testConnection(credentials): Promise<boolean> {
    try {
      const oracleCreds = credentials as OracleCredentials;
      const token = await getAccessToken(oracleCreds);

      const response = await fetch(
        `${oracleCreds.baseUrl}/fscmRestApi/resources/11.13.18.05/generalLedgerJournals?limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      return response.ok;
    } catch (error) {
      logger.error({ err: error }, "Oracle connection test failed");
      return false;
    }
  },

  async fetchPayments(credentials, request): Promise<ERPSyncResult> {
    const oracleCreds = credentials as OracleCredentials;

    try {
      const token = await getAccessToken(oracleCreds);
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const fromDateStr = request.fromDate.toISOString().split("T")[0];
      const toDateStr = request.toDate.toISOString().split("T")[0];

      let filterQuery = `AccountingDate ge '${fromDateStr}' and AccountingDate le '${toDateStr}'`;
      if (oracleCreds.businessUnit || request.companyCode) {
        filterQuery += ` and BusinessUnit eq '${oracleCreds.businessUnit || request.companyCode}'`;
      }

      const limit = request.maxItems || 1000;
      const url = `${oracleCreds.baseUrl}/fscmRestApi/resources/11.13.18.05/generalLedgerJournals?q=${encodeURIComponent(filterQuery)}&limit=${limit}&fields=AccountingDate,EnteredDebit,EnteredCredit,Currency,Description,AccountClass,JournalName`;

      const response = await withRetry(() => fetch(url, { headers }));

      if (!response.ok) {
        return {
          success: false,
          items: [],
          totalCount: 0,
          errorMessage: `Oracle API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      const journalItems = data?.items || [];

      const items: ERPPaymentItem[] = journalItems
        .filter(
          (j: Record<string, string>) =>
            isExpenseAccount(j.AccountClass || "") &&
            parseAmount(j.EnteredDebit) > 0
        )
        .map((j: Record<string, string | number | null>) => ({
          transactionDate: new Date(String(j.AccountingDate)),
          merchantName: String(j.Description || j.JournalName || ""),
          amount: parseAmount(j.EnteredDebit),
          currency: String(j.Currency || "KRW"),
          category: String(j.AccountClass || ""),
          memo: String(j.JournalName || ""),
          documentNumber: String(j.JournalName || ""),
          rawData: j as Record<string, unknown>,
        }));

      return {
        success: true,
        items,
        totalCount: items.length,
      };
    } catch (error) {
      logger.error({ err: error }, "Oracle fetchPayments failed");
      return {
        success: false,
        items: [],
        totalCount: 0,
        errorMessage:
          error instanceof Error ? error.message : "Oracle API 호출 실패",
      };
    }
  },
};
