// src/lib/ai/pending-action-store.test.ts
// SMP-204: Pending Action Store 단위 테스트

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearStore,
  getStoreSize,
  hashParams,
  storePendingAction,
  validateAndConsume,
} from "./pending-action-store";

describe("pending-action-store", () => {
  beforeEach(() => {
    clearStore();
    vi.restoreAllMocks();
  });

  describe("hashParams", () => {
    it("동일한 params에 대해 같은 해시를 반환한다", () => {
      const params = { appId: "app-1", action: "create_app", name: "Test" };
      expect(hashParams(params)).toBe(hashParams(params));
    });

    it("키 순서가 달라도 같은 해시를 반환한다", () => {
      const a = { name: "Test", action: "create_app" };
      const b = { action: "create_app", name: "Test" };
      expect(hashParams(a)).toBe(hashParams(b));
    });

    it("다른 params에 대해 다른 해시를 반환한다", () => {
      const a = { name: "Test" };
      const b = { name: "Other" };
      expect(hashParams(a)).not.toBe(hashParams(b));
    });
  });

  describe("storePendingAction", () => {
    it("pending action을 저장한다", () => {
      storePendingAction(
        "id-1",
        "create_app",
        { name: "Test" },
        "org-1",
        "user-1"
      );
      expect(getStoreSize()).toBe(1);
    });

    it("여러 pending action을 저장할 수 있다", () => {
      storePendingAction(
        "id-1",
        "create_app",
        { name: "A" },
        "org-1",
        "user-1"
      );
      storePendingAction("id-2", "delete_app", { id: "B" }, "org-1", "user-1");
      expect(getStoreSize()).toBe(2);
    });
  });

  describe("validateAndConsume", () => {
    it("유효한 요청을 승인하고 store에서 삭제한다", () => {
      const params = { action: "create_app", name: "Test" };
      storePendingAction("id-1", "create_app", params, "org-1", "user-1");

      const result = validateAndConsume("id-1", params, "org-1", "user-1");
      expect(result).toEqual({ valid: true });
      expect(getStoreSize()).toBe(0);
    });

    it("존재하지 않는 ID를 거부한다", () => {
      const result = validateAndConsume("nonexistent", {}, "org-1", "user-1");
      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining("만료되었거나"),
        status: 400,
      });
    });

    it("이미 소비된 요청을 거부한다 (1회 사용)", () => {
      const params = { action: "create_app", name: "Test" };
      storePendingAction("id-1", "create_app", params, "org-1", "user-1");

      // 첫 번째 소비 → 성공
      const first = validateAndConsume("id-1", params, "org-1", "user-1");
      expect(first).toEqual({ valid: true });

      // 두 번째 소비 → 실패 (리플레이 공격 방지)
      const second = validateAndConsume("id-1", params, "org-1", "user-1");
      expect(second).toEqual({
        valid: false,
        error: expect.stringContaining("만료되었거나"),
        status: 400,
      });
    });

    it("TTL 초과된 요청을 거부한다", () => {
      const params = { action: "create_app", name: "Test" };
      storePendingAction("id-1", "create_app", params, "org-1", "user-1");

      // 시간을 6분 후로 이동
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 1000);

      const result = validateAndConsume("id-1", params, "org-1", "user-1");
      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining("시간이 초과"),
        status: 400,
      });
    });

    it("다른 조직의 요청을 거부한다", () => {
      const params = { action: "create_app", name: "Test" };
      storePendingAction("id-1", "create_app", params, "org-1", "user-1");

      const result = validateAndConsume("id-1", params, "org-2", "user-1");
      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining("권한이 없습니다"),
        status: 403,
      });
    });

    it("다른 사용자의 요청을 거부한다", () => {
      const params = { action: "create_app", name: "Test" };
      storePendingAction("id-1", "create_app", params, "org-1", "user-1");

      const result = validateAndConsume("id-1", params, "org-1", "user-2");
      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining("권한이 없습니다"),
        status: 403,
      });
    });

    it("변조된 params를 거부한다", () => {
      const original = { action: "create_app", name: "Test" };
      storePendingAction("id-1", "create_app", original, "org-1", "user-1");

      const tampered = { action: "delete_app", id: "victim-app" };
      const result = validateAndConsume("id-1", tampered, "org-1", "user-1");
      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining("변조"),
        status: 400,
      });
    });
  });

  describe("clearStore", () => {
    it("store를 초기화한다", () => {
      storePendingAction("id-1", "create_app", {}, "org-1", "user-1");
      storePendingAction("id-2", "delete_app", {}, "org-1", "user-1");
      expect(getStoreSize()).toBe(2);

      clearStore();
      expect(getStoreSize()).toBe(0);
    });
  });
});
