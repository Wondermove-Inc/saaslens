import { NextRequest, NextResponse } from "next/server";

import { createSubscription, getSubscriptions } from "@/actions/subscriptions";
import { auth } from "@/lib/auth";
import type {
  SubscriptionFilterOptions,
  SubscriptionSortOptions,
} from "@/types/subscription";
import { BillingCycle, SubscriptionStatus } from "@prisma/client";

/**
 * GET /api/v1/subscriptions
 * - 목록 조회 (필터/정렬/페이지네이션)
 */
import { withLogging } from "@/lib/logging";

/**
 * GET /api/v1/subscriptions
 * - 목록 조회 (필터/정렬/페이지네이션)
 */
export const GET = withLogging(
  "GET /api/v1/subscriptions",
  async (request: NextRequest) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const sortBy = (searchParams.get("sortBy") ??
      "renewalDate") as SubscriptionSortOptions["sortBy"];
    const sortOrder = (searchParams.get("sortOrder") ??
      "asc") as SubscriptionSortOptions["sortOrder"];

    const statusParam = searchParams.get("status");
    const billingCycleParam = searchParams.get("billingCycle");

    const filter: SubscriptionFilterOptions = {
      status: statusParam ? (statusParam as SubscriptionStatus) : undefined,
      appId: searchParams.get("appId") ?? undefined,
      billingCycle: billingCycleParam
        ? (billingCycleParam as BillingCycle)
        : undefined,
      search: searchParams.get("search") ?? undefined,
      renewingWithinDays: searchParams.get("renewingWithinDays")
        ? Number(searchParams.get("renewingWithinDays"))
        : undefined,
    };

    const result = await getSubscriptions({
      filter,
      sort: { sortBy, sortOrder },
      page,
      limit,
    });

    return NextResponse.json(result);
  }
);

/**
 * POST /api/v1/subscriptions
 * - 구독 생성 (FormData 기반 Server Action 래핑)
 * - 권한: ADMIN, MEMBER (VIEWER 차단)
 */

/**
 * POST /api/v1/subscriptions
 * - 구독 생성 (FormData 기반 Server Action 래핑)
 * - 권한: ADMIN, MEMBER (VIEWER 차단)
 */
export const POST = withLogging(
  "POST /api/v1/subscriptions",
  async (request: NextRequest) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // VIEWER는 구독 생성 불가
    if (session.user.role === "VIEWER") {
      return NextResponse.json(
        { message: "읽기 전용 사용자는 구독을 생성할 수 없습니다" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const formData = new FormData();

    Object.entries(body ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // 배열 처리 (assignedUserIds 등)
        if (Array.isArray(value)) {
          value.forEach((item) => formData.append(key, String(item)));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const result = await createSubscription({ success: false }, formData);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  }
);
