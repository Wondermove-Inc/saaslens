// src/types/next-auth.d.ts
// NextAuth.js v5 세션 타입 확장

import { UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * 세션에 포함될 사용자 정보
   * organizationId: 소속 조직 (없으면 온보딩 필요)
   * role: 사용자 역할 (ADMIN/MEMBER/VIEWER)
   */
  interface Session {
    user: {
      id: string;
      organizationId?: string | null;
      role: UserRole;
      teamId?: string | null;
      department?: string | null;
      jobTitle?: string | null;
      phone?: string | null;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/adapters" {
  /**
   * Prisma Adapter에서 사용하는 User 타입 확장
   */
  interface AdapterUser {
    organizationId?: string | null;
    role: UserRole;
  }
}

declare module "@auth/core/jwt" {
  /**
   * JWT 토큰에 저장되는 정보
   * (Edge Runtime 미들웨어에서 사용)
   */
  interface JWT {
    id: string;
    organizationId?: string | null;
    role: string;
    teamId?: string | null;
  }
}
