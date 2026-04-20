// src/app/api/v1/terminated-users/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";

export const GET = withLogging(
  "GET /api/v1/terminated-users",
  async (request: NextRequest) => {
    try {
      const session = await auth();

      if (!session?.user?.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const search = searchParams.get("search") || "";
      const skip = (page - 1) * limit;

      // Build where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        organizationId: session.user.organizationId,
        status: "TERMINATED",
      };

      // Add search filter
      if (search) {
        where.OR = [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { terminatedAt: "desc" },
          include: {
            _count: {
              select: { appAccesses: true, subscriptionAssignments: true },
            },
            appAccesses: {
              include: {
                app: {
                  include: {
                    catalog: true,
                  },
                },
              },
            },
            subscriptionAssignments: {
              include: {
                subscription: {
                  include: {
                    app: { include: { catalog: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      const data = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        department: user.department,
        jobTitle: user.jobTitle,
        terminatedAt: user.terminatedAt,
        unrevokedAccessCount:
          user._count.appAccesses + user._count.subscriptionAssignments,
        appAccesses: user.appAccesses.map((access) => ({
          id: access.id,
          appId: access.appId,
          appName: access.app.name,
          appLogoUrl:
            access.app.customLogoUrl || access.app.catalog?.logoUrl || null,
          accessLevel: access.accessLevel,
          grantedAt: access.grantedAt,
          lastUsedAt: access.lastUsedAt,
          source: access.source,
        })),
        subscriptionAssignments: user.subscriptionAssignments.map((sa) => ({
          id: sa.id,
          subscriptionId: sa.subscriptionId,
          appId: sa.subscription.appId,
          appName: sa.subscription.app.name,
          appLogoUrl:
            sa.subscription.app.customLogoUrl ||
            sa.subscription.app.catalog?.logoUrl ||
            null,
          billingCycle: sa.subscription.billingCycle,
          billingType: sa.subscription.billingType,
          assignedAt: sa.assignedAt,
        })),
      }));

      return NextResponse.json({
        items: data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      logger.error({ err: error }, "[API] Failed to fetch terminated users");
      return NextResponse.json(
        { error: "Failed to fetch terminated users" },
        { status: 500 }
      );
    }
  }
);
