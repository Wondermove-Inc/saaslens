// src/lib/services/fleetdm/deviceService.ts
import { prisma } from "@/lib/db";
import type {
  Device,
  DeviceApp,
  DeviceAppApprovalStatus,
  DevicePlatform,
  DeviceStatus,
} from "@prisma/client";

// 디바이스 + 관계 타입
export type DeviceWithApps = Device & {
  user: { id: string; name: string | null; email: string } | null;
  deviceApps: (DeviceApp & {
    matchedApp: { id: string; name: string } | null;
  })[];
};

export type DeviceListItem = Device & {
  user: { id: string; name: string | null; email: string } | null;
  _count: { deviceApps: number };
};

// 디바이스 통계 타입
export interface DeviceStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  pendingDevices: number;
  totalApps: number;
  shadowITApps: number;
  installationRate: number; // 에이전트 설치율 (0-1)
}

// Shadow IT 앱 요약 타입
export interface ShadowITAppSummary {
  name: string;
  deviceCount: number;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
}

// 필터 옵션
export interface DeviceFilterOptions {
  status?: DeviceStatus;
  platform?: DevicePlatform;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// 페이지네이션 결과
export interface DeviceListResult {
  devices: DeviceListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 조직의 디바이스 목록 조회
 */
export async function getDevices(
  organizationId: string,
  options: DeviceFilterOptions = {}
): Promise<DeviceListResult> {
  const { status, platform, userId, search, page = 1, limit = 20 } = options;

  const where = {
    organizationId,
    ...(status && { status }),
    ...(platform && { platform }),
    ...(userId && { userId }),
    ...(search && {
      OR: [
        { hostname: { contains: search, mode: "insensitive" as const } },
        { hardwareSerial: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [devices, total] = await Promise.all([
    prisma.device.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { deviceApps: true },
        },
      },
      orderBy: { lastSeenAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.device.count({ where }),
  ]);

  return {
    devices: devices as DeviceListItem[],
    total,
    page,
    limit,
  };
}

/**
 * 디바이스 상세 조회 (앱 목록 포함)
 */
export async function getDeviceById(
  deviceId: string,
  organizationId: string
): Promise<DeviceWithApps | null> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId, organizationId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      deviceApps: {
        include: {
          matchedApp: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  return device as DeviceWithApps | null;
}

/**
 * 디바이스 통계 조회
 */
export async function getDeviceStats(
  organizationId: string
): Promise<DeviceStats> {
  const [
    totalDevices,
    onlineDevices,
    offlineDevices,
    pendingDevices,
    totalApps,
    shadowITApps,
  ] = await Promise.all([
    prisma.device.count({ where: { organizationId } }),
    prisma.device.count({ where: { organizationId, status: "ONLINE" } }),
    prisma.device.count({ where: { organizationId, status: "OFFLINE" } }),
    prisma.device.count({ where: { organizationId, status: "PENDING" } }),
    prisma.deviceApp.count({
      where: { device: { organizationId } },
    }),
    prisma.deviceApp.count({
      where: {
        device: { organizationId },
        approvalStatus: "SHADOW_IT",
      },
    }),
  ]);

  // 설치율 계산: (온라인 + 오프라인) / 전체
  // 대기 중(PENDING)인 디바이스는 설치 안 된 것으로 간주
  const installedDevices = onlineDevices + offlineDevices;
  const installationRate =
    totalDevices > 0 ? installedDevices / totalDevices : 0;

  return {
    totalDevices,
    onlineDevices,
    offlineDevices,
    pendingDevices,
    totalApps,
    shadowITApps,
    installationRate,
  };
}

/**
 * 디바이스에 설치된 앱 목록 조회
 */
export async function getDeviceApps(
  deviceId: string
): Promise<
  (DeviceApp & { matchedApp: { id: string; name: string } | null })[]
> {
  const apps = await prisma.deviceApp.findMany({
    where: { deviceId },
    include: {
      matchedApp: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ approvalStatus: "asc" }, { name: "asc" }],
  });

  return apps;
}

/**
 * 조직의 Shadow IT 앱 목록 조회 (그룹화)
 */
export async function getShadowITApps(
  organizationId: string
): Promise<ShadowITAppSummary[]> {
  const groupedApps = await prisma.deviceApp.groupBy({
    by: ["name"],
    where: {
      device: { organizationId },
      approvalStatus: "SHADOW_IT",
    },
    _count: { _all: true },
  });

  return groupedApps.map((group) => ({
    name: group.name,
    deviceCount: group._count._all,
  }));
}

/**
 * 앱 승인 상태 일괄 업데이트 (앱 이름 기준)
 */
export async function updateDeviceAppApprovalStatus(
  organizationId: string,
  appName: string,
  status: DeviceAppApprovalStatus
): Promise<{ success: boolean; updatedCount: number }> {
  // 해당 조직의 디바이스에 설치된 해당 앱 찾기
  const appsToUpdate = await prisma.deviceApp.findMany({
    where: {
      name: appName,
      device: { organizationId },
    },
    select: { id: true, deviceId: true },
  });

  if (appsToUpdate.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  // 트랜잭션으로 일괄 업데이트
  await prisma.$transaction(
    appsToUpdate.map((app) =>
      prisma.deviceApp.update({
        where: { id: app.id },
        data: { approvalStatus: status },
      })
    )
  );

  return { success: true, updatedCount: appsToUpdate.length };
}

/**
 * 에이전트 미설치 사용자 목록 조회
 */
export async function getUsersWithoutAgent(
  organizationId: string
): Promise<{ id: string; name: string | null; email: string }[]> {
  // 디바이스가 연결된 사용자 ID 조회
  const devicesWithUsers = await prisma.device.findMany({
    where: {
      organizationId,
      userId: { not: null },
      status: { not: "RETIRED" },
    },
    select: { userId: true },
  });

  const usersWithDevices = new Set(
    devicesWithUsers.map((d) => d.userId).filter(Boolean)
  );

  // 디바이스가 없는 활성 사용자 조회
  const usersWithoutAgent = await prisma.user.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      id: { notIn: Array.from(usersWithDevices) as string[] },
    },
    select: { id: true, name: true, email: true },
  });

  return usersWithoutAgent;
}
