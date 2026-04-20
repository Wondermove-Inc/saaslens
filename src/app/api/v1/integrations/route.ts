import { NextRequest, NextResponse } from "next/server";

import { createIntegration, getIntegrations } from "@/actions/integrations";
import { withApiAuth } from "@/lib/api/auth-middleware";
import { withLogging } from "@/lib/logging";
import {
  createIntegrationApiSchema,
  formatValidationError,
  paginationSchema,
} from "@/lib/validations/api";
import { IntegrationStatus } from "@prisma/client";

/**
 * GET /api/v1/integrations
 * - 연동 목록 조회
 */
export const GET = withLogging(
  "GET /api/v1/integrations",
  withApiAuth(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);

    // 페이지네이션 검증
    const paginationResult = paginationSchema.safeParse({
      page: Number(searchParams.get("page") ?? "1"),
      limit: Number(searchParams.get("limit") ?? "20"),
    });

    if (!paginationResult.success) {
      return NextResponse.json(formatValidationError(paginationResult.error), {
        status: 400,
      });
    }

    const { page, limit } = paginationResult.data;

    const sortBy = (searchParams.get("sortBy") ?? "createdAt") as
      | "createdAt"
      | "updatedAt"
      | "type";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as
      | "asc"
      | "desc";

    const statusParam = searchParams.get("status");
    const filter = {
      category: searchParams.get("category") ?? undefined,
      status: statusParam ? (statusParam as IntegrationStatus) : undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const result = await getIntegrations({
      filter,
      sort: { sortBy, sortOrder },
      page,
      limit,
    });

    return NextResponse.json(result);
  })
);

/**
 * POST /api/v1/integrations
 * - 연동 생성 (ADMIN만 가능)
 */
export const POST = withLogging(
  "POST /api/v1/integrations",
  withApiAuth(
    async (request: NextRequest) => {
      const body = await request.json();

      // 입력 검증
      const validationResult = createIntegrationApiSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          formatValidationError(validationResult.error),
          {
            status: 400,
          }
        );
      }

      const result = await createIntegration(validationResult.data);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    },
    { requireAdmin: true }
  )
);
