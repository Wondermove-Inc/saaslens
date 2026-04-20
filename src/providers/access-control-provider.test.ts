import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  accessControlProvider,
  normalizeResource,
  PERMISSION_MATRIX,
  resetRoleCache,
} from "./access-control-provider";

describe("accessControlProvider", () => {
  beforeEach(() => {
    resetRoleCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("기본 동작 (리소스 없이)", () => {
    it("ADMIN은 모든 액션을 허용한다", async () => {
      const result = await accessControlProvider.can({
        action: "delete",
        params: { user: { role: "ADMIN" } },
      });
      expect(result.can).toBe(true);
    });

    it("VIEWER는 읽기만 허용한다", async () => {
      const allow = await accessControlProvider.can({
        action: "list",
        params: { user: { role: "VIEWER" } },
      });
      const deny = await accessControlProvider.can({
        action: "delete",
        params: { user: { role: "VIEWER" } },
      });

      expect(allow.can).toBe(true);
      expect(deny.can).toBe(false);
    });

    it("MEMBER는 삭제를 금지한다", async () => {
      const deleteResult = await accessControlProvider.can({
        action: "delete",
        params: { user: { role: "MEMBER" } },
      });
      expect(deleteResult.can).toBe(false);
    });

    it("로그인이 없으면 거부한다", async () => {
      const result = await accessControlProvider.can({
        action: "list",
        params: {},
      });
      expect(result.can).toBe(false);
    });
  });

  describe("리소스별 권한 체크 - ADMIN", () => {
    const role = "ADMIN";

    it("apps: 모든 CRUD 허용", async () => {
      for (const action of ["list", "show", "create", "edit", "delete"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "apps",
          params: { user: { role } },
        });
        expect(result.can, `${action} 실패`).toBe(true);
      }
    });

    it("users: 초대 권한 포함", async () => {
      const result = await accessControlProvider.can({
        action: "invite",
        resource: "users",
        params: { user: { role } },
      });
      expect(result.can).toBe(true);
    });

    it("integrations: 동기화 권한 포함", async () => {
      const result = await accessControlProvider.can({
        action: "sync",
        resource: "integrations",
        params: { user: { role } },
      });
      expect(result.can).toBe(true);
    });

    it("payments: 전체 권한", async () => {
      const result = await accessControlProvider.can({
        action: "create",
        resource: "payments",
        params: { user: { role } },
      });
      expect(result.can).toBe(true);
    });
  });

  describe("리소스별 권한 체크 - MEMBER", () => {
    const role = "MEMBER";

    it("apps: 조회+생성만 허용, 수정/삭제 불가", async () => {
      // 허용
      for (const action of ["list", "show", "create"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "apps",
          params: { user: { role } },
        });
        expect(result.can, `${action} 허용 실패`).toBe(true);
      }

      // 거부
      for (const action of ["edit", "delete"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "apps",
          params: { user: { role } },
        });
        expect(result.can, `${action} 거부 실패`).toBe(false);
      }
    });

    it("users: 조회만 허용, 생성/수정/삭제/초대 불가", async () => {
      // 허용
      for (const action of ["list", "show"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "users",
          params: { user: { role } },
        });
        expect(result.can, `${action} 허용 실패`).toBe(true);
      }

      // 거부
      for (const action of ["create", "edit", "delete", "invite"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "users",
          params: { user: { role } },
        });
        expect(result.can, `${action} 거부 실패`).toBe(false);
      }
    });

    it("integrations: 동기화 불가", async () => {
      const result = await accessControlProvider.can({
        action: "sync",
        resource: "integrations",
        params: { user: { role } },
      });
      expect(result.can).toBe(false);
    });

    it("payments: 조회만 허용", async () => {
      const allowList = await accessControlProvider.can({
        action: "list",
        resource: "payments",
        params: { user: { role } },
      });
      const denyCreate = await accessControlProvider.can({
        action: "create",
        resource: "payments",
        params: { user: { role } },
      });

      expect(allowList.can).toBe(true);
      expect(denyCreate.can).toBe(false);
    });
  });

  describe("리소스별 권한 체크 - VIEWER", () => {
    const role = "VIEWER";

    it("apps: 조회만 허용", async () => {
      // 허용
      for (const action of ["list", "show"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "apps",
          params: { user: { role } },
        });
        expect(result.can, `${action} 허용 실패`).toBe(true);
      }

      // 거부
      for (const action of ["create", "edit", "delete"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "apps",
          params: { user: { role } },
        });
        expect(result.can, `${action} 거부 실패`).toBe(false);
      }
    });

    it("payments: 완전 접근 불가", async () => {
      for (const action of ["list", "show", "create", "edit", "delete"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "payments",
          params: { user: { role } },
        });
        expect(result.can, `${action} 거부 실패`).toBe(false);
      }
    });

    it("audit-logs: 완전 접근 불가", async () => {
      for (const action of ["list", "show"]) {
        const result = await accessControlProvider.can({
          action,
          resource: "audit-logs",
          params: { user: { role } },
        });
        expect(result.can, `${action} 거부 실패`).toBe(false);
      }
    });
  });

  describe("normalizeResource", () => {
    it("정확히 일치하는 리소스명 반환", () => {
      expect(normalizeResource("apps")).toBe("apps");
      expect(normalizeResource("subscriptions")).toBe("subscriptions");
      expect(normalizeResource("audit-logs")).toBe("audit-logs");
    });

    it("단수형을 복수형으로 변환", () => {
      expect(normalizeResource("app")).toBe("apps");
      expect(normalizeResource("subscription")).toBe("subscriptions");
      expect(normalizeResource("user")).toBe("users");
    });

    it("auditLogs 변형 처리", () => {
      expect(normalizeResource("auditLogs")).toBe("audit-logs");
      expect(normalizeResource("auditLog")).toBe("audit-logs");
    });

    it("알 수 없는 리소스는 null 반환", () => {
      expect(normalizeResource("unknown")).toBe(null);
      expect(normalizeResource(undefined)).toBe(null);
    });
  });

  describe("PERMISSION_MATRIX 검증", () => {
    it("ADMIN은 모든 리소스에 list/show 권한 있음", () => {
      for (const resource of Object.keys(PERMISSION_MATRIX.ADMIN)) {
        const actions =
          PERMISSION_MATRIX.ADMIN[
            resource as keyof typeof PERMISSION_MATRIX.ADMIN
          ];
        expect(actions).toContain("list");
        expect(actions).toContain("show");
      }
    });

    it("VIEWER의 payments는 빈 배열", () => {
      expect(PERMISSION_MATRIX.VIEWER.payments).toEqual([]);
    });

    it("VIEWER의 audit-logs는 빈 배열", () => {
      expect(PERMISSION_MATRIX.VIEWER["audit-logs"]).toEqual([]);
    });

    it("MEMBER는 apps에 create 권한 있음", () => {
      expect(PERMISSION_MATRIX.MEMBER.apps).toContain("create");
    });

    it("MEMBER는 users에 create 권한 없음", () => {
      expect(PERMISSION_MATRIX.MEMBER.users).not.toContain("create");
    });
  });

  describe("에러 메시지", () => {
    it("권한 거부 시 적절한 사유 반환", async () => {
      const result = await accessControlProvider.can({
        action: "delete",
        resource: "apps",
        params: { user: { role: "VIEWER" } },
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe("앱에 대한 삭제 권한이 없습니다.");
    });

    it("payments 접근 불가 시 적절한 메시지", async () => {
      const result = await accessControlProvider.can({
        action: "list",
        resource: "payments",
        params: { user: { role: "VIEWER" } },
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe("결제에 대한 목록 조회 권한이 없습니다.");
    });
  });

  describe("세션 폴백 (params.user.role 없을 때)", () => {
    it("세션에서 ADMIN 역할을 가져와 권한 허용", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { role: "ADMIN" } }), {
          status: 200,
        })
      );

      const result = await accessControlProvider.can({
        action: "delete",
        resource: "users",
        params: {},
      });

      expect(result.can).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/session", {
        credentials: "include",
      });
    });

    it("세션에서 MEMBER 역할을 가져오면 삭제 거부", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { role: "MEMBER" } }), {
          status: 200,
        })
      );

      const result = await accessControlProvider.can({
        action: "delete",
        resource: "apps",
        params: {},
      });

      expect(result.can).toBe(false);
    });

    it("세션에서 VIEWER 역할을 가져오면 생성 거부", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { role: "VIEWER" } }), {
          status: 200,
        })
      );

      const result = await accessControlProvider.can({
        action: "create",
        resource: "apps",
        params: {},
      });

      expect(result.can).toBe(false);
    });

    it("세션 조회 실패 시 거부", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 401 })
      );

      const result = await accessControlProvider.can({
        action: "list",
        resource: "apps",
        params: {},
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe("권한이 없습니다.");
    });

    it("네트워크 에러 시 거부", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(
        new Error("Network error")
      );

      const result = await accessControlProvider.can({
        action: "list",
        resource: "apps",
        params: {},
      });

      expect(result.can).toBe(false);
    });

    it("params가 undefined일 때 세션에서 역할 조회", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { role: "ADMIN" } }), {
          status: 200,
        })
      );

      const result = await accessControlProvider.can({
        action: "delete",
        resource: "apps",
      });

      expect(result.can).toBe(true);
    });
  });

  describe("세션 캐시", () => {
    it("캐시된 역할을 재사용하여 fetch를 반복 호출하지 않음", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ user: { role: "ADMIN" } }), {
          status: 200,
        })
      );

      // 첫 번째 호출 - fetch 실행
      await accessControlProvider.can({
        action: "delete",
        resource: "apps",
        params: {},
      });

      // 두 번째 호출 - 캐시 사용
      const result = await accessControlProvider.can({
        action: "delete",
        resource: "users",
        params: {},
      });

      expect(result.can).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("params.user.role이 있으면 fetch를 호출하지 않음", async () => {
      const fetchSpy = vi.spyOn(global, "fetch");

      await accessControlProvider.can({
        action: "delete",
        resource: "apps",
        params: { user: { role: "ADMIN" } },
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("resetRoleCache 후 fetch를 다시 호출", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ user: { role: "ADMIN" } }), {
          status: 200,
        })
      );

      // 첫 번째 호출
      await accessControlProvider.can({
        action: "list",
        resource: "apps",
        params: {},
      });

      resetRoleCache();

      // 캐시 초기화 후 두 번째 호출
      await accessControlProvider.can({
        action: "list",
        resource: "apps",
        params: {},
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
