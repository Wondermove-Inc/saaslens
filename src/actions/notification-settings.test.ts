// src/actions/notification-settings.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { updateNotificationSettings } from "./notification-settings";

describe("updateNotificationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await updateNotificationSettings(
      "sub-1",
      "renewalAlert30",
      true
    );

    expect(result).toEqual({
      success: false,
      message: "인증이 필요합니다",
    });
  });

  it("조직 ID가 없는 사용자는 에러를 반환해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: null },
    } as never);

    const result = await updateNotificationSettings(
      "sub-1",
      "renewalAlert30",
      true
    );

    expect(result).toEqual({
      success: false,
      message: "조직 정보가 필요합니다",
    });
  });

  it("존재하지 않는 구독은 에러를 반환해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

    const result = await updateNotificationSettings(
      "sub-1",
      "renewalAlert30",
      true
    );

    expect(result).toEqual({
      success: false,
      message: "구독을 찾을 수 없습니다",
    });
  });

  it("알림 설정을 업데이트해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: "sub-1",
      organizationId: "org-1",
    } as never);

    vi.mocked(prisma.subscription.update).mockResolvedValue({
      id: "sub-1",
      renewalAlert30: true,
    } as never);

    const result = await updateNotificationSettings(
      "sub-1",
      "renewalAlert30",
      true
    );

    expect(result.success).toBe(true);
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { renewalAlert30: true },
    });
  });

  it("30일 알림을 비활성화할 수 있어야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: "sub-1",
      organizationId: "org-1",
    } as never);

    vi.mocked(prisma.subscription.update).mockResolvedValue({
      id: "sub-1",
      renewalAlert30: false,
    } as never);

    const result = await updateNotificationSettings(
      "sub-1",
      "renewalAlert30",
      false
    );

    expect(result.success).toBe(true);
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { renewalAlert30: false },
    });
  });

  it("60일 알림을 업데이트할 수 있어야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: "sub-1",
      organizationId: "org-1",
    } as never);

    vi.mocked(prisma.subscription.update).mockResolvedValue({
      id: "sub-1",
      renewalAlert60: true,
    } as never);

    const result = await updateNotificationSettings(
      "sub-1",
      "renewalAlert60",
      true
    );

    expect(result.success).toBe(true);
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { renewalAlert60: true },
    });
  });

  it("90일 알림을 업데이트할 수 있어야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: "sub-1",
      organizationId: "org-1",
    } as never);

    vi.mocked(prisma.subscription.update).mockResolvedValue({
      id: "sub-1",
      renewalAlert90: true,
    } as never);

    const result = await updateNotificationSettings(
      "sub-1",
      "renewalAlert90",
      true
    );

    expect(result.success).toBe(true);
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { renewalAlert90: true },
    });
  });

  it("업데이트 후 revalidatePath를 호출해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1" },
    } as never);

    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: "sub-1",
      organizationId: "org-1",
    } as never);

    vi.mocked(prisma.subscription.update).mockResolvedValue({
      id: "sub-1",
    } as never);

    await updateNotificationSettings("sub-1", "renewalAlert30", true);

    expect(revalidatePath).toHaveBeenCalledWith("/subscriptions/sub-1");
  });
});
