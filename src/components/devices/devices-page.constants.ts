// src/components/devices/devices-page.constants.ts
import type { DeviceStatus } from "@prisma/client";

export const statusBadgeVariants: Record<DeviceStatus, string> = {
  ONLINE: "bg-green-100 text-green-800 border-green-200",
  OFFLINE: "bg-gray-100 text-gray-800 border-gray-200",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  RETIRED: "bg-red-100 text-red-800 border-red-200",
};
