import { NextRequest, NextResponse } from "next/server";

import { syncIntegrationNow } from "@/actions/integrations";
import { auth } from "@/lib/auth";

/**
 * POST /api/v1/integrations/[id]/sync
 * - 연동 수동 동기화 트리거
 * - 권한: ADMIN만
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // ADMIN만 동기화 가능
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { message: "연동 동기화 권한이 없습니다" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const result = await syncIntegrationNow(id);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
