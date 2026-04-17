import { AuthProvider } from "@refinedev/core";

import { signIn, signOut } from "@/lib/auth";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  organizationId?: string | null;
}

interface SessionResponse {
  user?: SessionUser;
  expires?: string;
}

const fetchSession = async (): Promise<SessionResponse | null> => {
  try {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionResponse;
  } catch {
    return null;
  }
};

/**
 * Refine AuthProvider 스켈레톤.
 * - NextAuth v5 세션을 활용해 인증 상태를 확인한다.
 * - 실제 로그인/로그아웃 로직은 기존 NextAuth 흐름에 맞춰 후속 구현한다.
 */
export const authProvider: AuthProvider = {
  login: async ({ providerName, email, password }) => {
    // 추후 NextAuth signIn 확장 예정. 현재는 리디렉션만 수행.
    await signIn(providerName, { email, password });
    return {
      success: true,
      redirectTo: "/",
    };
  },
  logout: async () => {
    await signOut();
    return {
      success: true,
      redirectTo: "/login",
    };
  },
  check: async () => {
    const session = await fetchSession();
    if (session?.user) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      redirectTo: "/login",
    };
  },
  getPermissions: async () => {
    const session = await fetchSession();
    return session?.user?.role ?? null;
  },
  getIdentity: async () => {
    const session = await fetchSession();
    if (!session?.user) return null;

    const { id, email, name, role, organizationId } = session.user;
    return { id, email, name, role, organizationId };
  },
  onError: async () => ({
    logout: true,
    redirectTo: "/login",
  }),
};
