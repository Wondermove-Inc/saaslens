// src/components/devices/devices-table.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeviceListResult } from "@/lib/services/fleetdm";
import { cn } from "@/lib/utils";
import type { DevicePlatform, DeviceStatus } from "@prisma/client";
import {
  Clock,
  Laptop,
  Monitor,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { statusBadgeVariants } from "./devices-page.constants";

const platformIcons: Record<DevicePlatform, React.ReactNode> = {
  WINDOWS: <Monitor className="h-4 w-4" />,
  MACOS: <Laptop className="h-4 w-4" />,
  LINUX: <Monitor className="h-4 w-4" />,
  IOS: <Smartphone className="h-4 w-4" />,
  ANDROID: <Smartphone className="h-4 w-4" />,
  OTHER: <Monitor className="h-4 w-4" />,
};

interface DevicesTableProps {
  devices: DeviceListResult["devices"];
  isPending: boolean;
  onShowInstallGuide: () => void;
}

export function DevicesTable({
  devices,
  isPending,
  onShowInstallGuide,
}: DevicesTableProps) {
  const t = useTranslations("devices");
  const locale = useLocale();
  const hasDevices = devices.length > 0;

  if (!hasDevices && !isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-muted mb-4 rounded-full p-4">
          <Laptop className="text-muted-foreground h-8 w-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t("table.empty.title")}</h3>
        <p className="text-muted-foreground mb-6 max-w-md text-center">
          {t("table.empty.descriptionLine1")}
          <br />
          {t("table.empty.descriptionLine2")}
        </p>
        <Button variant="outline" onClick={onShowInstallGuide}>
          {t("table.empty.action")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.headers.device")}</TableHead>
            <TableHead>{t("table.headers.platform")}</TableHead>
            <TableHead>{t("table.headers.status")}</TableHead>
            <TableHead>{t("table.headers.user")}</TableHead>
            <TableHead>{t("table.headers.apps")}</TableHead>
            <TableHead>{t("table.headers.lastSeen")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending && devices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                {t("table.loading")}
              </TableCell>
            </TableRow>
          ) : (
            devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell>
                  <div className="font-medium">{device.hostname}</div>
                  <div className="text-muted-foreground text-xs">
                    {device.hardwareModel ?? device.osVersion}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {platformIcons[device.platform]}
                    <span className="text-sm">
                      {t(`platform.${device.platform}`)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={device.status}
                    label={t(`status.${device.status}`)}
                  />
                </TableCell>
                <TableCell>
                  {device.user ? (
                    <div>
                      <div className="font-medium">{device.user.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {device.user.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("table.emptyValue")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {t("table.appCount", {
                      count: device._count.deviceApps,
                    })}
                  </Badge>
                </TableCell>
                <TableCell>
                  {device.lastSeenAt ? (
                    <span className="text-sm">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(device.lastSeenAt))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("table.emptyValue")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: DeviceStatus;
  label: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", statusBadgeVariants[status])}
    >
      {status === "ONLINE" && <Wifi className="mr-1 h-3 w-3" />}
      {status === "OFFLINE" && <WifiOff className="mr-1 h-3 w-3" />}
      {status === "PENDING" && <Clock className="mr-1 h-3 w-3" />}
      {label}
    </Badge>
  );
}
