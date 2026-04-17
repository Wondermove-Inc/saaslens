// src/app/(dashboard)/extensions/onboarding/onboarding-monitor-client.tsx
"use client";

import type { OnboardingMonitorItem } from "@/actions/extensions/onboarding-monitor";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

interface OnboardingMonitorClientProps {
  items: OnboardingMonitorItem[];
  total: number;
  completedCount: number;
  pendingCount: number;
}

type FilterType = "all" | "completed" | "pending";

export function OnboardingMonitorClient({
  items,
  total,
  completedCount,
  pendingCount,
}: OnboardingMonitorClientProps) {
  const t = useTranslations("extensions.onboarding");
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredItems = useMemo(() => {
    if (filter === "completed")
      return items.filter((i) => i.onboardingCompletedAt);
    if (filter === "pending")
      return items.filter((i) => !i.onboardingCompletedAt);
    return items;
  }, [items, filter]);

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: t("filter.all"), count: total },
    { key: "completed", label: t("filter.completed"), count: completedCount },
    { key: "pending", label: t("filter.pending"), count: pendingCount },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.total")}
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.completed")}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.pending")}
            </CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Badges */}
      <div className="flex gap-2">
        {filterButtons.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="focus:outline-none"
          >
            <Badge
              variant={filter === key ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm"
            >
              {label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </Badge>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="rounded-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("table.title")}</CardTitle>
          <CardDescription>{t("table.description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.columns.user")}</TableHead>
                <TableHead>{t("table.columns.email")}</TableHead>
                <TableHead>{t("table.columns.department")}</TableHead>
                <TableHead>{t("table.columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center"
                  >
                    {t("table.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.userId}>
                    <TableCell className="font-medium">
                      {item.userName || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.userEmail}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.department || "-"}
                    </TableCell>
                    <TableCell>
                      {item.onboardingCompletedAt ? (
                        <Badge variant="default" className="bg-green-600">
                          {t("table.status.completed")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t("table.status.pending")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
