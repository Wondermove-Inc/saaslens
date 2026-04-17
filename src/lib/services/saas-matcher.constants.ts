/**
 * Korean localization preset — SaaS/vendor matching patterns for Korea market.
 * Contains Korean company names (e.g., 현대카드) used for Korean financial/SaaS integrations.
 * For other markets, replace with region-specific constants or extend with a preset layer.
 */

// src/lib/services/saas-matcher.constants.ts

/**
 * Non-SaaS 키워드 목록
 * - 카드 결제에서 자주 발생하지만 SaaS가 아닌 가맹점명/키워드
 * - 카테고리별로 분류하여 관리
 */
export const NON_SAAS_KEYWORDS = [
  // ===== 교통/모빌리티 =====
  "카카오T",
  "카카오모빌리티",
  "아이엠택시",
  "아이엠택시_스마트",
  "우버",
  "UBER",
  "타다",
  "TADA",
  "쏘카",
  "SOCAR",
  "그린카",
  "GREEN CAR",
  "코레일",
  "KORAIL",
  "SRT",
  "티머니",
  "T-MONEY",
  "주차",
  "PARKING",

  // ===== 배달/음식 =====
  "우아한형제들",
  "배달의민족",
  "배민",
  "BAEMIN",
  "요기요",
  "YOGIYO",
  "쿠팡이츠",
  "COUPANG EATS",
  "땡겨요",
  "배달통",
  "푸드플라이",

  // ===== 식음료 (커피/카페/레스토랑) =====
  "스타벅스",
  "STARBUCKS",
  "이디야",
  "EDIYA",
  "투썸플레이스",
  "TWOSOME",
  "폴바셋",
  "PAUL BASSETT",
  "할리스",
  "HOLLYS",
  "파스쿠찌",
  "PASCUCCI",
  "블루보틀",
  "BLUE BOTTLE",
  "빽다방",
  "맥도날드",
  "MCDONALDS",
  "버거킹",
  "BURGER KING",
  "롯데리아",
  "KFC",
  "서브웨이",
  "SUBWAY",
  "도미노피자",
  "DOMINOS",
  "피자헛",
  "PIZZA HUT",
  "파파존스",
  "PAPA JOHNS",

  // ===== 유통/마트/편의점 =====
  "이마트",
  "EMART",
  "홈플러스",
  "HOMEPLUS",
  "롯데마트",
  "LOTTE MART",
  "코스트코",
  "COSTCO",
  "GS25",
  "CU편의점",
  "CU ",
  "세븐일레븐",
  "7-ELEVEN",
  "이마트24",
  "EMART24",
  "미니스톱",
  "MINISTOP",
  "올리브영",
  "OLIVE YOUNG",
  "다이소",
  "DAISO",
  "무신사",
  "MUSINSA",
  "쿠팡",
  "COUPANG",
  "11번가",
  "G마켓",
  "GMARKET",
  "옥션",
  "AUCTION",
  "SSG닷컴",
  "SSG.COM",
  "롯데온",
  "LOTTE ON",

  // ===== 엔터테인먼트/여가 =====
  "CGV",
  "메가박스",
  "MEGABOX",
  "롯데시네마",
  "LOTTE CINEMA",
  "넷플릭스",
  "NETFLIX",
  "왓챠",
  "WATCHA",
  "웨이브",
  "WAVVE",
  "티빙",
  "TVING",
  "멜론",
  "MELON",
  "스포티파이",
  "SPOTIFY",
  "유튜브프리미엄",
  "YOUTUBE PREMIUM",
  "디즈니플러스",
  "DISNEY+",

  // ===== 숙박/여행 =====
  "야놀자",
  "YANOLJA",
  "여기어때",
  "에어비앤비",
  "AIRBNB",
  "호텔스컴바인",
  "HOTELS.COM",
  "부킹닷컴",
  "BOOKING.COM",
  "아고다",
  "AGODA",
  "익스피디아",
  "EXPEDIA",
  "트립닷컴",
  "TRIP.COM",
  "마이리얼트립",
  "클룩",
  "KLOOK",

  // ===== 의료/건강 =====
  "병원",
  "의원",
  "약국",
  "PHARMACY",
  "치과",
  "DENTAL",
  "안과",
  "피부과",
  "정형외과",

  // ===== 교육/학원 =====
  "학원",
  "ACADEMY",
  "어학원",
  "학습지",

  // ===== 금융/보험 =====
  "은행",
  "BANK",
  "보험",
  "INSURANCE",
  "증권",
  "SECURITIES",
  "ATM",

  // ===== 주유/자동차 =====
  "주유소",
  "GAS STATION",
  "SK에너지",
  "SK ENERGY",
  "GS칼텍스",
  "GS CALTEX",
  "에쓰오일",
  "S-OIL",
  "현대오일뱅크",
  "HYUNDAI OILBANK",
  "세차",
  "CAR WASH",
  "자동차정비",
  "카센터",

  // ===== 기타 =====
  "꽃배달",
  "FLOWER",
  "세탁소",
  "LAUNDRY",
  "클리닝",
  "CLEANING",
  "미용실",
  "HAIR",
  "네일",
  "NAIL",
  "스파",
  "SPA",
  "헬스장",
  "GYM",
  "피트니스",
  "FITNESS",
];

/**
 * 가맹점명/메모에 Non-SaaS 키워드가 포함되는지 검사
 */
export function findNonSaaSKeywordHit(
  merchantName: string,
  memo?: string | null
): string | null {
  const haystacks = [merchantName, memo ?? ""]
    .filter(Boolean)
    .map((text) => text.toLowerCase());

  for (const keyword of NON_SAAS_KEYWORDS) {
    const lowerKeyword = keyword.toLowerCase();
    if (haystacks.some((text) => text.includes(lowerKeyword))) {
      return keyword;
    }
  }

  return null;
}
