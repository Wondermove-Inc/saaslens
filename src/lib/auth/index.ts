// src/lib/auth/index.ts
// NextAuth.js v5 설정 (App Router) - JWT 전략

import { triggerInitialBuild } from "@/actions/extensions/builds";
import { prisma } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

/**
 * NextAuth.js v5 설정
 * - Google OAuth 프로바이더
 * - Credentials 프로바이더 (이메일/OTP)
 * - Prisma 어댑터 (DB 연동)
 * - JWT 세션 전략 (Edge Runtime 지원)
 * - 세션에 organizationId, role 추가
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Vercel 등 프록시 뒤에서 실행 시 필요
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // 초대된 사용자 계정 연결 허용
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        otp: { label: "인증 코드", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) {
          return null;
        }

        const email = credentials.email as string;
        const otp = credentials.otp as string;

        // 사용자 조회 (초대 전용: DB에 존재해야 함)
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        });

        if (!user) return null;

        // 활성 OTP 토큰 조회 (만료되지 않은 것)
        const otpToken = await prisma.otpToken.findFirst({
          where: {
            email,
            expires: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!otpToken) return null;

        // 최대 시도 횟수 초과 시 토큰 삭제
        if (otpToken.attempts >= 5) {
          await prisma.otpToken.delete({ where: { id: otpToken.id } });
          return null;
        }

        // OTP 코드 비교
        if (otpToken.code !== otp) {
          await prisma.otpToken.update({
            where: { id: otpToken.id },
            data: { attempts: { increment: 1 } },
          });
          return null;
        }

        // 성공: 토큰 삭제 (single-use)
        await prisma.otpToken.delete({ where: { id: otpToken.id } });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  // JWT 세션 전략 (Edge Runtime에서 동작)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  callbacks: {
    /**
     * JWT 콜백: 토큰에 사용자 정보 저장
     * 주의: Edge Runtime(미들웨어)에서도 호출되므로 Prisma 호출 시 환경 체크 필요
     */
    async jwt({ token, user, trigger, account }) {
      // JWT Callback log removed

      // 최초 로그인 시 (OAuth 콜백 - 서버 환경에서만 실행됨)
      if (user && account) {
        token.id = user.id;

        // 초기 로그인 시에만 DB 조회 및 lastLoginAt 업데이트
        try {
          // 로그인 시간 업데이트 (findUnique + update를 하나로)
          const dbUser = await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
            select: {
              organizationId: true,
              role: true,
              email: true,
              teamId: true,
            },
          });

          let organizationId = dbUser?.organizationId ?? null;
          let role = dbUser?.role ?? "MEMBER";
          const teamId = dbUser?.teamId ?? null;

          // 조직이 없는 경우, pending 초대 확인 및 자동 수락
          if (!organizationId && dbUser?.email) {
            const pendingInvitation = await prisma.invitation.findFirst({
              where: {
                email: dbUser.email,
                status: "PENDING",
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: "desc" },
            });

            if (pendingInvitation) {
              // 초대 수락 처리
              await prisma.$transaction([
                prisma.invitation.update({
                  where: { id: pendingInvitation.id },
                  data: { status: "ACCEPTED" },
                }),
                prisma.user.update({
                  where: { id: user.id },
                  data: {
                    organizationId: pendingInvitation.organizationId,
                    role: pendingInvitation.role,
                    teamId: pendingInvitation.teamId,
                  },
                }),
              ]);

              organizationId = pendingInvitation.organizationId;
              role = pendingInvitation.role;

              // Auto-accepted invitation log removed
            }
          }

          token.organizationId = organizationId;
          token.role = role;
          token.teamId = teamId;

          // 관리자 로그인 시 빌드가 없으면 1.0.0 자동 생성
          if (organizationId && role === "ADMIN") {
            prisma.extensionBuild
              .count({ where: { organizationId } })
              .then((count) => {
                if (count === 0) {
                  triggerInitialBuild(organizationId).catch(console.error);
                }
              })
              .catch(console.error);
          }
        } catch (error) {
          // Edge Runtime에서는 Prisma 사용 불가 - 기본값 사용
          // 또는 user가 아직 DB에 없을 수 있음 (신규 가입)
          console.error("[JWT Callback] Error:", error);
          token.organizationId = null;
          token.role = "MEMBER";
          token.teamId = null;
        }
      }

      // 세션 업데이트 트리거 시 또는 기존 토큰이 있을 때 (서버 환경에서 DB 동기화)
      // 사용자 organizationId 변경 시 세션에 반영되도록 매번 DB 조회
      // email로 찾기 (token.id와 DB user.id가 불일치할 수 있음)
      if ((trigger === "update" || token.id) && !user && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: {
              id: true,
              organizationId: true,
              role: true,
              teamId: true,
            },
          });
          if (dbUser) {
            token.id = dbUser.id; // 실제 DB user.id로 동기화

            let organizationId = dbUser.organizationId;
            let role = dbUser.role;
            const teamId = dbUser.teamId;

            // 조직이 없는 경우, pending 초대 확인 및 자동 수락
            if (!organizationId) {
              const pendingInvitation = await prisma.invitation.findFirst({
                where: {
                  email: token.email as string,
                  status: "PENDING",
                  expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: "desc" },
              });

              if (pendingInvitation) {
                await prisma.$transaction([
                  prisma.invitation.update({
                    where: { id: pendingInvitation.id },
                    data: { status: "ACCEPTED" },
                  }),
                  prisma.user.update({
                    where: { id: dbUser.id },
                    data: {
                      organizationId: pendingInvitation.organizationId,
                      role: pendingInvitation.role,
                      teamId: pendingInvitation.teamId,
                    },
                  }),
                ]);

                organizationId = pendingInvitation.organizationId;
                role = pendingInvitation.role;

                // Auto-accepted invitation log removed
              }
            }

            token.organizationId = organizationId;
            token.role = role;
            token.teamId = teamId;
          }
        } catch {
          // Edge Runtime에서는 무시 (기존 토큰 값 유지)
        }
      }

      return token;
    },
    /**
     * 세션 콜백: JWT에서 세션으로 정보 전달
     */
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.organizationId = token.organizationId as string | null;
      session.user.role = (token.role || "MEMBER") as UserRole;
      session.user.teamId = (token.teamId as string | null) ?? null;
      return session;
    },
    /**
     * authorized 콜백: 미들웨어에서 인증 확인
     */
    authorized({ auth, request }) {
      const publicRoutes = ["/login", "/api/auth"];
      const { pathname } = request.nextUrl;

      // Auth Authorized log removed

      // 공개 라우트는 항상 허용
      if (publicRoutes.some((route) => pathname.startsWith(route))) {
        return true;
      }

      // 미인증 사용자는 로그인 페이지로 (false 반환 시 signIn 페이지로 리다이렉트)
      if (!auth) {
        // console.log("[Auth Authorized] No auth, redirecting to login");
        return false;
      }

      // 온보딩 페이지 허용
      if (pathname === "/onboarding") {
        return true;
      }

      // 초대 수락 페이지 허용 (organizationId 없이도 접근 가능)
      if (pathname.startsWith("/invite/")) {
        return true;
      }

      // SUPER_ADMIN은 organizationId 없이 /super-admin 접근 허용
      if ((auth.user?.role as string) === "SUPER_ADMIN") {
        if (pathname.startsWith("/super-admin")) return true;
        return Response.redirect(new URL("/super-admin", request.url));
      }

      // 조직이 없는 경우 온보딩으로
      if (!auth.user?.organizationId) {
        // console.log("[Auth Authorized] No org, redirecting to onboarding");
        return Response.redirect(new URL("/onboarding", request.url));
      }

      return true;
    },
    /**
     * 리다이렉트 콜백: 로그인 후 리다이렉트 URL 처리
     */
    async redirect({ url, baseUrl }) {
      // 상대 경로는 baseUrl과 결합
      if (url.startsWith("/")) {
        // 루트 경로이거나 기본 리다이렉트인 경우 대시보드로
        if (url === "/" || url === baseUrl || url === `${baseUrl}/`) {
          return `${baseUrl}/dashboard`;
        }
        return `${baseUrl}${url}`;
      }
      // 같은 origin이면 그대로 사용
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          // 루트 경로인 경우 대시보드로
          if (urlObj.pathname === "/" || urlObj.pathname === "") {
            return `${baseUrl}/dashboard`;
          }
          return url;
        }
      } catch {
        // URL 파싱 실패 시 대시보드로
        return `${baseUrl}/dashboard`;
      }
      // 기본값도 대시보드로
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", // 에러 발생 시에도 로그인 페이지로
  },
  secret: process.env.AUTH_SECRET || "dev-secret-123",
});
