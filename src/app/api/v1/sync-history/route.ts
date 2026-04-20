import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getSyncHistories } from "@/lib/services/payment/sync-history-service";
import type { SyncType } from "@prisma/client";

/**
 * GET /api/v1/sync-history
 * 동기화 이력 목록 조회 (페이지네이션)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.organizationId) {
    return NextResponse.json(
      { message: "조직 정보가 필요합니다" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = (page - 1) * limit;

  const corporateCardId = searchParams.get("corporateCardId") ?? undefined;
  const typeParam = searchParams.get("type");
  const type = typeParam ? (typeParam as SyncType) : undefined;

  try {
    const result = await getSyncHistories({
      organizationId: session.user.organizationId,
      corporateCardId,
      type,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.data,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "동기화 이력 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
