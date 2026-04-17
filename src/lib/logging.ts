import { logger } from "@/lib/logger";

/**
 * 통합 로깅 래퍼 (API Routes + Server Actions 공용)
 *
 * 모든 백엔드 함수(API Route handler, Server Action)를 감싸서
 * 시작/완료/에러를 일관된 포맷으로 로깅합니다.
 *
 * API Route: NextRequest/NextResponse 자동 감지 → method, path, status
 * Server Action: payload 캡처, ActionState 결과 요약, success:false → warn
 *
 * @example API Route
 * ```ts
 * export const GET = withLogging("GET /api/v1/apps", async (req) => {
 *   return NextResponse.json(data);
 * });
 * ```
 *
 * @example Server Action
 * ```ts
 * async function _createApp(prevState, formData) { ... }
 * export const createApp = withLogging("createApp", _createApp);
 * ```
 */

// ─── 헬퍼 함수 ───

/** URL에서 query params 추출 → { page: "1", limit: "20" } */
function extractQueryParams(url: string): Record<string, string> | undefined {
  try {
    const { searchParams } = new URL(url);
    if (searchParams.size === 0) return undefined;
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      params[k] = v;
    });
    return params;
  } catch {
    return undefined;
  }
}

/** HTTP 요청 body 추출 (clone → json, POST/PUT/PATCH/DELETE만) */
async function extractRequestBody(req: unknown): Promise<unknown> {
  if (!req || typeof req !== "object") return undefined;
  const r = req as {
    clone?: () => { json(): Promise<unknown> };
    method?: string;
  };
  if (typeof r.clone !== "function") return undefined;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(r.method ?? ""))
    return undefined;
  try {
    const cloned = r.clone();
    return await cloned.json();
  } catch {
    return undefined;
  }
}

/** 응답 body의 대형 배열 → "[Array: N items]" 으로 요약 */
function summarizeBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;

  const obj = { ...(body as Record<string, unknown>) };
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      obj[key] = `[Array: ${value.length} items]`;
    }
  }
  return obj;
}

/** HTTP 응답 body 추출 (clone → json → 배열 요약) */
async function extractResponseBody(res: unknown): Promise<unknown> {
  if (!res || typeof res !== "object") return undefined;
  const r = res as { clone?: () => { json(): Promise<unknown> } };
  if (typeof r.clone !== "function") return undefined;
  try {
    const cloned = r.clone();
    const body = await cloned.json();
    return summarizeBody(body);
  } catch {
    return undefined;
  }
}

/** FormData → plain object 변환 (다중 값 지원, File 메타데이터만) */
function formDataToObject(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  fd.forEach((value, key) => {
    if (key in obj) {
      const existing = obj[key];
      obj[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    } else {
      obj[key] =
        value instanceof File ? `[File: ${value.name}, ${value.size}B]` : value;
    }
  });
  return obj;
}

/** HTTP 요청 객체 감지 (NextRequest-like) */
function isHttpRequest(val: unknown): boolean {
  return (
    val !== null &&
    typeof val === "object" &&
    "method" in (val as Record<string, unknown>) &&
    "url" in (val as Record<string, unknown>)
  );
}

/** ActionState 감지 ({ success: boolean } 패턴) */
function isActionState(val: unknown): boolean {
  return (
    val !== null &&
    typeof val === "object" &&
    "success" in (val as Record<string, unknown>) &&
    typeof (val as Record<string, unknown>).success === "boolean"
  );
}

/**
 * args에서 로깅용 payload 추출
 * - prevState(ActionState) 제외
 * - NextRequest 제외
 * - FormData → plain object 변환
 */
function sanitizeArgs(args: unknown[]): unknown {
  if (args.length === 0) return undefined;

  const sanitized = args
    .filter((arg) => !isActionState(arg) && !isHttpRequest(arg))
    .map((arg) =>
      typeof FormData !== "undefined" && arg instanceof FormData
        ? formDataToObject(arg)
        : arg
    );

  if (sanitized.length === 0) return undefined;
  return sanitized.length === 1 ? sanitized[0] : sanitized;
}

/**
 * ActionState 결과 요약
 * - data 필드 제외 (크기 이슈) → hasData: true만 표시
 * - success, message, error, errors 포함
 */
function summarizeResult(result: unknown): Record<string, unknown> | undefined {
  if (!result || typeof result !== "object") return undefined;

  const r = result as Record<string, unknown>;
  if (!("success" in r) || typeof r.success !== "boolean") return undefined;

  const summary: Record<string, unknown> = { success: r.success };
  if (r.message) summary.message = r.message;
  if (r.error) summary.error = r.error;
  if (r.errors) summary.errors = r.errors;
  if (r.data !== undefined) {
    summary.data = Array.isArray(r.data)
      ? `[Array: ${r.data.length} items]`
      : r.data;
  }
  return summary;
}

/**
 * 에러 객체를 로깅용으로 정리
 * - PrismaClientKnownRequestError: 맹글링된 소스 코드 제거, 핵심 정보만 추출
 * - 일반 에러: 그대로 반환
 */
function sanitizeError(error: unknown): unknown {
  if (!(error instanceof Error)) return error;

  const e = error as Error & {
    code?: string;
    meta?: Record<string, unknown>;
    clientVersion?: string;
  };

  // Prisma 에러 감지: code 필드 존재 + "P"로 시작
  if (typeof e.code === "string" && e.code.startsWith("P")) {
    // message에서 실제 에러 내용만 추출 (소스 코드 스니펫, 맹글링 경로 제거)
    const lines = e.message.split("\n").filter((l) => l.trim());
    const meaningfulLine =
      lines.findLast(
        (l) =>
          !l.includes("TURBOPACK") &&
          !l.includes("__imported__module__") &&
          !l.includes("invocation in") &&
          !l.includes(".js:") &&
          !l.includes("// ") &&
          !l.includes("→ ") &&
          !/^\s*\d+\s/.test(l) &&
          l.trim().length > 0
      ) ?? lines[lines.length - 1];

    return {
      type: e.name,
      code: e.code,
      message: meaningfulLine?.trim(),
      meta: e.meta,
    };
  }

  // 일반 에러는 Pino 기본 직렬화
  return error;
}

/** Next.js redirect/notFound error 감지 */
function isNextRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const digest = (error as { digest?: string }).digest;
  return (
    typeof digest === "string" &&
    (digest.includes("NEXT_REDIRECT") || digest.includes("NEXT_NOT_FOUND"))
  );
}

// ─── withLogging ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const start = Date.now();

    // NextRequest 자동 감지 → method, path 추출
    const req = args[0];
    const isHttp = isHttpRequest(req);
    const method = isHttp ? (req as { method: string }).method : undefined;
    const path = isHttp
      ? new URL((req as { url: string }).url).pathname
      : undefined;

    // HTTP → query params, request body 추출
    const query = isHttp
      ? extractQueryParams((req as { url: string }).url)
      : undefined;
    const body = isHttp ? await extractRequestBody(req) : undefined;

    // Server Action → payload 추출
    const payload = !isHttp ? sanitizeArgs(args as unknown[]) : undefined;

    logger.info({ name, method, path, query, body, payload }, "start");

    try {
      const result = await fn(...args);
      const durationMs = Date.now() - start;

      // NextResponse 자동 감지 → status 추출
      const status =
        result && typeof result === "object" && "status" in result
          ? (result as { status: number }).status
          : undefined;

      // HTTP → response body 추출 (배열 자동 요약)
      const responseBody = isHttp
        ? await extractResponseBody(result)
        : undefined;

      // ActionState 결과 요약
      const resultSummary = summarizeResult(result);

      // 로그 레벨 결정:
      // HTTP 4xx/5xx → warn
      // ActionState success:false → warn
      const isHttpError = status !== undefined && status >= 400;
      const isActionError = resultSummary?.success === false;

      const logData = {
        name,
        durationMs,
        status,
        method,
        path,
        ...(responseBody !== undefined ? { responseBody } : {}),
        ...(resultSummary ? { result: resultSummary } : {}),
      };

      if (isHttpError || isActionError) {
        logger.warn(logData, "done");
      } else {
        logger.info(logData, "done");
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - start;

      // Next.js redirect는 정상 흐름 → 에러 로깅 제외
      if (isNextRedirectError(error)) {
        logger.info({ name, durationMs, method, path }, "redirect");
        throw error;
      }

      logger.error(
        { name, durationMs, err: sanitizeError(error), method, path, payload },
        "fail"
      );

      throw error;
    }
  }) as unknown as T;
}
