"use server";

// src/actions/extensions/status.ts
/**
 * Server Actions for Extension Status Monitoring
 */

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface ExtensionDeviceStatusItem {
  id: string;
  deviceKey: string;
  userName: string | null;
  userEmail: string | null;
  extensionVersion: string | null;
  browserInfo: string | null;
  osInfo: string | null;
  status: "PENDING" | "APPROVED" | "REVOKED" | "INACTIVE";
  computedStatus: "active" | "inactive" | "pending" | "revoked";
  lastSeenAt: string | null;
  onboardingCompletedAt: string | null;
  onboardingEmail: string | null;
  createdAt: string;
}

export interface ExtensionStatusStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  revoked: number;
}

export interface ExtensionStatusFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: "all" | "active" | "inactive" | "pending" | "revoked";
}

export interface ExtensionStatusResult {
  data: ExtensionDeviceStatusItem[];
  stats: ExtensionStatusStats;
  inactiveThresholdMinutes: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Compute device status based on onboarding and lastSeenAt
 */
function computeDeviceStatus(
  device: {
    status: string;
    onboardingCompletedAt: Date | null;
    lastSeenAt: Date | null;
  },
  thresholdMinutes: number
): "active" | "inactive" | "pending" | "revoked" {
  if (device.status === "REVOKED") return "revoked";
  if (!device.onboardingCompletedAt) return "pending";

  if (!device.lastSeenAt) return "inactive";

  const thresholdMs = thresholdMinutes * 60 * 1000;
  const timeSinceLastSeen = Date.now() - device.lastSeenAt.getTime();

  return timeSinceLastSeen <= thresholdMs ? "active" : "inactive";
}

/**
 * Get extension device status list with stats
 */
export async function getExtensionStatus(
  filters: ExtensionStatusFilters
): Promise<ExtensionStatusResult> {
  const { organizationId } = await requireOrganization();
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 50, 100);

  // Get organization threshold
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { inactiveThresholdMinutes: true },
  });
  const thresholdMinutes = org?.inactiveThresholdMinutes ?? 30;

  // Build where clause
  const whereClause: Record<string, unknown> = {
    organizationId,
  };

  // Search filter (name or email)
  if (filters.search) {
    whereClause.OR = [
      {
        user: {
          name: { contains: filters.search, mode: "insensitive" },
        },
      },
      {
        user: {
          email: { contains: filters.search, mode: "insensitive" },
        },
      },
      {
        onboardingEmail: { contains: filters.search, mode: "insensitive" },
      },
      {
        deviceKey: { contains: filters.search, mode: "insensitive" },
      },
    ];
  }

  // DB status filter (only for REVOKED/PENDING)
  if (filters.status === "revoked") {
    whereClause.status = "REVOKED";
  } else if (filters.status === "pending") {
    whereClause.onboardingCompletedAt = null;
    whereClause.status = { not: "REVOKED" };
  }

  // Get all devices for stats calculation
  const allDevices = await prisma.extensionDevice.findMany({
    where: { organizationId },
    select: {
      status: true,
      onboardingCompletedAt: true,
      lastSeenAt: true,
    },
  });

  // Calculate stats
  const stats: ExtensionStatusStats = {
    total: allDevices.length,
    active: 0,
    inactive: 0,
    pending: 0,
    revoked: 0,
  };

  for (const device of allDevices) {
    const computed = computeDeviceStatus(device, thresholdMinutes);
    stats[computed]++;
  }

  // Get paginated devices with user info
  const devices = await prisma.extensionDevice.findMany({
    where: whereClause,
    select: {
      id: true,
      deviceKey: true,
      extensionVersion: true,
      browserInfo: true,
      osInfo: true,
      status: true,
      lastSeenAt: true,
      onboardingCompletedAt: true,
      onboardingEmail: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { lastSeenAt: { sort: "desc", nulls: "last" } },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Get total count
  const total = await prisma.extensionDevice.count({
    where: whereClause,
  });

  // Format and filter by computed status
  let data: ExtensionDeviceStatusItem[] = devices.map((device) => ({
    id: device.id,
    deviceKey: device.deviceKey,
    userName: device.user?.name ?? null,
    userEmail: device.user?.email ?? device.onboardingEmail ?? null,
    extensionVersion: device.extensionVersion,
    browserInfo: device.browserInfo,
    osInfo: device.osInfo,
    status: device.status as ExtensionDeviceStatusItem["status"],
    computedStatus: computeDeviceStatus(device, thresholdMinutes),
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    onboardingCompletedAt: device.onboardingCompletedAt?.toISOString() ?? null,
    onboardingEmail: device.onboardingEmail,
    createdAt: device.createdAt.toISOString(),
  }));

  // Client-side computed status filter (active/inactive need runtime check)
  if (filters.status === "active" || filters.status === "inactive") {
    data = data.filter((d) => d.computedStatus === filters.status);
  }

  return {
    data,
    stats,
    inactiveThresholdMinutes: thresholdMinutes,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update inactive threshold minutes for organization
 */
export async function updateInactiveThreshold(
  minutes: number
): Promise<{ success: boolean; message: string }> {
  const { organizationId, role } = await requireOrganization();

  if (role !== "ADMIN") {
    return { success: false, message: "관리자만 설정을 변경할 수 있습니다" };
  }

  if (minutes < 5 || minutes > 10080) {
    return {
      success: false,
      message: "5분에서 10080분(7일) 사이 값을 입력하세요",
    };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { inactiveThresholdMinutes: minutes },
  });

  return { success: true, message: "비활성 임계값이 업데이트되었습니다" };
}

/**
 * Delete extension device record
 */
export async function deleteExtensionDevice(
  deviceId: string
): Promise<{ success: boolean; message: string }> {
  const { organizationId, role } = await requireOrganization();

  if (role !== "ADMIN") {
    return {
      success: false,
      message: "관리자만 디바이스를 삭제할 수 있습니다",
    };
  }

  const device = await prisma.extensionDevice.findUnique({
    where: { id: deviceId },
    select: { organizationId: true },
  });

  if (!device || device.organizationId !== organizationId) {
    return { success: false, message: "디바이스를 찾을 수 없습니다" };
  }

  await prisma.extensionDevice.delete({
    where: { id: deviceId },
  });

  revalidatePath("/extensions/status");
  return { success: true, message: "디바이스가 삭제되었습니다" };
}
