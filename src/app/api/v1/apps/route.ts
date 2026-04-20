import { NextRequest, NextResponse } from "next/server";

import { createApp, getApps } from "@/actions/apps";
import { auth } from "@/lib/auth";
import type { AppFilterOptions, AppSortOptions } from "@/types/app";
import { AppSource, AppStatus } from "@prisma/client";

/**
 * GET /api/v1/apps
 * - 목록 조회 (필터/정렬/페이지네이션)
 */
import { withLogging } from "@/lib/logging";

/**
 * GET /api/v1/apps
 * - 목록 조회 (필터/정렬/페이지네이션)
 */
export const GET = withLogging(
  "GET /api/v1/apps",
  async (request: NextRequest) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const sortBy = (searchParams.get("sortBy") ??
      "createdAt") as AppSortOptions["sortBy"];
    const sortOrder = (searchParams.get("sortOrder") ??
      "desc") as AppSortOptions["sortOrder"];

    const statusParam = searchParams.get("status");
    const sourceParam = searchParams.get("source");

    const filter: AppFilterOptions = {
      status: statusParam ? (statusParam as AppStatus) : undefined,
      source: sourceParam ? (sourceParam as AppSource) : undefined,
      category: searchParams.get("category") ?? undefined,
      ownerId: searchParams.get("ownerId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const result = await getApps({
      filter,
      sort: { sortBy, sortOrder },
      page,
      limit,
    });

    return NextResponse.json(result);
  }
);

/**
 * POST /api/v1/apps
 * - 앱 생성 (FormData 기반 Server Action 래핑)
 * - 권한: ADMIN, MEMBER (VIEWER 차단)
 */
export const POST = withLogging(
  "POST /api/v1/apps",
  async (request: NextRequest) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // VIEWER는 앱 생성 불가
    if (session.user.role === "VIEWER") {
      return NextResponse.json(
        { message: "읽기 전용 사용자는 앱을 생성할 수 없습니다" },
        { status: 403 }
      );
    }

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

    const result = await createApp({ success: false }, formData);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  }
);
