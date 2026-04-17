// src/components/subscriptions/subscription-detail-seat-card.tsx
"use client";

import {
  assignUserToSubscription,
  getSubscriptionSeatDetails,
  removeUserFromSubscription,
} from "@/actions/subscriptions/subscription-seat-management";
import { getUsers } from "@/actions/users-read";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SeatDetails, SeatUser } from "@/types/subscription";
import type { BillingType } from "@prisma/client";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface SubscriptionDetailSeatCardProps {
  subscriptionId: string;
  totalLicenses: number | null;
  usedLicenses: number | null;
  billingType: BillingType;
  perSeatPrice: number | null;
  currency?: string;
}

export function SubscriptionDetailSeatCard({
  subscriptionId,
  totalLicenses,
  usedLicenses,
  billingType,
}: SubscriptionDetailSeatCardProps) {
  const t = useTranslations("subscriptions.detail.seat");
  const [seatDetails, setSeatDetails] = useState<SeatDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isPerSeat = billingType === "PER_SEAT";
  const isFlatRate = billingType === "FLAT_RATE";

  const loadSeatDetails = useCallback(async () => {
    setIsLoading(true);
    const result = await getSubscriptionSeatDetails(subscriptionId);
    if (result.success && result.data) {
      setSeatDetails(result.data);
    }
    setIsLoading(false);
  }, [subscriptionId]);

  useEffect(() => {
    if (isPerSeat || isFlatRate) {
      loadSeatDetails();
    } else {
      setIsLoading(false);
    }
  }, [isPerSeat, isFlatRate, loadSeatDetails]);

  // Non-PER_SEAT, non-FLAT_RATE subscriptions without licenses: hide card
  if (!isPerSeat && !isFlatRate && !totalLicenses) return null;

  // Simple license display for non-PER_SEAT, non-FLAT_RATE
  if (!isPerSeat && !isFlatRate) {
    const total = totalLicenses ?? 0;
    const used = usedLicenses ?? 0;
    const usagePercent = total > 0 ? (used / total) * 100 : 0;

    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>라이선스 사용량</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("usage")}</span>
            <span className="font-medium">
              {used} / {total}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <p className="text-muted-foreground text-xs">{total - used}개 남음</p>
        </CardContent>
      </Card>
    );
  }

  // PER_SEAT: Full seat card
  if (isLoading) {
    return (
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          <span className="text-muted-foreground ml-2 text-sm">
            {t("loading")}
          </span>
        </CardContent>
      </Card>
    );
  }

  const totalSeats = seatDetails?.totalSeats ?? totalLicenses ?? 0;
  const usedSeats = seatDetails?.usedSeats ?? usedLicenses ?? 0;
  const unassignedSeats = seatDetails?.unassignedSeats ?? 0;
  const inactiveSeats = seatDetails?.inactiveSeats ?? 0;
  const usagePercent = totalSeats > 0 ? (usedSeats / totalSeats) * 100 : 0;
  const users = seatDetails?.assignedUsers ?? [];

  const handleRemoveUser = (userId: string) => {
    startTransition(async () => {
      const result = await removeUserFromSubscription(subscriptionId, userId);
      if (result.success) {
        toast.success(t("removeSuccess"));
        await loadSeatDetails();
      } else {
        toast.error(result.error ?? "Error");
      }
    });
  };

  const handleAssignUser = (userId: string) => {
    startTransition(async () => {
      const result = await assignUserToSubscription(subscriptionId, userId);
      if (result.success) {
        toast.success(t("assignSuccess"));
        setDialogOpen(false);
        await loadSeatDetails();
      } else {
        toast.error(result.error ?? "Error");
      }
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return t("table.never");
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{isPerSeat ? t("title") : t("flatRateTitle")}</CardTitle>
          <Badge
            variant="outline"
            className="bg-info-muted text-info-muted-foreground"
          >
            {isPerSeat ? t("badge") : t("flatRateBadge")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage progress - PER_SEAT only */}
        {isPerSeat && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("usage")}</span>
              <span className="font-medium">
                {usedSeats} / {totalSeats} Seat
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-muted-foreground text-xs">
              {t("remaining", { count: Math.max(0, totalSeats - usedSeats) })}
            </p>
          </div>
        )}

        {/* Summary stats - PER_SEAT only */}
        {isPerSeat && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-success-muted rounded-sm p-2">
              <p className="text-success-muted-foreground text-lg font-semibold">
                {usedSeats}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("summary.assigned")}
              </p>
            </div>
            <div className="bg-warning-muted rounded-sm p-2">
              <p className="text-warning-muted-foreground text-lg font-semibold">
                {unassignedSeats}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("summary.unassigned")}
              </p>
            </div>
            <div className="bg-destructive-muted rounded-sm p-2">
              <p className="text-destructive-muted-foreground text-lg font-semibold">
                {inactiveSeats}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("summary.inactive")}
              </p>
            </div>
          </div>
        )}

        {/* User table */}
        {users.length > 0 ? (
          <div className="rounded-sm border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.user")}</TableHead>
                  <TableHead>{t("table.lastUsedAt")}</TableHead>
                  <TableHead className="w-[60px]">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <SeatUserRow
                    key={user.id}
                    user={user}
                    onRemove={handleRemoveUser}
                    formatDate={formatDate}
                    isPending={isPending}
                    t={t}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {t("noUsers")}
          </p>
        )}

        {/* Add user button + dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isPerSeat && totalSeats > 0 && usedSeats >= totalSeats}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addUser")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addUserTitle")}</DialogTitle>
              <DialogDescription>{t("addUserDescription")}</DialogDescription>
            </DialogHeader>
            <AddUserSearch
              existingUserIds={users.map((u) => u.id)}
              onSelect={handleAssignUser}
              isPending={isPending}
              t={t}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Extracted row component for clarity
function SeatUserRow({
  user,
  onRemove,
  formatDate,
  isPending,
  t,
}: {
  user: SeatUser;
  onRemove: (userId: string) => void;
  formatDate: (date: Date | null) => string;
  isPending: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
            {(user.name ?? user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user.name ?? user.email}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {user.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <span className="text-sm">{formatDate(user.lastUsedAt)}</span>
          {user.isInactive && (
            <Badge variant="destructive" className="text-[10px]">
              {t("table.inactive")}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive/80 h-7 w-7"
          onClick={() => onRemove(user.id)}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// Add user search within dialog
function AddUserSearch({
  existingUserIds,
  onSelect,
  isPending,
  t,
}: {
  existingUserIds: string[];
  onSelect: (userId: string) => void;
  isPending: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string | null; email: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length < 1) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const result = await getUsers({
        filter: { search, status: "ACTIVE" },
        limit: 10,
      });
      setSearchResults(
        result.items
          .filter((u) => !existingUserIds.includes(u.id))
          .map((u) => ({ id: u.id, name: u.name, email: u.email }))
      );
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, existingUserIds]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
        <Input
          placeholder={t("searchUsers")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        {isSearching ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-1">
            {searchResults.map((user) => (
              <button
                key={user.id}
                type="button"
                className="hover:bg-muted flex w-full items-center gap-2 rounded-sm p-2 text-left"
                onClick={() => onSelect(user.id)}
                disabled={isPending}
              >
                <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium">
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : search.length > 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {t("noUsersFound")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
