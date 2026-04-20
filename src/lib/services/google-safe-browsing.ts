// src/lib/services/google-safe-browsing.ts
/**
 * Google Safe Browsing API v4 클라이언트
 * @see https://developers.google.com/safe-browsing/v4
 */

const SAFE_BROWSING_API_URL =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

/**
 * 위협 유형
 */
export type ThreatType =
  | "MALWARE"
  | "SOCIAL_ENGINEERING"
  | "UNWANTED_SOFTWARE"
  | "POTENTIALLY_HARMFUL_APPLICATION";

/**
 * Safe Browsing API 검사 결과
 */
export interface SafeBrowsingResult {
  isMalicious: boolean;
  threatType: ThreatType | null;
  platformType: string | null;
  threatEntryType: string | null;
}

/**
 * Safe Browsing API 요청 형식
 */
interface SafeBrowsingRequest {
  client: {
    clientId: string;
    clientVersion: string;
  };
  threatInfo: {
    threatTypes: ThreatType[];
    platformTypes: string[];
    threatEntryTypes: string[];
    threatEntries: { url: string }[];
  };
}

/**
 * Safe Browsing API 응답 형식
 */
interface SafeBrowsingResponse {
  matches?: {
    threatType: ThreatType;
    platformType: string;
    threatEntryType: string;
    threat: { url: string };
    cacheDuration: string;
  }[];
}

/**
 * Google Safe Browsing API를 사용하여 URL 안전성 검사
 *
 * @param urls - 검사할 URL 목록 (최대 500개)
 * @returns URL별 검사 결과 Map
 *
 * @example
 * const results = await checkUrlSafety(["https://malware.testing.google.test/testing/malware/"]);
 * // Map { "https://malware.testing.google.test/testing/malware/" => { isMalicious: true, threatType: "MALWARE", ... } }
 */
export async function checkUrlSafety(
  urls: string[]
): Promise<Map<string, SafeBrowsingResult>> {
  const results = new Map<string, SafeBrowsingResult>();

  // API 키가 없으면 모든 URL을 안전한 것으로 처리
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    console.warn(
      "[SafeBrowsing] API key not configured, skipping malware check"
    );
    for (const url of urls) {
      results.set(url, {
        isMalicious: false,
        threatType: null,
        platformType: null,
        threatEntryType: null,
      });
    }
    return results;
  }

  // URL이 없으면 빈 Map 반환
  if (urls.length === 0) {
    return results;
  }

  // API 제한: 최대 500개 URL
  const urlBatches = chunk(urls, 500);

  for (const batch of urlBatches) {
    try {
      const requestBody: SafeBrowsingRequest = {
        client: {
          clientId: "saaslens",
          clientVersion: "1.0.0",
        },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: batch.map((url) => ({ url })),
        },
      };

      const response = await fetch(`${SAFE_BROWSING_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error(
          "[SafeBrowsing] API error:",
          response.status,
          await response.text()
        );
        // API 오류 시 해당 배치의 URL을 안전한 것으로 처리
        for (const url of batch) {
          results.set(url, {
            isMalicious: false,
            threatType: null,
            platformType: null,
            threatEntryType: null,
          });
        }
        continue;
      }

      const data: SafeBrowsingResponse = await response.json();

      // 기본값: 모든 URL을 안전한 것으로 설정
      for (const url of batch) {
        results.set(url, {
          isMalicious: false,
          threatType: null,
          platformType: null,
          threatEntryType: null,
        });
      }

      // 위협이 발견된 URL 업데이트
      if (data.matches) {
        for (const match of data.matches) {
          results.set(match.threat.url, {
            isMalicious: true,
            threatType: match.threatType,
            platformType: match.platformType,
            threatEntryType: match.threatEntryType,
          });
        }
      }
    } catch (error) {
      console.error("[SafeBrowsing] Request failed:", error);
      // 네트워크 오류 시 해당 배치의 URL을 안전한 것으로 처리
      for (const url of batch) {
        results.set(url, {
          isMalicious: false,
          threatType: null,
          platformType: null,
          threatEntryType: null,
        });
      }
    }
  }

  return results;
}

/**
 * 단일 도메인 안전성 검사
 *
 * @param domain - 검사할 도메인 (예: "google.com")
 * @returns 검사 결과
 */
export async function checkDomainSafety(
  domain: string
): Promise<SafeBrowsingResult> {
  const url = `https://${domain}/`;
  const results = await checkUrlSafety([url]);
  return (
    results.get(url) || {
      isMalicious: false,
      threatType: null,
      platformType: null,
      threatEntryType: null,
    }
  );
}

/**
 * 배열을 지정된 크기의 청크로 분할
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 위협 유형에 대한 한글 설명
 */
export function getThreatTypeLabel(threatType: ThreatType | null): string {
  switch (threatType) {
    case "MALWARE":
      return "악성 소프트웨어";
    case "SOCIAL_ENGINEERING":
      return "피싱/사회공학";
    case "UNWANTED_SOFTWARE":
      return "원치 않는 소프트웨어";
    case "POTENTIALLY_HARMFUL_APPLICATION":
      return "유해 가능성 앱";
    default:
      return "알 수 없음";
  }
}
