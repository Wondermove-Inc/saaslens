// FleetDM 데이터 동기화 서비스
import { prisma } from "@/lib/db";
import type { DevicePlatform, DeviceStatus, Prisma } from "@prisma/client";
import { FleetDMClient } from "./client";
import type { FleetDMHost, FleetDMSoftware } from "./types";
import { FLEETDM_PLATFORM_MAP, FLEETDM_STATUS_MAP } from "./types";

/**
 * FleetDM 호스트를 SMP Device로 변환
 */
function mapFleetDMHostToDevice(
  host: FleetDMHost,
  organizationId: string
): Prisma.DeviceCreateInput {
  return {
    organization: { connect: { id: organizationId } },
    fleetId: String(host.id),
    hostname: host.hostname || host.display_name,
    platform: (FLEETDM_PLATFORM_MAP[host.platform] ||
      "OTHER") as DevicePlatform,
    osVersion: host.os_version,
    hardwareModel: host.hardware_model,
    hardwareSerial: host.hardware_serial,
    status: (FLEETDM_STATUS_MAP[host.status] || "PENDING") as DeviceStatus,
    lastSeenAt: host.seen_time ? new Date(host.seen_time) : null,
    enrolledAt: host.last_enrolled_at ? new Date(host.last_enrolled_at) : null,
    agentVersion: host.osquery_version,
  };
}

/**
 * FleetDM 소프트웨어를 SMP DeviceApp으로 변환
 */
function mapFleetDMSoftwareToDeviceApp(
  software: FleetDMSoftware,
  deviceId: string
): Prisma.DeviceAppCreateInput {
  return {
    device: { connect: { id: deviceId } },
    name: software.name,
    version: software.version,
    bundleIdentifier: software.bundle_identifier,
    approvalStatus: "UNKNOWN",
  };
}

/**
 * 단일 호스트 동기화
 */
export async function syncHostFromFleetDM(
  host: FleetDMHost,
  organizationId: string
): Promise<string> {
  const deviceData = mapFleetDMHostToDevice(host, organizationId);

  const device = await prisma.device.upsert({
    where: {
      organizationId_fleetId: {
        organizationId,
        fleetId: String(host.id),
      },
    },
    create: deviceData,
    update: {
      hostname: deviceData.hostname,
      platform: deviceData.platform,
      osVersion: deviceData.osVersion,
      hardwareModel: deviceData.hardwareModel,
      hardwareSerial: deviceData.hardwareSerial,
      status: deviceData.status,
      lastSeenAt: deviceData.lastSeenAt,
      agentVersion: deviceData.agentVersion,
      updatedAt: new Date(),
    },
  });

  return device.id;
}

/**
 * 호스트의 소프트웨어 동기화
 */
export async function syncHostSoftwareFromFleetDM(
  deviceId: string,
  software: FleetDMSoftware[]
): Promise<number> {
  // 기존 앱 목록 조회
  const existingApps = await prisma.deviceApp.findMany({
    where: { deviceId },
    select: { id: true, name: true, version: true },
  });

  const existingAppMap = new Map(
    existingApps.map((app) => [`${app.name}:${app.version}`, app.id])
  );

  let syncedCount = 0;

  for (const sw of software) {
    const key = `${sw.name}:${sw.version}`;
    const existingAppId = existingAppMap.get(key);

    if (existingAppId) {
      // 기존 앱 업데이트
      await prisma.deviceApp.update({
        where: { id: existingAppId },
        data: {
          bundleIdentifier: sw.bundle_identifier,
          updatedAt: new Date(),
        },
      });
      existingAppMap.delete(key);
    } else {
      // 새 앱 생성
      await prisma.deviceApp.create({
        data: mapFleetDMSoftwareToDeviceApp(sw, deviceId),
      });
    }
    syncedCount++;
  }

  // 더 이상 설치되지 않은 앱 삭제 (선택적)
  // 주석 처리: 삭제하지 않고 유지
  // const removedAppIds = Array.from(existingAppMap.values());
  // if (removedAppIds.length > 0) {
  //   await prisma.deviceApp.deleteMany({
  //     where: { id: { in: removedAppIds } },
  //   });
  // }

  return syncedCount;
}

/**
 * DeviceApp에서 UserAppAccess로 동기화
 * - Device에 연결된 사용자가 있고
 * - DeviceApp에 매칭된 앱(matchedAppId)이 있는 경우
 * - UserAppAccess 레코드를 생성/업데이트
 */
export async function syncUserAppAccessFromDevice(
  deviceId: string
): Promise<number> {
  // 디바이스와 연결된 사용자 확인
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { userId: true },
  });

  if (!device?.userId) {
    // 디바이스에 연결된 사용자가 없으면 동기화 불필요
    return 0;
  }

  // 매칭된 앱이 있는 DeviceApp 조회
  const deviceApps = await prisma.deviceApp.findMany({
    where: {
      deviceId,
      matchedAppId: { not: null },
    },
    select: {
      matchedAppId: true,
      lastUsedAt: true,
    },
  });

  let syncedCount = 0;

  for (const deviceApp of deviceApps) {
    if (!deviceApp.matchedAppId) continue;

    try {
      // UserAppAccess upsert
      await prisma.userAppAccess.upsert({
        where: {
          userId_appId: {
            userId: device.userId,
            appId: deviceApp.matchedAppId,
          },
        },
        create: {
          userId: device.userId,
          appId: deviceApp.matchedAppId,
          source: "FLEET_DM",
          lastUsedAt: deviceApp.lastUsedAt,
        },
        update: {
          // 더 최신 lastUsedAt으로 업데이트
          lastUsedAt: deviceApp.lastUsedAt,
          updatedAt: new Date(),
        },
      });
      syncedCount++;
    } catch (error) {
      // 중복 등 오류 무시하고 계속 진행
      console.error(
        `UserAppAccess sync failed for app ${deviceApp.matchedAppId}:`,
        error
      );
    }
  }

  return syncedCount;
}

/**
 * 전체 동기화 (배치)
 */
export async function syncAllFromFleetDM(
  client: FleetDMClient,
  organizationId: string,
  options?: {
    syncSoftware?: boolean;
    syncUserAppAccess?: boolean;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<{
  hostsSync: number;
  softwareSync: number;
  userAppAccessSync: number;
  errors: string[];
}> {
  const {
    syncSoftware = true,
    syncUserAppAccess = true,
    onProgress,
  } = options ?? {};
  const errors: string[] = [];

  // 1. 호스트 목록 가져오기
  const hosts = await client.getHosts({ perPage: 1000 });
  let hostsSync = 0;
  let softwareSync = 0;
  let userAppAccessSync = 0;

  // 2. 호스트별 동기화
  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i];

    try {
      const deviceId = await syncHostFromFleetDM(host, organizationId);
      hostsSync++;

      // 3. 소프트웨어 동기화 (옵션)
      if (syncSoftware) {
        try {
          const software = await client.getHostSoftware(host.id, {
            perPage: 500,
          });
          const count = await syncHostSoftwareFromFleetDM(deviceId, software);
          softwareSync += count;
        } catch (err) {
          errors.push(
            `Software sync failed for host ${host.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      // 4. UserAppAccess 동기화 (옵션)
      if (syncUserAppAccess) {
        try {
          const count = await syncUserAppAccessFromDevice(deviceId);
          userAppAccessSync += count;
        } catch (err) {
          errors.push(
            `UserAppAccess sync failed for host ${host.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    } catch (err) {
      errors.push(
        `Host sync failed for ${host.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 진행률 콜백
    onProgress?.(i + 1, hosts.length);
  }

  return {
    hostsSync,
    softwareSync,
    userAppAccessSync,
    errors,
  };
}

/**
 * Integration 설정에서 FleetDM 클라이언트 생성
 */
export async function getFleetDMClientFromIntegration(
  integrationId: string
): Promise<FleetDMClient | null> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || integration.type !== "FLEETDM") {
    return null;
  }

  const credentials = integration.credentials as {
    baseUrl?: string;
    apiToken?: string;
    teamId?: number;
  };

  if (!credentials.baseUrl || !credentials.apiToken) {
    return null;
  }

  return new FleetDMClient({
    baseUrl: credentials.baseUrl,
    apiToken: credentials.apiToken,
    teamId: credentials.teamId,
  });
}

/**
 * 조직의 FleetDM 연동에서 클라이언트 가져오기
 */
export async function getFleetDMClientForOrganization(
  organizationId: string
): Promise<FleetDMClient | null> {
  const integration = await prisma.integration.findFirst({
    where: {
      organizationId,
      type: "FLEETDM",
      status: "ACTIVE",
    },
  });

  if (!integration) {
    return null;
  }

  return getFleetDMClientFromIntegration(integration.id);
}
