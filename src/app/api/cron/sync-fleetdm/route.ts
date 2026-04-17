// FleetDM 동기화 Cron Job
// Schedule: 매 3시간 (vercel.json에서 설정)
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withCronAuth } from "@/lib/middleware";
import { FleetDMClient } from "@/lib/services/fleetdm/client";
import { syncAllFromFleetDM } from "@/lib/services/fleetdm/sync";
import { NextRequest, NextResponse } from "next/server";

async function handleSync(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 2. 활성 FleetDM 연동 조회
    const integrations = await prisma.integration.findMany({
      where: {
        type: "FLEETDM",
        status: "ACTIVE",
      },
      select: {
        id: true,
        organizationId: true,
        credentials: true,
      },
    });

    if (integrations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active FleetDM integrations found",
        synced: 0,
      });
    }

    // 3. 각 연동별 동기화 실행
    const results: Array<{
      organizationId: string;
      hostsSync: number;
      softwareSync: number;
      errors: string[];
      duration: number;
    }> = [];

    for (const integration of integrations) {
      const syncStartTime = Date.now();

      try {
        const credentials = integration.credentials as {
          baseUrl?: string;
          apiToken?: string;
          teamId?: number;
        };

        if (!credentials.baseUrl || !credentials.apiToken) {
          results.push({
            organizationId: integration.organizationId,
            hostsSync: 0,
            softwareSync: 0,
            errors: ["Invalid credentials"],
            duration: 0,
          });
          continue;
        }

        const client = new FleetDMClient({
          baseUrl: credentials.baseUrl,
          apiToken: credentials.apiToken,
          teamId: credentials.teamId,
        });

        // 연결 테스트
        const isConnected = await client.testConnection();
        if (!isConnected) {
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              lastError: "Connection failed",
              updatedAt: new Date(),
            },
          });

          results.push({
            organizationId: integration.organizationId,
            hostsSync: 0,
            softwareSync: 0,
            errors: ["Connection failed"],
            duration: Date.now() - syncStartTime,
          });
          continue;
        }

        // 동기화 실행
        const syncResult = await syncAllFromFleetDM(
          client,
          integration.organizationId,
          { syncSoftware: true }
        );

        // 연동 상태 업데이트
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            lastError:
              syncResult.errors.length > 0
                ? syncResult.errors.join("; ")
                : null,
            updatedAt: new Date(),
          },
        });

        results.push({
          organizationId: integration.organizationId,
          hostsSync: syncResult.hostsSync,
          softwareSync: syncResult.softwareSync,
          errors: syncResult.errors,
          duration: Date.now() - syncStartTime,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            lastError: errorMessage,
            updatedAt: new Date(),
          },
        });

        results.push({
          organizationId: integration.organizationId,
          hostsSync: 0,
          softwareSync: 0,
          errors: [errorMessage],
          duration: Date.now() - syncStartTime,
        });
      }
    }

    // 4. 결과 반환
    const totalHosts = results.reduce((sum, r) => sum + r.hostsSync, 0);
    const totalSoftware = results.reduce((sum, r) => sum + r.softwareSync, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      summary: {
        integrations_processed: integrations.length,
        total_hosts_synced: totalHosts,
        total_software_synced: totalSoftware,
        total_errors: totalErrors,
      },
      details: results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, "[FleetDM Cron] Error");

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// GET (Vercel Cron에서 호출)
export const GET = withCronAuth(handleSync);

// POST (수동 트리거용)
export const POST = withCronAuth(handleSync);
