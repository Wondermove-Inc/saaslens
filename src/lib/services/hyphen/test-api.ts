/**
 * Hyphen API 실제 테스트 스크립트
 * 실행: npx tsx src/lib/services/hyphen/test-api.ts
 *
 * 사전 준비:
 * 1. npx tsx src/lib/services/hyphen/seed-test-card.ts 실행하여 DB에 카드 등록
 * 2. .env.local에 HYPHEN_USER_ID, HYPHEN_HKEY, ENCRYPTION_KEY 설정
 */

import * as dotenv from "dotenv";
import * as path from "path";

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { decryptJson } from "@/lib/crypto";
import { PrismaClient } from "@prisma/client";
import { getCardApprovals, getCardPurchases } from "./card";
import type { CardCompanyCode, CardCredentials } from "./types";

const prisma = new PrismaClient();

// 조회 기간 설정
const QUERY_PERIOD = {
  sdate: "20251101",
  edate: "20251201",
};

async function testOAuthToken() {
  console.log("\n========== Step 1: OAuth 토큰 발급 테스트 ==========\n");

  const HYPHEN_API_BASE = "https://api.hyphen.im";
  const userId = process.env.HYPHEN_USER_ID;
  const hkey = process.env.HYPHEN_HKEY;

  console.log(`요청 URL: ${HYPHEN_API_BASE}/oauth/token`);
  console.log(`요청 body: { user_id: "${userId}", hkey: "${hkey}" }`);

  try {
    const response = await fetch(`${HYPHEN_API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, hkey: hkey }),
    });

    console.log(`응답 상태: ${response.status} ${response.statusText}`);

    const rawText = await response.text();
    console.log(`응답 내용: ${rawText}`);

    if (response.ok) {
      const data = JSON.parse(rawText);
      if (data.access_token) {
        console.log("\n✅ 토큰 발급 성공!");
        console.log(
          `   토큰 (앞 50자): ${data.access_token.substring(0, 50)}...`
        );
        return true;
      }
    }

    console.error("\n❌ 토큰 발급 실패: access_token이 없습니다");
    return false;
  } catch (error) {
    console.error("❌ 토큰 발급 실패:", error);
    return false;
  }
}

async function getTestCardFromDB() {
  console.log("\n========== DB에서 테스트 카드 조회 ==========\n");

  // 테스트 조직의 첫 번째 활성 카드 조회
  const card = await prisma.corporateCard.findFirst({
    where: {
      isActive: true,
    },
    include: {
      organization: {
        select: { name: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!card) {
    throw new Error(
      "DB에 등록된 카드가 없습니다. seed-test-card.ts를 먼저 실행하세요."
    );
  }

  console.log(`✅ 카드 조회 성공`);
  console.log(`   카드 ID: ${card.id}`);
  console.log(`   카드명: ${card.cardNm}`);
  console.log(`   카드번호: ${card.cardNo}`);
  console.log(`   조직: ${card.organization.name}`);

  // 인증 정보 복호화
  console.log("\n인증 정보 복호화 중...");
  const credentials = decryptJson<CardCredentials>(card.encryptedCredentials);
  console.log(`✅ 복호화 성공`);
  console.log(`   로그인 방식: ${credentials.loginMethod}`);
  console.log(
    `   사용자 ID: ${credentials.loginMethod === "ID" ? credentials.userId : "(인증서 로그인)"}`
  );
  console.log(`   사업자번호: ${credentials.bizNo || "N/A"}`);

  return { card, credentials };
}

// CardCredentials에 cardNo가 포함된 확장 타입
type ExtendedCardCredentials = CardCredentials & {
  cardNo?: string;
};

async function testCardApprovals(
  card: { cardCd: string; cardNo: string },
  credentials: ExtendedCardCredentials
) {
  console.log("\n========== Step 2: 승인내역 조회 테스트 ==========\n");

  // 원본 카드번호는 암호화된 credentials에서 가져옴
  const originalCardNo = credentials.cardNo || card.cardNo.replace(/\*/g, "");

  const request = {
    cardCd: card.cardCd as CardCompanyCode,
    cardNo: originalCardNo,
    sdate: QUERY_PERIOD.sdate,
    edate: QUERY_PERIOD.edate,
    useArea: "D" as const,
  };

  console.log(
    "요청 파라미터:",
    JSON.stringify(
      {
        ...request,
        userId:
          credentials.loginMethod === "ID" ? credentials.userId : "(인증서)",
        userPw: "***hidden***",
        bizNo: credentials.bizNo || "N/A",
      },
      null,
      2
    )
  );

  try {
    const response = await getCardApprovals(request, credentials);

    console.log("\n✅ 승인내역 조회 성공!");
    console.log(`   조회 결과: ${response.data.list?.length || 0}건`);
    console.log(`   총 금액: ${response.data.totalAmt || "N/A"}`);

    if (response.data.list && response.data.list.length > 0) {
      console.log("\n   [승인내역 샘플 (최대 5건)]");
      response.data.list.slice(0, 5).forEach((item, i) => {
        console.log(
          `   ${i + 1}. ${item.useDt} | ${item.useStore} | ${item.useAmt}원`
        );
      });
    }

    return true;
  } catch (error: unknown) {
    console.error("\n❌ 승인내역 조회 실패:");
    if (error instanceof Error) {
      console.error("   에러 메시지:", error.message);
    }
    return false;
  }
}

async function testCardPurchases(
  card: { cardCd: string; cardNo: string },
  credentials: ExtendedCardCredentials
) {
  console.log("\n========== Step 3: 매입내역 조회 테스트 ==========\n");

  // 원본 카드번호는 암호화된 credentials에서 가져옴
  const originalCardNo = credentials.cardNo || card.cardNo.replace(/\*/g, "");

  const request = {
    cardCd: card.cardCd as CardCompanyCode,
    cardNo: originalCardNo,
    sdate: QUERY_PERIOD.sdate,
    edate: QUERY_PERIOD.edate,
    useArea: "D" as const,
  };

  console.log(
    "요청 파라미터:",
    JSON.stringify(
      {
        ...request,
        userId:
          credentials.loginMethod === "ID" ? credentials.userId : "(인증서)",
        userPw: "***hidden***",
        bizNo: credentials.bizNo || "N/A",
      },
      null,
      2
    )
  );

  try {
    const response = await getCardPurchases(request, credentials);

    console.log("\n✅ 매입내역 조회 성공!");
    console.log(`   조회 결과: ${response.data.list?.length || 0}건`);
    console.log(`   총 금액: ${response.data.totalAmt || "N/A"}`);

    if (response.data.list && response.data.list.length > 0) {
      console.log("\n   [매입내역 샘플 (최대 5건)]");
      response.data.list.slice(0, 5).forEach((item, i) => {
        console.log(
          `   ${i + 1}. ${item.useDt} | ${item.useStore} | ${item.useAmt}원 | 매입일: ${item.pchDt || "N/A"}`
        );
      });
    }

    return true;
  } catch (error: unknown) {
    console.error("\n❌ 매입내역 조회 실패:");
    if (error instanceof Error) {
      console.error("   에러 메시지:", error.message);
    }
    return false;
  }
}

async function main() {
  console.log("================================================");
  console.log("   Hyphen 법인카드 API 테스트 (DB 기반)");
  console.log("================================================");
  console.log(`조회기간: ${QUERY_PERIOD.sdate} ~ ${QUERY_PERIOD.edate}`);

  // 환경 변수 확인
  if (!process.env.HYPHEN_USER_ID || !process.env.HYPHEN_HKEY) {
    console.error(
      "\n❌ 환경 변수 오류: HYPHEN_USER_ID 또는 HYPHEN_HKEY가 설정되지 않았습니다."
    );
    console.error("   .env.local 파일을 확인하세요.");
    process.exit(1);
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error("\n❌ 환경 변수 오류: ENCRYPTION_KEY가 설정되지 않았습니다.");
    console.error("   .env.local 파일을 확인하세요.");
    process.exit(1);
  }

  console.log(`\nHyphen 계정: ${process.env.HYPHEN_USER_ID}`);

  const results = {
    oauth: false,
    dbQuery: false,
    approvals: false,
    purchases: false,
  };

  try {
    // Step 1: OAuth 토큰 테스트
    results.oauth = await testOAuthToken();

    if (!results.oauth) {
      throw new Error("OAuth 토큰 발급 실패");
    }

    // Step 2: DB에서 카드 정보 조회 및 복호화
    const { card, credentials } = await getTestCardFromDB();
    results.dbQuery = true;

    // Step 3: 승인내역 조회
    results.approvals = await testCardApprovals(card, credentials);

    // Step 4: 매입내역 조회
    results.purchases = await testCardPurchases(card, credentials);
  } catch (error) {
    console.error("\n❌ 테스트 중 오류 발생:", error);
  } finally {
    await prisma.$disconnect();
  }

  // 결과 요약
  console.log("\n================================================");
  console.log("   테스트 결과 요약");
  console.log("================================================");
  console.log(`OAuth 토큰 발급: ${results.oauth ? "✅ 성공" : "❌ 실패"}`);
  console.log(`DB 카드 조회:    ${results.dbQuery ? "✅ 성공" : "❌ 실패"}`);
  console.log(`승인내역 조회:   ${results.approvals ? "✅ 성공" : "❌ 실패"}`);
  console.log(`매입내역 조회:   ${results.purchases ? "✅ 성공" : "❌ 실패"}`);
  console.log("================================================\n");
}

main().catch(console.error);
