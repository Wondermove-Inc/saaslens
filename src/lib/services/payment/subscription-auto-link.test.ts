// src/lib/services/payment/subscription-auto-link.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findActiveSubscriptionForApp } from "./subscription-auto-link";

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.subscription.findUnique);

describe("findActiveSubscriptionForApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return subscription id when ACTIVE subscription exists", async () => {
    mockFindUnique.mockResolvedValue({
      id: "sub-1",
      status: "ACTIVE",
    } as never);

    const result = await findActiveSubscriptionForApp("app-1", "org-1");

    expect(result).toBe("sub-1");
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        appId_organizationId: {
          appId: "app-1",
          organizationId: "org-1",
        },
      },
      select: { id: true, status: true },
    });
  });

  it("should return null when no subscription exists", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await findActiveSubscriptionForApp("app-1", "org-1");

    expect(result).toBeNull();
  });

  it("should return null when subscription exists but status is CANCELLED", async () => {
    mockFindUnique.mockResolvedValue({
      id: "sub-2",
      status: "CANCELLED",
    } as never);

    const result = await findActiveSubscriptionForApp("app-1", "org-1");

    expect(result).toBeNull();
  });

  it("should return null when subscription exists but status is EXPIRED", async () => {
    mockFindUnique.mockResolvedValue({
      id: "sub-3",
      status: "EXPIRED",
    } as never);

    const result = await findActiveSubscriptionForApp("app-1", "org-1");

    expect(result).toBeNull();
  });

  it("should return null immediately when appId is null (no DB call)", async () => {
    const result = await findActiveSubscriptionForApp(null, "org-1");

    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
