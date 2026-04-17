import { AccessControlProvider } from "@refinedev/core";

type Role = "ADMIN" | "MEMBER" | "VIEWER";
type Action =
  | "list"
  | "show"
  | "create"
  | "edit"
  | "delete"
  | "invite"
  | "sync";
type Resource =
  | "apps"
  | "subscriptions"
  | "users"
  | "integrations"
  | "payments"
  | "audit-logs";

/**
 * 리소스별 권한 매트릭스
 * CLAUDE.md 권한 매트릭스 기반
 *
 * | 리소스 | ADMIN | MEMBER | VIEWER |
 * |--------|-------|--------|--------|
 * | apps | CRUD | 조회+생성 | 조회만 |
 * | subscriptions | CRUD | 조회+생성 | 조회만 |
 * | users | CRUD+초대 | 조회만 | 조회만 |
 * | integrations | CRUD+동기화 | 조회만 | 조회만 |
 * | payments | CRUD | 조회만 | 불가 |
 * | audit-logs | 전체 | 제한적 | 불가 |
 */
const PERMISSION_MATRIX: Record<Role, Record<Resource, Action[]>> = {
  ADMIN: {
    apps: ["list", "show", "create", "edit", "delete"],
    subscriptions: ["list", "show", "create", "edit", "delete"],
    users: ["list", "show", "create", "edit", "delete", "invite"],
    integrations: ["list", "show", "create", "edit", "delete", "sync"],
    payments: ["list", "show", "create", "edit", "delete"],
    "audit-logs": ["list", "show"],
  },
  MEMBER: {
    apps: ["list", "show", "create"],
    subscriptions: ["list", "show", "create"],
    users: ["list", "show"],
    integrations: ["list", "show"],
    payments: ["list", "show"],
    "audit-logs": ["list", "show"], // 본인 활동만 (필터는 서버에서)
  },
  VIEWER: {
    apps: ["list", "show"],
    subscriptions: ["list", "show"],
    users: ["list", "show"],
    integrations: ["list", "show"],
    payments: [], // 접근 불가
    "audit-logs": [], // 접근 불가
  },
};

/**
 * 권한 매트릭스에서 리소스를 찾기 위한 매핑
 * API 리소스명 → 권한 리소스명
 */
function normalizeResource(resource: string | undefined): Resource | null {
  if (!resource) return null;

  // 정확히 일치하는 경우
  if (resource in PERMISSION_MATRIX.ADMIN) {
    return resource as Resource;
  }

  // 복수형/단수형 변환 시도
  const resourceMap: Record<string, Resource> = {
    app: "apps",
    subscription: "subscriptions",
    user: "users",
    integration: "integrations",
    payment: "payments",
    "audit-log": "audit-logs",
    auditLogs: "audit-logs",
    auditLog: "audit-logs",
  };

  return resourceMap[resource] ?? null;
}

// 세션 캐시 (불필요한 반복 호출 방지)
let cachedRole: Role | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30초

/**
 * 역할 결정: params → cache → /api/auth/session 순서로 시도
 */
async function resolveRole(
  params: Record<string, unknown> | undefined
): Promise<Role | null> {
  // 1. params에서 먼저 시도 (기존 호환)
  const paramRole = (params as { user?: { role?: string } })?.user?.role;
  if (paramRole) return paramRole as Role;

  // 2. 캐시 사용
  if (cachedRole && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedRole;
  }

  // 3. 세션에서 조회
  try {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) return null;
    const session = await res.json();
    cachedRole = (session?.user?.role as Role) ?? null;
    cacheTimestamp = Date.now();
    return cachedRole;
  } catch {
    return null;
  }
}

/** 캐시 초기화 (테스트용) */
function resetRoleCache() {
  cachedRole = null;
  cacheTimestamp = 0;
}

/**
 * Refine AccessControlProvider
 * - PERMISSION_MATRIX 기반 리소스별 권한 체크
 * - ADMIN: 모든 리소스 전체 권한
 * - MEMBER: 리소스별 제한된 권한 (apps/subscriptions는 생성 가능)
 * - VIEWER: 읽기 전용 (payments, audit-logs 접근 불가)
 */
export const accessControlProvider: AccessControlProvider = {
  can: async ({ action, resource, params }) => {
    const role = await resolveRole(params);

    // 역할이 없으면 거부
    if (!role) {
      return { can: false, reason: "권한이 없습니다." };
    }

    // 리소스가 없으면 기본 규칙 적용 (하위 호환성)
    const normalizedResource = normalizeResource(resource);
    if (!normalizedResource) {
      // 리소스 없이 호출된 경우 기존 동작 유지
      if (role === "ADMIN") {
        return { can: true };
      }
      if (role === "VIEWER") {
        const isReadOnly = action === "list" || action === "show";
        return isReadOnly
          ? { can: true }
          : { can: false, reason: "VIEWER는 읽기만 가능합니다." };
      }
      if (role === "MEMBER") {
        if (action === "delete") {
          return { can: false, reason: "MEMBER는 삭제 권한이 없습니다." };
        }
        return { can: true };
      }
      return { can: false, reason: "권한이 없습니다." };
    }

    // PERMISSION_MATRIX 기반 체크
    const allowedActions = PERMISSION_MATRIX[role]?.[normalizedResource] ?? [];
    const isAllowed = allowedActions.includes(action as Action);

    if (isAllowed) {
      return { can: true };
    }

    // 거부 사유 생성
    const resourceLabel = {
      apps: "앱",
      subscriptions: "구독",
      users: "사용자",
      integrations: "연동",
      payments: "결제",
      "audit-logs": "감사 로그",
    }[normalizedResource];

    const actionLabel = {
      list: "목록 조회",
      show: "상세 조회",
      create: "생성",
      edit: "수정",
      delete: "삭제",
      invite: "초대",
      sync: "동기화",
    }[action as Action];

    return {
      can: false,
      reason: `${resourceLabel}에 대한 ${actionLabel ?? action} 권한이 없습니다.`,
    };
  },
};

// 테스트용 export
export { normalizeResource, PERMISSION_MATRIX, resetRoleCache, resolveRole };
export type { Action, Resource, Role };
