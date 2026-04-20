import { NextRequest, NextResponse } from "next/server";

import { syncCardTransactions } from "@/actions/cards/card-sync";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/cards/[id]/retry-sync
 * 법인카드 동기화 재시도 (triggeredBy: RETRY)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
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

  const { id } = await context.params;

  // Verify card belongs to user's organization
  const card = await prisma.corporateCard.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId,
    },
  });

  if (!card) {
    return NextResponse.json(
      { message: "카드를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  try {
    const result = await syncCardTransactions(id, { triggeredBy: "RETRY" });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "카드 동기화 재시도 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
