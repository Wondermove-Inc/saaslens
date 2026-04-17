// src/app/(dashboard)/settings/team/page.tsx
import { createInvitation, getInvitations } from "@/actions/invitations";
import { getTeams, type TeamWithStats } from "@/actions/teams";
import { PageHeader } from "@/components/common/page-header";
import { InvitationsTable } from "@/components/settings/invitations-table";
import { MemberList } from "@/components/team/member-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireOrganization, type UserRole } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teamMembers.page");
  return {
    title: `${t("title")} | SaaS 관리 플랫폼`,
    description: t("description"),
  };
}

interface InviteFormProps {
  teams: TeamWithStats[];
}

async function InviteForm({ teams }: InviteFormProps) {
  const t = await getTranslations("teamMembers.inviteForm");
  const roles: UserRole[] = ["ADMIN", "MEMBER", "VIEWER"];

  const handleSubmit = async (formData: FormData) => {
    "use server";
    await createInvitation(formData);
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder={t("emailPlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">{t("role")}</Label>
        <Select name="role" defaultValue="MEMBER">
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`roles.${role.toLowerCase()}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="teamId">{t("teamAssignment")}</Label>
        <Select name="teamId">
          <SelectTrigger id="teamId">
            <SelectValue placeholder={t("teamPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit">{t("submit")}</Button>
    </form>
  );
}

export default async function TeamPage() {
  const t = await getTranslations("teamMembers.page");
  const tMemberList = await getTranslations("teamMembers.memberList");
  const { organizationId, userId, role } = await requireOrganization();

  if (role !== "ADMIN") {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("adminOnly")}</p>
      </div>
    );
  }

  const [invitations, teamsResult, members] = await Promise.all([
    getInvitations(),
    getTeams(),
    prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  const teams = teamsResult.success && teamsResult.data ? teamsResult.data : [];
  const tForm = await getTranslations("teamMembers.inviteForm");

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        showBack
        backHref="/settings"
      />

      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{tMemberList("title")}</CardTitle>
          <CardDescription>{tMemberList("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {tMemberList("empty")}
            </p>
          ) : (
            <MemberList
              members={members}
              currentUserId={userId}
              isAdmin={role === "ADMIN"}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{tForm("title")}</CardTitle>
          <CardDescription>{tForm("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm teams={teams} />
        </CardContent>
      </Card>

      <InvitationsTable
        invitations={
          invitations.success && invitations.data ? invitations.data : []
        }
      />
    </div>
  );
}
