// src/types/user.ts
import type { AccessSource, UserRole, UserStatus } from "@prisma/client";

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  department: string | null;
  team: { id: string; name: string } | null;
  jobTitle: string | null;
  lastLoginAt: Date | null;
  terminatedAt: Date | null;
  assignedAppCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDetail extends UserListItem {
  employeeId: string | null;
  appAccesses: UserAppAccessItem[];
  subscriptionSummary?: UserSubscriptionSummary;
}

export interface UserAppAccessItem {
  id: string;
  appId: string;
  appName: string;
  appLogoUrl: string | null;
  accessLevel: string | null;
  grantedAt: Date;
  lastUsedAt: Date | null;
  source: AccessSource;
}

export interface SubscriptionAssignmentItem {
  id: string;
  subscriptionId: string;
  appId: string;
  appName: string;
  appLogoUrl: string | null;
  billingCycle: string | null;
  billingType: string | null;
  assignedAt: Date;
}

export interface TerminatedUserWithAccess {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  department: string | null;
  jobTitle: string | null;
  terminatedAt: Date;
  unrevokedAccessCount: number;
  appAccesses: UserAppAccessItem[];
  subscriptionAssignments: SubscriptionAssignmentItem[];
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  jobTitle?: string;
  employeeId?: string;
}

export interface UserSubscriptionSummary {
  total: number;
  monthlyAmount: number;
  renewingSoon: number;
  currency: string;
}

export interface UserFilterOptions {
  status?: UserStatus;
  role?: UserRole;
  department?: string;
  search?: string;
  hasTerminatedAccess?: boolean;
}

export interface UserSortOptions {
  sortBy?: "name" | "email" | "lastLoginAt" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface RevokeAccessInput {
  userId: string;
  appId: string;
}
