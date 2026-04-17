import { NextRequest, NextResponse } from "next/server";

import { deleteApp, getApp, updateApp } from "@/actions/apps";
import { auth } from "@/lib/auth";

/**
 * GET /api/v1/apps/[id]
 * - 앱 상세 조회
 */
import { withLogging } from "@/lib/logging";

/**
 * GET /api/v1/apps/[id]
 * - 앱 상세 조회
 */
export const GET = withLogging(
  "GET /api/v1/apps/:id",
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const app = await getApp(id);
    if (!app) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(app);
  }
);

/**
 * PUT /api/v1/apps/[id]
 * - 앱 수정
 * - 권한: ADMIN만
 */

/**
 * PUT /api/v1/apps/[id]
 * - 앱 수정
 * - 권한: ADMIN만
 */
export const PUT = withLogging(
  "PUT /api/v1/apps/:id",
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // ADMIN만 수정 가능
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "앱 수정 권한이 없습니다" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const formData = new FormData();
    Object.entries(body ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => formData.append(key, String(item)));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const result = await updateApp(id, { success: false }, formData);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  }
);

/**
 * DELETE /api/v1/apps/[id]
 * - 앱 삭제
 * - 권한: ADMIN만
 */

/**
 * DELETE /api/v1/apps/[id]
 * - 앱 삭제
 * - 권한: ADMIN만
 */
export const DELETE = withLogging(
  "DELETE /api/v1/apps/:id",
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // ADMIN만 삭제 가능
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "앱 삭제 권한이 없습니다" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const result = await deleteApp(id);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  }
);
