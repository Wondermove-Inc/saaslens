// src/actions/profile.test.ts
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { describe, expect, it, vi } from "vitest";
import { updateProfile } from "./profile";

vi.mock("@/lib/auth/require-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockedRequireAuth = requireAuth as unknown as ReturnType<typeof vi.fn>;

describe("updateProfile", () => {
  it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
    mockedRequireAuth.mockRejectedValueOnce(new Error("NEXT_REDIRECT:/login"));

    const formData = new FormData();
    formData.set("name", "테스트");

    await expect(updateProfile({ success: false }, formData)).rejects.toThrow(
      "NEXT_REDIRECT:/login"
    );
  });

  it("유효하지 않은 값이면 에러를 반환해야 한다", async () => {
    mockedRequireAuth.mockResolvedValueOnce({
      user: { id: "user-1" },
    });

    const formData = new FormData();
    formData.set("name", ""); // 이름 누락

    const result = await updateProfile({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.name).toBeDefined();
  });

  it("프로필을 업데이트하고 성공 메시지를 반환해야 한다", async () => {
    mockedRequireAuth.mockResolvedValueOnce({
      user: { id: "user-1" },
    });

    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      id: "user-1",
    } as never);

    const formData = new FormData();
    formData.set("name", "홍길동");
    // title, department, avatarUrl은 주석 처리되어 전송하지 않음

    const result = await updateProfile({ success: false }, formData);

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          name: "홍길동",
          // jobTitle, department, avatarUrl은 주석 처리됨
        }),
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });
});
