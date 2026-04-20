import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { rematchRecords } from "@/lib/services/payment/rematch-service";

const VALID_RECORD_TYPES = ["payment", "card-transaction"] as const;
type RecordType = (typeof VALID_RECORD_TYPES)[number];

/**
 * POST /api/v1/payments/rematch
 * 결제 레코드 또는 카드 거래내역 재매칭
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 본문이 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const { recordType, recordIds } = body as {
    recordType?: unknown;
    recordIds?: unknown;
  };

  if (!recordType || !VALID_RECORD_TYPES.includes(recordType as RecordType)) {
    return NextResponse.json(
      {
        message: 'recordType은 "payment" 또는 "card-transaction"이어야 합니다',
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    return NextResponse.json(
      { message: "recordIds는 비어있지 않은 배열이어야 합니다" },
      { status: 400 }
    );
  }

  try {
    const result = await rematchRecords({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      recordType: recordType as RecordType,
      recordIds: recordIds as string[],
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "재매칭이 이미 진행 중입니다"
    ) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: "재매칭 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
