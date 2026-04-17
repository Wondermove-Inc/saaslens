// src/components/reports/usage/user-cost-section.tsx
"use client";

import {
  getTeamCostComparison,
  getUserCostBreakdown,
} from "@/actions/user-cost-analysis";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TeamCostComparison, UserCostItem } from "@/types/seat-analytics";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

function formatCurrency(value: number, currency = "KRW") {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(
    value
  );
}

export function UserCostSection() {
  const t = useTranslations("reports.usage.userCost");
  const [users, setUsers] = useState<UserCostItem[]>([]);
  const [teams, setTeams] = useState<TeamCostComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [userResult, teamResult] = await Promise.all([
        getUserCostBreakdown(),
        getTeamCostComparison(),
      ]);
      if (userResult.success && userResult.data) {
        setUsers(userResult.data.users);
      }
      if (teamResult.success && teamResult.data) {
        setTeams(teamResult.data.teams);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (users.length === 0 && teams.length === 0) {
    return null;
  }

  return (
    <>
      <Separator />
      <div>
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{t("tabUsers")}</TabsTrigger>
          <TabsTrigger value="teams">{t("tabTeams")}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{t("usersTitle")}</CardTitle>
              <CardDescription>{t("usersDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  {t("noUsers")}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]" />
                        <TableHead>{t("colUser")}</TableHead>
                        <TableHead>{t("colTeam")}</TableHead>
                        <TableHead className="text-right">
                          {t("colMonthlyCost")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("colAssignedApps")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("colActiveApps")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <UserRow
                          key={user.userId}
                          user={user}
                          isExpanded={expandedUserId === user.userId}
                          onToggle={() =>
                            setExpandedUserId(
                              expandedUserId === user.userId
                                ? null
                                : user.userId
                            )
                          }
                          t={t}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{t("teamsTitle")}</CardTitle>
              <CardDescription>{t("teamsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  {t("noTeams")}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("colTeamName")}</TableHead>
                        <TableHead className="text-right">
                          {t("colMembers")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("colTotalCost")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("colCostPerMember")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("colActiveRate")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow key={team.teamId}>
                          <TableCell className="font-medium">
                            {team.teamName}
                          </TableCell>
                          <TableCell className="text-right">
                            {team.memberCount}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(team.totalMonthlyCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(team.costPerMember)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                team.activeRate >= 75
                                  ? "default"
                                  : team.activeRate >= 50
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {team.activeRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function UserRow({
  user,
  isExpanded,
  onToggle,
  t,
}: {
  user: UserCostItem;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium">{user.userName ?? user.userEmail}</p>
            <p className="text-muted-foreground text-xs">{user.userEmail}</p>
          </div>
        </TableCell>
        <TableCell>
          {user.teamName ? (
            <Badge variant="outline">{user.teamName}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          )}
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(user.totalMonthlyCost)}
        </TableCell>
        <TableCell className="text-right">{user.assignedAppCount}</TableCell>
        <TableCell className="text-right">{user.activeAppCount}</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-0">
            <div className="px-8 py-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colApp")}</TableHead>
                    <TableHead className="text-right">
                      {t("colPerSeatPrice")}
                    </TableHead>
                    <TableHead>{t("colStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.subscriptions.map((sub) => (
                    <TableRow key={sub.subscriptionId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sub.appLogoUrl ? (
                            <Image
                              src={sub.appLogoUrl}
                              alt={sub.appName}
                              width={20}
                              height={20}
                              className="rounded"
                            />
                          ) : (
                            <div className="bg-muted flex h-5 w-5 items-center justify-center rounded text-[10px]">
                              {sub.appName.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm">{sub.appName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(sub.perSeatPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sub.isActive ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {sub.isActive
                            ? t("statusActive")
                            : t("statusInactive")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
