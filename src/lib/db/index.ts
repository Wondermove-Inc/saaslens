import { PrismaClient } from "@prisma/client";

/**
 * Prisma 클라이언트 싱글톤 인스턴스
 * 개발 환경에서 핫 리로드 시 연결 풀 누수 방지
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"] // "query" 제거: OTel 로그와 중복 방지
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
