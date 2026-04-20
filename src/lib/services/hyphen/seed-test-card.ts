/**
 * 테스트용 법인카드 DB 등록 스크립트
 * 실행: npx tsx src/lib/services/hyphen/seed-test-card.ts
 *
 * 사전 준비: .env.local에 다음 환경 변수 설정
 * - TEST_CARD_CD: 카드사 코드 (예: 010)
 * - TEST_CARD_NO: 카드번호
 * - TEST_CARD_NM: 카드명 (선택)
 * - TEST_CARD_USER_ID: 카드사 로그인 ID
 * - TEST_CARD_USER_PW: 카드사 로그인 비밀번호
 * - TEST_CARD_BIZ_NO: 사업자번호
 * - ENCRYPTION_KEY: 암호화 키 (32자)
 */

import * as dotenv from "dotenv";
import * as path from "path";

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { encryptJson, getCardLast4, maskCardNumber } from "@/lib/crypto";
import { PrismaClient } from "@prisma/client";
import type { CardCredentials } from "./types";

const prisma = new PrismaClient();

function getTestCardConfig() {
  const cardCd = process.env.TEST_CARD_CD;
  const cardNo = process.env.TEST_CARD_NO;
  const cardNm = process.env.TEST_CARD_NM || "테스트 카드";
  const userId = process.env.TEST_CARD_USER_ID;
  const userPw = process.env.TEST_CARD_USER_PW;
  const bizNo = process.env.TEST_CARD_BIZ_NO;

  // 필수 환경 변수 확인
  const missing: string[] = [];
  if (!cardCd) missing.push("TEST_CARD_CD");
  if (!cardNo) missing.push("TEST_CARD_NO");
  if (!userId) missing.push("TEST_CARD_USER_ID");
  if (!userPw) missing.push("TEST_CARD_USER_PW");
  if (!bizNo) missing.push("TEST_CARD_BIZ_NO");

  if (missing.length > 0) {
    throw new Error(
      `필수 환경 변수가 설정되지 않았습니다: ${missing.join(", ")}\n` +
        `.env.local 파일에 다음 환경 변수를 추가하세요:\n` +
        `TEST_CARD_CD=010\n` +
        `TEST_CARD_NO=카드번호\n` +
        `TEST_CARD_USER_ID=카드사ID\n` +
        `TEST_CARD_USER_PW=카드사비밀번호\n` +
        `TEST_CARD_BIZ_NO=사업자번호`
    );
  }

  return {
    cardCd: cardCd!,
    cardNo: cardNo!,
    cardNm,
    credentials: {
      loginMethod: "ID" as const,
      userId: userId!,
      userPw: userPw!,
      signPw: userPw!, // signPw는 userPw와 동일하게 설정
      bizNo: bizNo!,
      cardNo: cardNo!, // 원본 카드번호도 암호화하여 저장
    },
  };
}

async function seedTestCard() {
  console.log("========================================");
  console.log("  테스트용 법인카드 DB 등록");
  console.log("========================================\n");

  try {
    // 환경 변수 확인
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.");
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
    }

    // 환경 변수에서 카드 정보 로드
    const testCard = getTestCardConfig();

    console.log(`카드사 코드: ${testCard.cardCd}`);
    console.log(`카드번호: ${maskCardNumber(testCard.cardNo)}`);
    console.log(`카드명: ${testCard.cardNm}`);
    console.log(`사용자 ID: ${testCard.credentials.userId}`);
    console.log(`사업자번호: ${testCard.credentials.bizNo}\n`);

    // 테스트용 조직 조회 (없으면 생성)
    let organization = await prisma.organization.findFirst({
      where: { name: "테스트 조직" },
    });

    if (!organization) {
      console.log("테스트 조직 생성 중...");
      organization = await prisma.organization.create({
        data: {
          name: "테스트 조직",
        },
      });
      console.log(`✅ 테스트 조직 생성 완료: ${organization.id}\n`);
    } else {
      console.log(`ℹ️ 기존 테스트 조직 사용: ${organization.id}\n`);
    }

    // 중복 확인
    const maskedCardNo = maskCardNumber(testCard.cardNo);
    const existingCard = await prisma.corporateCard.findFirst({
      where: {
        organizationId: organization.id,
        cardNo: maskedCardNo,
      },
    });

    if (existingCard) {
      console.log("ℹ️ 이미 등록된 카드입니다. 업데이트합니다...\n");

      // 인증 정보 암호화
      const encryptedCredentials = encryptJson<CardCredentials>(
        testCard.credentials
      );

      // 업데이트
      await prisma.corporateCard.update({
        where: { id: existingCard.id },
        data: {
          encryptedCredentials,
          isActive: true,
          lastError: null,
        },
      });

      console.log("✅ 카드 정보 업데이트 완료");
      console.log(`   카드 ID: ${existingCard.id}`);
      console.log(`   카드번호: ${maskedCardNo}`);
      return existingCard.id;
    }

    // 인증 정보 암호화
    console.log("인증 정보 암호화 중...");
    const encryptedCredentials = encryptJson<CardCredentials>(
      testCard.credentials
    );
    console.log(`✅ 암호화 완료 (길이: ${encryptedCredentials.length}자)\n`);

    // 카드 등록
    console.log("DB에 카드 등록 중...");
    const card = await prisma.corporateCard.create({
      data: {
        organizationId: organization.id,
        cardCd: testCard.cardCd,
        cardNo: maskedCardNo,
        cardLast4: getCardLast4(testCard.cardNo),
        cardNm: testCard.cardNm,
        loginMethod: testCard.credentials.loginMethod,
        encryptedCredentials,
        bizNo: testCard.credentials.bizNo,
        isActive: true,
      },
    });

    console.log("\n========================================");
    console.log("  ✅ 카드 등록 완료");
    console.log("========================================");
    console.log(`카드 ID: ${card.id}`);
    console.log(`조직 ID: ${organization.id}`);
    console.log(`카드번호: ${card.cardNo}`);
    console.log(`카드명: ${card.cardNm}`);
    console.log(`마지막 4자리: ${card.cardLast4}`);
    console.log("========================================\n");

    return card.id;
  } catch (error) {
    console.error("\n❌ 카드 등록 실패:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
seedTestCard()
  .then(() => {
    console.log(`\n다음 명령으로 테스트를 실행하세요:`);
    console.log(`npx tsx src/lib/services/hyphen/test-api.ts\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
