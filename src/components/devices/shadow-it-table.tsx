// src/components/devices/shadow-it-table.tsx
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
import type { ShadowITAppSummary } from "@/lib/services/fleetdm";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type Role = "ADMIN" | "MEMBER" | "VIEWER" | null | undefined;

interface ShadowITTableProps {
  shadowITApps: ShadowITAppSummary[];
  role?: Role;
  isPending: boolean;
  onApprove: (appName: string, approve: boolean) => void;
}

export function ShadowITTable({
  shadowITApps,
  role,
  isPending,
  onApprove,
}: ShadowITTableProps) {
  const t = useTranslations("devices.shadowIT");
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        {t("title")}
      </div>
      <div className="mt-4">
        {shadowITApps.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <p>{t("empty")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("headers.appName")}</TableHead>
                <TableHead>{t("headers.deviceCount")}</TableHead>
                <TableHead className="text-right">
                  {t("headers.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shadowITApps.map((app) => (
                <TableRow key={app.name}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {t("deviceCount", { count: app.deviceCount })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {role === "ADMIN" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onApprove(app.name, true)}
                          disabled={isPending}
                        >
                          {t("actions.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onApprove(app.name, false)}
                          disabled={isPending}
                        >
                          {t("actions.block")}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
