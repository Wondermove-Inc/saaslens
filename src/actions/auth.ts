"use server";

import { signOut } from "@/lib/auth";

/**
 * 로그아웃 Server Action
 * 클라이언트 컴포넌트에서 form action으로 사용
 */
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
