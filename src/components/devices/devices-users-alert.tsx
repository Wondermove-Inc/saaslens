// src/components/devices/devices-users-alert.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";
import { useTranslations } from "next-intl";

interface UserWithoutAgent {
  id: string;
  name: string | null;
  email: string;
}

interface DevicesUsersAlertProps {
  usersWithoutAgent: UserWithoutAgent[];
  onShowInstallGuide: () => void;
}

export function DevicesUsersAlert({
  usersWithoutAgent,
  onShowInstallGuide,
}: DevicesUsersAlertProps) {
  const t = useTranslations("devices.usersAlert");
  if (usersWithoutAgent.length === 0) {
    return null;
  }

  return (
    <div className="mx-6 mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center gap-2 text-base font-medium text-orange-800">
        <UserX className="h-5 w-5" />
        {t("title", { count: usersWithoutAgent.length })}
      </div>
      <div className="mt-3 mb-3 flex flex-wrap gap-2">
        {usersWithoutAgent.slice(0, 5).map((user) => (
          <Badge
            key={user.id}
            variant="outline"
            className="border-orange-300 bg-white"
          >
            {user.name || user.email}
          </Badge>
        ))}
        {usersWithoutAgent.length > 5 && (
          <Badge variant="outline" className="border-orange-300 bg-white">
            {t("more", { count: usersWithoutAgent.length - 5 })}
          </Badge>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onShowInstallGuide}
        className="border-orange-300 text-orange-800 hover:bg-orange-100"
      >
        {t("action")}
      </Button>
    </div>
  );
}
