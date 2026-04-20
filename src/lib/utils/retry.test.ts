// src/lib/utils/retry.test.ts
import { describe, expect, it, vi } from "vitest";
import { isRetryableError, processInBatches, withRetry } from "./retry";

describe("retry utilities", () => {
  describe("isRetryableError", () => {
    it("네트워크 에러는 재시도 가능해야 한다", () => {
      expect(isRetryableError(new Error("network error"))).toBe(true);
      expect(isRetryableError(new Error("timeout occurred"))).toBe(true);
      expect(isRetryableError(new Error("ECONNRESET"))).toBe(true);
      expect(isRetryableError(new Error("ECONNREFUSED"))).toBe(true);
    });

    it("rate limit 에러는 재시도 가능해야 한다", () => {
      expect(isRetryableError(new Error("rate limit exceeded"))).toBe(true);
      expect(isRetryableError(new Error("Too many requests"))).toBe(true);
    });

    it("서버 에러는 재시도 가능해야 한다", () => {
      expect(isRetryableError(new Error("500 Internal Server Error"))).toBe(
        true
      );
      expect(isRetryableError(new Error("502 Bad Gateway"))).toBe(true);
      expect(isRetryableError(new Error("503 Service Unavailable"))).toBe(true);
    });

    it("일반 에러는 재시도 불가능해야 한다", () => {
      expect(isRetryableError(new Error("validation error"))).toBe(false);
      expect(isRetryableError(new Error("user not found"))).toBe(false);
      expect(isRetryableError(new Error("unauthorized"))).toBe(false);
    });
  });

  describe("withRetry", () => {
    it("성공하면 결과를 반환해야 한다", async () => {
      const fn = vi.fn().mockResolvedValue("success");

      const result = await withRetry(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("일시적 실패 후 재시도해서 성공해야 한다", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValue("success");

      const result = await withRetry(fn, {
        initialDelay: 10,
        maxRetries: 3,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("재시도 불가능한 에러는 즉시 실패해야 한다", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("validation error"));

      await expect(
        withRetry(fn, { initialDelay: 10, maxRetries: 3 })
      ).rejects.toThrow("validation error");

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("최대 재시도 횟수 초과 시 에러를 던져야 한다", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("network error"));

      await expect(
        withRetry(fn, { initialDelay: 10, maxRetries: 2 })
      ).rejects.toThrow("network error");

      expect(fn).toHaveBeenCalledTimes(3); // 초기 + 2번 재시도
    });

    it("onRetry 콜백이 호출되어야 한다", async () => {
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValue("success");

      await withRetry(fn, {
        initialDelay: 10,
        maxRetries: 3,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        expect.any(Number)
      );
    });
  });

  describe("processInBatches", () => {
    it("배치로 항목을 처리해야 한다", async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi
        .fn()
        .mockImplementation((n) => Promise.resolve(n * 2));

      const { results, errors } = await processInBatches(items, 2, processor);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(errors).toHaveLength(0);
      expect(processor).toHaveBeenCalledTimes(5);
    });

    it("에러 발생 시 continueOnError가 true면 계속 처리해야 한다", async () => {
      const items = [1, 2, 3];
      const processor = vi.fn().mockImplementation((n) => {
        if (n === 2) return Promise.reject(new Error("failed"));
        return Promise.resolve(n);
      });

      const { results, errors } = await processInBatches(items, 1, processor, {
        continueOnError: true,
      });

      expect(results).toEqual([1, 3]);
      expect(errors).toHaveLength(1);
      expect(errors[0].item).toBe(2);
    });

    it("onBatchStart 콜백이 호출되어야 한다", async () => {
      const items = [1, 2, 3, 4];
      const onBatchStart = vi.fn();
      const processor = vi.fn().mockResolvedValue(1);

      await processInBatches(items, 2, processor, { onBatchStart });

      expect(onBatchStart).toHaveBeenCalledTimes(2);
      expect(onBatchStart).toHaveBeenCalledWith(0, 2);
      expect(onBatchStart).toHaveBeenCalledWith(1, 2);
    });
  });
});
