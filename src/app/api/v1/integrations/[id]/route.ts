import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteIntegration,
  getIntegration,
  updateIntegrationStatus,
} from "@/actions/integrations";
import { auth } from "@/lib/auth";
import { formatValidationError, uuidParamSchema } from "@/lib/validations/api";

type RouteContext = { params: Promise<{ id: string }> };

// 상태 업데이트 스키마 (IntegrationStatus enum 값과 일치)
const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "ERROR", "DISCONNECTED"]),
});

/**
 * 인증 검증 헬퍼
 */
async function requireAuth() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return null;
  }
  return session;
}

/**
 * GET /api/v1/integrations/[id]
 * - 연동 상세 조회
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;

  // ID 검증
  const idResult = uuidParamSchema.safeParse(id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: "잘못된 ID 형식입니다" },
      { status: 400 }
    );
  }

  const result = await getIntegration(id);

  if (!result.success) {
    const status =
      result.message === "연동을 찾을 수 없습니다"
        ? 404
        : result.message === "접근 권한이 없습니다"
          ? 403
          : 400;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json(result.data?.integration);
}

/**
 * PUT /api/v1/integrations/[id]
 * - 연동 상태 업데이트 (ADMIN만 가능)
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  // ADMIN 권한 체크
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다" },
      { status: 403 }
    );
  }

  const { id } = await params;

  // ID 검증
  const idResult = uuidParamSchema.safeParse(id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: "잘못된 ID 형식입니다" },
      { status: 400 }
    );
  }

  const body = await request.json();

  // 상태 검증
  const statusResult = updateStatusSchema.safeParse(body);
  if (!statusResult.success) {
    return NextResponse.json(formatValidationError(statusResult.error), {
      status: 400,
    });
  }

  const result = await updateIntegrationStatus(id, statusResult.data.status);
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}

/**
 * DELETE /api/v1/integrations/[id]
 * - 연동 삭제 (ADMIN만 가능)
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  // ADMIN 권한 체크
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다" },
      { status: 403 }
    );
  }

  const { id } = await params;

  // ID 검증
  const idResult = uuidParamSchema.safeParse(id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: "잘못된 ID 형식입니다" },
      { status: 400 }
    );
  }

  const result = await deleteIntegration(id);
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
