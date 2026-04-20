// src/types/subscription.ts
import type {
  BillingCycle,
  BillingType,
  SubscriptionStatus,
} from "@prisma/client";

// 배정된 사용자 정보
export interface AssignedUser {
  id: string;
  name: string | null;
  email: string;
}

export interface SubscriptionListItem {
  id: string;
  appId: string;
  appName: string;
  appLogoUrl: string | null;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  billingType: BillingType;
  amount: number;
  perSeatPrice: number | null;
  currency: string;
  totalLicenses: number | null;
  usedLicenses: number | null;
  startDate: Date;
  endDate: Date | null;
  renewalDate: Date | null;
  autoRenewal: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Team 배정 (단일, deprecated - backward compat)
  teamId: string | null;
  teamName: string | null;
  // Team 배정 (다중)
  teams: Array<{ id: string; name: string }>;
  // User 배정 (다중)
  assignedUsers: AssignedUser[];
}

export interface SubscriptionDetail extends SubscriptionListItem {
  contractUrl: string | null;
  notes: string | null;
  renewalAlert30: boolean;
  renewalAlert60: boolean;
  renewalAlert90: boolean;
  // 상세 정보에 Team 객체 포함 (단일, deprecated - backward compat)
  team: { id: string; name: string } | null;
}

export interface CreateSubscriptionInput {
  appId: string;
  status?: SubscriptionStatus;
  billingCycle: BillingCycle;
  billingType?: BillingType;
  amount: string;
  perSeatPrice?: string;
  currency?: string;
  totalLicenses?: number;
  usedLicenses?: number;
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  autoRenewal?: boolean;
  renewalAlert30?: boolean;
  renewalAlert60?: boolean;
  renewalAlert90?: boolean;
  contractUrl?: string;
  notes?: string;
  // Team/User 배정
  teamId?: string;
  teamIds?: string[];
  assignedUserIds?: string[];
}

export type UpdateSubscriptionInput = Partial<CreateSubscriptionInput>;

export interface SubscriptionFilterOptions {
  status?: SubscriptionStatus;
  appId?: string;
  billingCycle?: BillingCycle;
  search?: string;
  renewingWithinDays?: number;
}

export interface SubscriptionSortOptions {
  sortBy?: "renewalDate" | "amount" | "createdAt" | "appName";
  sortOrder?: "asc" | "desc";
}

// P2: Seat 관리 상세 타입
export interface SeatUser {
  id: string;
  name: string | null;
  email: string;
  assignedAt: Date;
  assignedBy: string | null;
  lastUsedAt: Date | null;
  isInactive: boolean; // lastUsedAt > 30일 또는 null
}

export interface SeatDetails {
  assignedUsers: SeatUser[];
  totalSeats: number;
  usedSeats: number;
  unassignedSeats: number;
  inactiveSeats: number; // 할당됐지만 30일+ 미사용
}
