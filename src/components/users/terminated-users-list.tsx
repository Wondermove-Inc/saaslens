// src/components/users/terminated-users-list.tsx
"use client";

import { revokeAllUserAppAccess, revokeUserAppAccess } from "@/actions/users";
import { permanentlyDeleteUser } from "@/actions/users-write";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  SubscriptionAssignmentItem,
  TerminatedUserWithAccess,
  UserAppAccessItem,
} from "@/types/user";
import { AlertCircle, CreditCard, Shield, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface TerminatedUsersListProps {
  users: TerminatedUserWithAccess[];
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function AppAccessCard({
  access,
  userId,
}: {
  access: UserAppAccessItem;
  userId: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRevoke = () => {
    startTransition(async () => {
      const result = await revokeUserAppAccess(userId, access.appId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="bg-purple-gray flex items-center justify-between rounded-sm p-3">
      <div className="flex items-center gap-3">
        {access.appLogoUrl ? (
          <Image
            src={access.appLogoUrl}
            alt={access.appName}
            width={32}
            height={32}
            className="rounded"
          />
        ) : (
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded text-sm font-medium">
            {access.appName.charAt(0)}
          </div>
        )}
        <div>
          <div className="text-sm font-medium">{access.appName}</div>
          <div className="text-muted-foreground text-xs">
            {access.accessLevel && (
              <Badge variant="outline" className="mr-2">
                {access.accessLevel}
              </Badge>
            )}
            {t("users.terminated.lastUsed")}: {formatDate(access.lastUsedAt)}
          </div>
        </div>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleRevoke}
        disabled={isPending}
      >
        {isPending
          ? t("users.terminated.processing")
          : t("users.terminated.revoke")}
      </Button>
    </div>
  );
}

function SubscriptionAssignmentCard({
  assignment,
}: {
  assignment: SubscriptionAssignmentItem;
}) {
  const t = useTranslations();

  return (
    <div className="bg-purple-gray flex items-center justify-between rounded-sm p-3">
      <div className="flex items-center gap-3">
        {assignment.appLogoUrl ? (
          <Image
            src={assignment.appLogoUrl}
            alt={assignment.appName}
            width={32}
            height={32}
            className="rounded"
          />
        ) : (
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded text-sm font-medium">
            {assignment.appName.charAt(0)}
          </div>
        )}
        <div>
          <div className="text-sm font-medium">{assignment.appName}</div>
          <div className="text-muted-foreground text-xs">
            <Badge variant="outline" className="mr-2">
              <CreditCard className="mr-1 h-3 w-3" />
              {assignment.billingCycle || "-"}
            </Badge>
            {assignment.billingType && (
              <Badge variant="secondary" className="mr-2">
                {t(`users.terminated.billingType.${assignment.billingType}`)}
              </Badge>
            )}
            {t("users.terminated.subscriptionAssignedAt", {
              date: formatDate(assignment.assignedAt),
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminatedUserCard({ user }: { user: TerminatedUserWithAccess }) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleRevokeAll = () => {
    startTransition(async () => {
      const result = await revokeAllUserAppAccess(user.id);
      setRevokeAllDialogOpen(false);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handlePermanentDelete = () => {
    startDeleteTransition(async () => {
      const result = await permanentlyDeleteUser(user.id);
      if (result.success) {
        toast.success(result.message);
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card className="border-l-destructive/50 border-border/50 rounded-sm border-l-4 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name || user.email}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium">
                {(user.name || user.email).charAt(0)}
              </div>
            )}
            <div>
              <CardTitle className="flex items-center gap-2">
                {user.name || user.email}
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {user.unrevokedAccessCount}
                  {t("users.terminated.appCount")}
                </Badge>
              </CardTitle>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <p className="text-muted-foreground text-xs">
                {user.department} · {user.jobTitle} ·{" "}
                {t("users.terminated.terminatedDate")}:{" "}
                {formatDate(user.terminatedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog
              open={revokeAllDialogOpen}
              onOpenChange={setRevokeAllDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("users.terminated.revokeAll")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("users.terminated.revokeAllTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("users.terminated.revokeAllDescription", {
                      name: user.name || user.email,
                      count: user.unrevokedAccessCount,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("users.terminated.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevokeAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isPending}
                  >
                    {isPending
                      ? t("users.terminated.processing")
                      : t("users.terminated.revokeAll")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("users.permanentDelete.title")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("users.permanentDelete.title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("users.permanentDelete.description", {
                      name: user.name || user.email,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("users.permanentDelete.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handlePermanentDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeletePending}
                  >
                    {isDeletePending
                      ? t("users.permanentDelete.processing")
                      : t("users.permanentDelete.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          {user.appAccesses.map((access) => (
            <AppAccessCard key={access.id} access={access} userId={user.id} />
          ))}
          {user.subscriptionAssignments?.length > 0 && (
            <>
              {user.appAccesses.length > 0 && (
                <div className="text-muted-foreground pt-2 text-xs font-medium">
                  {t("users.terminated.subscriptionSection")}
                </div>
              )}
              {user.subscriptionAssignments.map((assignment) => (
                <SubscriptionAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                />
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TerminatedUsersList({ users }: TerminatedUsersListProps) {
  const t = useTranslations();

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground">{t("users.terminated.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <TerminatedUserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
