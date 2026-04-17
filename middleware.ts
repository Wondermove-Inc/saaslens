// middleware.ts
// 인증 미들웨어 - 공개 라우트만 허용, 나머지는 Server Components/Actions에서 처리
// 주의: auth() 래퍼 사용하면 모든 요청마다 세션 검증 → DB 연결 풀 고갈 위험

import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "never",
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /extensions → /extensions/usage 리다이렉트 (페이지 진입 전 처리)
  if (pathname === "/extensions") {
    return NextResponse.redirect(new URL("/extensions/usage", request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
