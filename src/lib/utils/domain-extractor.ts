// src/lib/utils/domain-extractor.ts
/**
 * URL에서 메인 도메인을 추출하는 유틸리티
 * 예: https://www.google.com/a/b/c → google.com
 */

/**
 * URL에서 메인 도메인 추출
 * @param url - 분석할 URL
 * @returns 메인 도메인 (예: google.com) 또는 null
 */
export function extractMainDomain(url: string): string | null {
  try {
    // URL이 프로토콜 없이 시작하면 https:// 추가
    let normalizedUrl = url.trim();
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // IP 주소는 그대로 반환
    if (isIPAddress(hostname)) {
      return null;
    }

    // localhost 또는 내부 도메인 제외
    if (isInternalDomain(hostname)) {
      return null;
    }

    // www. 접두사 제거
    let domain = hostname.startsWith("www.") ? hostname.substring(4) : hostname;

    // 메인 도메인 추출 (서브도메인 제거)
    domain = extractRegisteredDomain(domain);

    return domain || null;
  } catch {
    return null;
  }
}

/**
 * URL에서 패턴용 와일드카드 도메인 생성
 * @param url - 분석할 URL
 * @returns 와일드카드 패턴 (예: *.google.com)
 */
export function extractWildcardPattern(url: string): string | null {
  const domain = extractMainDomain(url);
  if (!domain) return null;
  return `*.${domain}`;
}

/**
 * 도메인이 URL과 매칭되는지 확인 (와일드카드 패턴 지원)
 * @param pattern - 와일드카드 패턴 (예: *.google.com)
 * @param url - 검사할 URL
 * @returns 매칭 여부
 */
export function matchDomainPattern(pattern: string, url: string): boolean {
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // 와일드카드 패턴 처리
    if (pattern.startsWith("*.")) {
      const baseDomain = pattern.substring(2).toLowerCase();
      // 정확히 매칭되거나 서브도메인으로 끝나는 경우
      return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
    }

    // 정확한 매칭
    return hostname === pattern.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * IP 주소인지 확인
 */
function isIPAddress(hostname: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return true;
  }

  // IPv6 (대괄호 없는 경우)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(hostname)) {
    return true;
  }

  return false;
}

/**
 * 내부/로컬 도메인인지 확인
 */
function isInternalDomain(hostname: string): boolean {
  const internalPatterns = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    ".local",
    ".internal",
    ".test",
    ".example",
    ".invalid",
    ".localhost",
  ];

  return internalPatterns.some(
    (pattern) => hostname === pattern || hostname.endsWith(pattern)
  );
}

/**
 * 등록된 도메인 추출 (서브도메인 제거)
 * 공개 접미사 리스트(PSL) 기반 처리의 간소화 버전
 */
function extractRegisteredDomain(hostname: string): string {
  const parts = hostname.split(".");

  // 2개 이하면 그대로 반환
  if (parts.length <= 2) {
    return hostname;
  }

  // 국가 코드 TLD + gTLD 조합 처리 (co.kr, com.au 등)
  const ccTldPatterns = [
    "co.kr",
    "go.kr",
    "or.kr",
    "ne.kr",
    "re.kr",
    "pe.kr",
    "ac.kr",
    "hs.kr",
    "ms.kr",
    "es.kr",
    "sc.kr",
    "kg.kr",
    "com.au",
    "net.au",
    "org.au",
    "com.br",
    "net.br",
    "org.br",
    "co.uk",
    "org.uk",
    "ac.uk",
    "gov.uk",
    "co.jp",
    "ne.jp",
    "or.jp",
    "ac.jp",
    "go.jp",
    "com.cn",
    "net.cn",
    "org.cn",
    "gov.cn",
    "com.tw",
    "net.tw",
    "org.tw",
    "com.hk",
    "net.hk",
    "org.hk",
    "com.sg",
    "net.sg",
    "org.sg",
  ];

  const lastTwoParts = parts.slice(-2).join(".");
  if (ccTldPatterns.includes(lastTwoParts)) {
    // 3개의 파트 반환 (예: naver.co.kr)
    return parts.slice(-3).join(".");
  }

  // 기본: 마지막 2개 파트 반환
  return parts.slice(-2).join(".");
}

/**
 * URL이 유효한지 확인
 */
export function isValidUrl(url: string): boolean {
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    new URL(normalizedUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * 여러 URL에서 고유한 메인 도메인 목록 추출
 */
export function extractUniqueMainDomains(urls: string[]): string[] {
  const domains = new Set<string>();

  for (const url of urls) {
    const domain = extractMainDomain(url);
    if (domain) {
      domains.add(domain);
    }
  }

  return Array.from(domains);
}

/**
 * 도메인에서 TLD를 제거한 기본 이름 추출
 * 예: atlassian.com → atlassian, atlassian.net → atlassian
 * 국가 코드 TLD도 처리: naver.co.kr → naver
 */
export function extractDomainBase(domain: string): string {
  const cleaned = domain.toLowerCase().replace(/^\*\./, "");
  const parts = cleaned.split(".");

  if (parts.length <= 1) return cleaned;

  const ccTldSuffixes = [
    "co.kr",
    "go.kr",
    "or.kr",
    "ne.kr",
    "re.kr",
    "pe.kr",
    "ac.kr",
    "co.uk",
    "org.uk",
    "ac.uk",
    "gov.uk",
    "co.jp",
    "ne.jp",
    "or.jp",
    "ac.jp",
    "go.jp",
    "com.au",
    "net.au",
    "org.au",
    "com.br",
    "net.br",
    "org.br",
    "com.cn",
    "net.cn",
    "org.cn",
    "com.tw",
    "net.tw",
    "org.tw",
    "com.hk",
    "net.hk",
    "org.hk",
    "com.sg",
    "net.sg",
    "org.sg",
  ];

  const lastTwo = parts.slice(-2).join(".");
  if (ccTldSuffixes.includes(lastTwo) && parts.length >= 3) {
    return parts[parts.length - 3];
  }

  return parts[parts.length - 2];
}

/**
 * TLD 변형을 무시하고 도메인 매칭
 * 예: 패턴 *.atlassian.net과 도메인 atlassian.com을 비교 시 true 반환
 */
export function matchDomainWithTldVariants(
  pattern: string,
  url: string
): boolean {
  try {
    const patternBase = extractDomainBase(pattern);
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();
    const urlBase = extractDomainBase(hostname);

    return patternBase === urlBase;
  } catch {
    return false;
  }
}
