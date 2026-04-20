import { NextRequest, NextResponse } from "next/server";

import { getRenewalCalendar, getRenewalsByDate } from "@/actions/subscriptions";
import { auth } from "@/lib/auth";

/**
 * GET /api/v1/subscriptions/calendar
 * - 캘린더 데이터 조회 (year, month 파라미터)
 * - 특정 날짜 갱신 조회 (date 파라미터)
 */
import { withLogging } from "@/lib/logging";

/**
 * GET /api/v1/subscriptions/calendar
 * - 캘린더 데이터 조회 (year, month 파라미터)
 * - 특정 날짜 갱신 조회 (date 파라미터)
 */
export const GET = withLogging(
  "GET /api/v1/subscriptions/calendar",
  async (request: NextRequest) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // 특정 날짜 조회
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const result = await getRenewalsByDate(dateParam);
      return NextResponse.json(result);
    }

    // 캘린더 월별 데이터 조회
    const today = new Date();
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year = yearParam ? parseInt(yearParam, 10) : today.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : today.getMonth() + 1;

    // 유효성 검증
    const validYear = year >= 2020 && year <= 2100 ? year : today.getFullYear();
    const validMonth = month >= 1 && month <= 12 ? month : today.getMonth() + 1;

    const result = await getRenewalCalendar(validYear, validMonth);
    return NextResponse.json(result);
  }
);
