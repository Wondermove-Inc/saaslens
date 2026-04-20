import type { Instrumentation } from "next";

export const runtime = "nodejs";

/**
 * Next.js Instrumentation
 *
 * onRequestError Hook: 모든 서버 에러 자동 캡처
 * - API Routes
 * - Server Actions
 * - SSR 에러
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  // Dynamic import to avoid Edge Runtime issues
  const { logger } = await import("@/lib/logger");

  logger.error(
    {
      err,
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
    },
    "Unhandled request error"
  );
};
