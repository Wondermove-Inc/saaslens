// src/components/team/member-list.tsx
"use client";

import type { UserRole } from "@prisma/client";
import { MemberCard } from "./member-card";

interface MemberListProps {
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    status: string;
    image: string | null;
  }>;
  currentUserId: string;
  isAdmin: boolean;
}

export function MemberList({
  members,
  currentUserId,
  isAdmin,
}: MemberListProps) {
  return (
    <div className="space-y-4">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          members={members}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
