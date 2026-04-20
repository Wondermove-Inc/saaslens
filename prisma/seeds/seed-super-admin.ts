// prisma/seeds/seed-super-admin.ts
/**
 * Super Admin 계정 초기 생성 스크립트
 *
 * 사용법:
 *   npm run seed:super-admin
 *
 * 환경 변수:
 *   SUPER_ADMIN_EMAIL    - Super Admin 이메일 (필수)
 *   SUPER_ADMIN_PASSWORD - Super Admin 비밀번호 (선택, 없으면 이메일 OTP만 사용)
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email) {
    console.error("❌ SUPER_ADMIN_EMAIL 환경 변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  console.log(`🔧 Super Admin 계정 생성 중: ${email}`);

  // 기존 계정 확인
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (existingUser.role === "SUPER_ADMIN") {
      console.log("✅ Super Admin 계정이 이미 존재합니다.");
      return;
    }
    // 기존 계정을 SUPER_ADMIN으로 업그레이드
    await prisma.user.update({
      where: { email },
      data: {
        role: "SUPER_ADMIN",
        organizationId: null,
        emailVerified: new Date(),
      },
    });
    console.log("✅ 기존 계정을 Super Admin으로 업그레이드했습니다.");
    return;
  }

  // 비밀번호 해시 생성
  let passwordHash: string | undefined;
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  }

  // Super Admin 계정 생성
  const superAdmin = await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      organizationId: null,
      emailVerified: new Date(),
      status: "ACTIVE",
      passwordHash: passwordHash ?? null,
    },
  });

  console.log(`✅ Super Admin 계정 생성 완료!`);
  console.log(`   ID: ${superAdmin.id}`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Role: ${superAdmin.role}`);
  console.log(`   비밀번호: ${password ? "설정됨" : "미설정 (OTP 전용)"}`);
}

main()
  .catch((e) => {
    console.error("❌ 오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
