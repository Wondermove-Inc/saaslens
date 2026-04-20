// FleetDM Webhook 처리 서비스
import { prisma } from "@/lib/db";
import type { DevicePlatform, DeviceStatus } from "@prisma/client";
import crypto from "crypto";
import type {
  FleetDMHost,
  FleetDMHostWebhookData,
  FleetDMSoftware,
  FleetDMSoftwareWebhookData,
  FleetDMWebhookEventType,
  FleetDMWebhookPayload,
} from "./types";
import { FLEETDM_PLATFORM_MAP, FLEETDM_STATUS_MAP } from "./types";

/**
 * Webhook 서명 검증
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Webhook 이벤트 타입 파싱
 */
export function parseWebhookEventType(
  type: string
): FleetDMWebhookEventType | null {
  const validTypes: FleetDMWebhookEventType[] = [
    "host.created",
    "host.updated",
    "host.deleted",
    "host.enrolled",
    "host.unenrolled",
    "software.installed",
    "software.removed",
    "vulnerability.detected",
    "policy.failed",
  ];

  return validTypes.includes(type as FleetDMWebhookEventType)
    ? (type as FleetDMWebhookEventType)
    : null;
}

/**
 * 호스트 이벤트 처리
 */
export async function handleHostEvent(
  eventType: FleetDMWebhookEventType,
  data: FleetDMHostWebhookData,
  organizationId: string
): Promise<void> {
  const host = data.host;

  switch (eventType) {
    case "host.created":
    case "host.enrolled":
    case "host.updated":
      await upsertDeviceFromWebhook(host, organizationId);
      break;

    case "host.deleted":
    case "host.unenrolled":
      await markDeviceAsRetired(host.id, organizationId);
      break;
  }
}

/**
 * 소프트웨어 이벤트 처리
 */
export async function handleSoftwareEvent(
  eventType: FleetDMWebhookEventType,
  data: FleetDMSoftwareWebhookData,
  organizationId: string
): Promise<void> {
  const { host_id, software } = data;

  // 해당 호스트의 디바이스 찾기
  const device = await prisma.device.findFirst({
    where: {
      fleetId: String(host_id),
      organizationId,
    },
  });

  if (!device) {
    console.warn(`[FleetDM Webhook] Device not found for host_id: ${host_id}`);
    return;
  }

  switch (eventType) {
    case "software.installed":
      await upsertSoftwareFromWebhook(device.id, software);
      break;

    case "software.removed":
      await removeSoftwareFromWebhook(device.id, software);
      break;
  }
}

/**
 * 디바이스 Upsert (Webhook에서)
 */
async function upsertDeviceFromWebhook(
  host: FleetDMHost,
  organizationId: string
): Promise<void> {
  await prisma.device.upsert({
    where: {
      organizationId_fleetId: {
        organizationId,
        fleetId: String(host.id),
      },
    },
    create: {
      organizationId,
      fleetId: String(host.id),
      hostname: host.hostname || host.display_name,
      platform: (FLEETDM_PLATFORM_MAP[host.platform] ||
        "OTHER") as DevicePlatform,
      osVersion: host.os_version,
      hardwareModel: host.hardware_model,
      hardwareSerial: host.hardware_serial,
      status: (FLEETDM_STATUS_MAP[host.status] || "PENDING") as DeviceStatus,
      lastSeenAt: host.seen_time ? new Date(host.seen_time) : null,
      enrolledAt: host.last_enrolled_at
        ? new Date(host.last_enrolled_at)
        : null,
      agentVersion: host.osquery_version,
    },
    update: {
      hostname: host.hostname || host.display_name,
      platform: (FLEETDM_PLATFORM_MAP[host.platform] ||
        "OTHER") as DevicePlatform,
      osVersion: host.os_version,
      hardwareModel: host.hardware_model,
      hardwareSerial: host.hardware_serial,
      status: (FLEETDM_STATUS_MAP[host.status] || "PENDING") as DeviceStatus,
      lastSeenAt: host.seen_time ? new Date(host.seen_time) : null,
      agentVersion: host.osquery_version,
      updatedAt: new Date(),
    },
  });
}

/**
 * 디바이스 RETIRED 처리
 */
async function markDeviceAsRetired(
  hostId: number,
  organizationId: string
): Promise<void> {
  await prisma.device.updateMany({
    where: {
      fleetId: String(hostId),
      organizationId,
    },
    data: {
      status: "RETIRED",
      updatedAt: new Date(),
    },
  });
}

/**
 * 소프트웨어 Upsert (Webhook에서)
 */
async function upsertSoftwareFromWebhook(
  deviceId: string,
  software: FleetDMSoftware[]
): Promise<void> {
  for (const sw of software) {
    await prisma.deviceApp.upsert({
      where: {
        deviceId_name_version: {
          deviceId,
          name: sw.name,
          version: sw.version,
        },
      },
      create: {
        deviceId,
        name: sw.name,
        version: sw.version,
        bundleIdentifier: sw.bundle_identifier,
        approvalStatus: "UNKNOWN",
      },
      update: {
        bundleIdentifier: sw.bundle_identifier,
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * 소프트웨어 삭제 (Webhook에서)
 */
async function removeSoftwareFromWebhook(
  deviceId: string,
  software: FleetDMSoftware[]
): Promise<void> {
  for (const sw of software) {
    await prisma.deviceApp.deleteMany({
      where: {
        deviceId,
        name: sw.name,
        version: sw.version,
      },
    });
  }
}

/**
 * Webhook 페이로드에서 조직 ID 추출
 * FleetDM Team ID를 사용하여 조직 매핑
 */
export async function getOrganizationIdFromWebhook(
  teamId?: number
): Promise<string | null> {
  if (!teamId) {
    // 기본 조직 사용 (단일 테넌트 모드)
    const integration = await prisma.integration.findFirst({
      where: {
        type: "FLEETDM",
        status: "ACTIVE",
      },
      select: { organizationId: true },
    });
    return integration?.organizationId ?? null;
  }

  // Team ID로 조직 찾기
  const integration = await prisma.integration.findFirst({
    where: {
      type: "FLEETDM",
      status: "ACTIVE",
      credentials: {
        path: ["teamId"],
        equals: teamId,
      },
    },
    select: { organizationId: true },
  });

  return integration?.organizationId ?? null;
}

/**
 * Webhook 이벤트 로깅
 */
export async function logWebhookEvent(
  eventType: string,
  success: boolean,
  error?: string
): Promise<void> {
  // 감사 로그에 기록 (선택적)
  console.log(
    `[FleetDM Webhook] ${eventType}: ${success ? "success" : "failed"}${error ? ` - ${error}` : ""}`
  );
}

export type { FleetDMWebhookPayload };
