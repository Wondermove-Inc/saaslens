import { NextRequest, NextResponse } from "next/server";

import { getUsers } from "@/actions/users";
import { auth } from "@/lib/auth";
import type { UserFilterOptions, UserSortOptions } from "@/types/user";

/**
 * GET /api/v1/users
 * - 사용자 목록 조회 (필터/정렬/페이지네이션)
 */
import { withLogging } from "@/lib/logging";

/**
 * GET /api/v1/users
 * - 사용자 목록 조회 (필터/정렬/페이지네이션)
 */
export const GET = withLogging(
  "GET /api/v1/users",
  async (request: NextRequest) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const sortBy = (searchParams.get("sortBy") ??
      "createdAt") as UserSortOptions["sortBy"];
    const sortOrder = (searchParams.get("sortOrder") ??
      "desc") as UserSortOptions["sortOrder"];

    const filter: UserFilterOptions = {
      role: (searchParams.get("role") ??
        undefined) as UserFilterOptions["role"],
      search: searchParams.get("search") ?? undefined,
    };

    const result = await getUsers({
      filter,
      sort: { sortBy, sortOrder },
      page,
      limit,
    });

    return NextResponse.json(result);
  }
);
