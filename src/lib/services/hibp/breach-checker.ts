// src/lib/services/hibp/breach-checker.ts
/**
 * Have I Been Pwned (HIBP) Breach Checker
 * k-Anonymity 기반 비밀번호 침해 여부 확인
 *
 * HIBP API는 SHA-1 해시의 앞 5자리(prefix)로 조회하여
 * 해당 prefix로 시작하는 모든 해시의 suffix와 침해 횟수를 반환합니다.
 */

import crypto from "crypto";

const HIBP_API_URL = "https://api.pwnedpasswords.com/range";

export type HIBPCheckResult = {
  checked: boolean;
  breached: boolean;
  count?: number;
  error?: string;
};

/**
 * SHA-512 해시를 SHA-1로 변환
 * HIBP API는 SHA-1 해시만 지원하므로 변환이 필요합니다.
 *
 * 주의: 실제로는 원본 비밀번호에서 SHA-1을 직접 생성해야 하지만,
 * Extension에서 이미 SHA-512로 해시된 값만 전송하므로
 * SHA-512 해시를 다시 SHA-1으로 해시합니다.
 * 이는 보안상 완벽하지 않지만, 원본 비밀번호를 서버로 전송하지 않기 위한 트레이드오프입니다.
 */
function sha512ToSha1(sha512Hash: string): string {
  return crypto
    .createHash("sha1")
    .update(sha512Hash, "hex")
    .digest("hex")
    .toUpperCase();
}

/**
 * 비밀번호 해시로 HIBP 침해 여부 확인
 *
 * @param hashSha512 - SHA-512로 해시된 비밀번호
 * @returns HIBP 체크 결과
 */
export async function checkCredentialHIBP(
  hashSha512: string
): Promise<HIBPCheckResult> {
  try {
    // SHA-512 → SHA-1 변환
    const sha1Hash = sha512ToSha1(hashSha512);

    // k-Anonymity: 앞 5자리로 range 쿼리
    const prefix = sha1Hash.substring(0, 5);
    const suffix = sha1Hash.substring(5);

    // HIBP API 호출
    const response = await fetch(`${HIBP_API_URL}/${prefix}`, {
      headers: {
        "User-Agent": "SMP-Extension-Checker",
        "Add-Padding": "true", // 추가 보안을 위한 패딩
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          checked: false,
          breached: false,
          error: "Rate limited by HIBP API",
        };
      }
      return {
        checked: false,
        breached: false,
        error: `HIBP API error: ${response.status}`,
      };
    }

    const text = await response.text();

    // 응답 파싱: "SUFFIX:COUNT" 형식의 라인들
    const lines = text.split("\n");
    for (const line of lines) {
      const parts = line.split(":");
      if (parts.length !== 2) continue;

      const [hashSuffix, countStr] = parts;
      if (hashSuffix.trim().toUpperCase() === suffix) {
        const count = parseInt(countStr.trim(), 10);
        return {
          checked: true,
          breached: true,
          count,
        };
      }
    }

    // 매칭되는 해시가 없으면 침해되지 않음
    return {
      checked: true,
      breached: false,
    };
  } catch (error) {
    console.error("HIBP check error:", error);
    return {
      checked: false,
      breached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 문자열을 SHA-1으로 해시 (테스트용)
 */
export function hashSha1(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex").toUpperCase();
}

/**
 * 문자열을 SHA-512로 해시
 */
export function hashSha512(input: string): string {
  return crypto.createHash("sha512").update(input).digest("hex");
}
