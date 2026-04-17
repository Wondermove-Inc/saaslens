"use client";

// src/components/reports/team-user-filter-router.tsx
import { useRouter, useSearchParams } from "next/navigation";
import {
  TeamUserFilter,
  type TeamFilterOption,
  type UserFilterOption,
} from "./team-user-filter";

interface TeamUserFilterRouterProps {
  basePath: string;
  teamId: string | null;
  userId: string | null;
  teams: TeamFilterOption[];
  users: UserFilterOption[];
  includeAllOption?: boolean;
  teamLocked?: boolean;
}

export function TeamUserFilterRouter({
  basePath,
  teamId,
  userId,
  teams,
  users,
  includeAllOption,
  teamLocked,
}: TeamUserFilterRouterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (
    nextTeamId: string | null,
    nextUserId: string | null
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextTeamId) {
      params.set("teamId", nextTeamId);
    } else {
      params.delete("teamId");
    }

    if (nextUserId) {
      params.set("userId", nextUserId);
    } else {
      params.delete("userId");
    }

    const queryString = params.toString();
    router.push(queryString ? `${basePath}?${queryString}` : basePath);
  };

  const handleTeamChange = (nextTeamId: string | null) => {
    updateParams(nextTeamId, null);
  };

  const handleUserChange = (nextUserId: string | null) => {
    updateParams(teamId, nextUserId);
  };

  return (
    <TeamUserFilter
      teamId={teamId}
      userId={userId}
      teams={teams}
      users={users}
      onTeamChange={handleTeamChange}
      onUserChange={handleUserChange}
      includeAllOption={includeAllOption}
      teamLocked={teamLocked}
    />
  );
}
