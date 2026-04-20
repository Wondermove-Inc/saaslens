"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getInAppNotifications,
  type InAppNotification,
  type InAppNotificationType,
} from "@/actions/in-app-notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 알림 유형별 i18n 키 매핑
const TYPE_I18N_MAP: Record<
  InAppNotificationType,
  { titleKey: string; detailKey: string }
> = {
  renewal: {
    titleKey: "header.notifications.types.renewal.title",
    detailKey: "header.notifications.types.renewal.detail",
  },
  offboarding: {
    titleKey: "header.notifications.types.offboarding.title",
    detailKey: "header.notifications.types.offboarding.detail",
  },
  shadowIT: {
    titleKey: "header.notifications.types.shadowIT.title",
    detailKey: "header.notifications.types.shadowIT.detail",
  },
  costAnomaly: {
    titleKey: "header.notifications.types.costAnomaly.title",
    detailKey: "header.notifications.types.costAnomaly.detail",
  },
  pendingReview: {
    titleKey: "header.notifications.types.pendingReview.title",
    detailKey: "header.notifications.types.pendingReview.detail",
  },
};

export function NotificationBell() {
  const t = useTranslations();
  const router = useRouter();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getInAppNotifications();
        if (!cancelled) {
          setNotifications(data);
        }
      } catch {
        // 조회 실패 시 빈 배열 유지
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = notifications.length;

  function formatTitle(notif: InAppNotification): string {
    const { titleKey } = TYPE_I18N_MAP[notif.type];
    return t(titleKey, { value: notif.title });
  }

  function formatDetail(notif: InAppNotification): string {
    const { detailKey } = TYPE_I18N_MAP[notif.type];
    return t(detailKey, { value: notif.detail });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("header.notifications.label")}
          className="relative"
        >
          <Bell className={`h-5 w-5${count > 0 ? "animate-tada" : ""}`} />
          {/* 동적 배지: 0이면 숨김, 9 초과면 "9+" */}
          {count > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="max-h-80 w-80 overflow-y-auto"
      >
        <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
          {t("header.notifications.recent")}
        </div>
        <DropdownMenuSeparator />

        {/* 로딩 상태 */}
        {loading && (
          <div className="text-muted-foreground flex items-center justify-center py-6 text-sm">
            <span className="animate-pulse">...</span>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && count === 0 && (
          <div className="text-muted-foreground py-6 text-center text-sm">
            {t("header.notifications.empty")}
          </div>
        )}

        {/* 알림 목록 */}
        {!loading &&
          notifications.map((notif) => (
            <DropdownMenuItem
              key={notif.id}
              className="flex cursor-pointer flex-col items-start gap-1 whitespace-normal"
              onSelect={() => router.push(notif.link)}
            >
              <span className="text-sm font-medium">{formatTitle(notif)}</span>
              <span className="text-muted-foreground text-xs">
                {formatDetail(notif)}
              </span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
