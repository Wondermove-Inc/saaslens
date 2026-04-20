// src/lib/services/saas-classifier.test.ts
// SMP-196: Vercel AI SDK generateObject() 전환 후 테스트 업데이트
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BatchMerchantInput,
  classifyMerchantsBatchWithLLM,
  classifyMerchantWithLLM,
  SaaSInferenceInput,
} from "./saas-classifier";

// ==================== Mock: Vercel AI SDK ====================
const mockGenerateObject = vi.fn();

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (model: string) => ({ modelId: model, provider: "anthropic" }),
}));

// 환경 변수 백업
const originalEnv = process.env;

// 테스트마다 고유한 merchantName을 생성하기 위한 카운터
let testCounter = 0;
const uniqueName = (base: string) => `${base}_${Date.now()}_${testCounter++}`;

// 기본 SaaS 응답 헬퍼
const makeSaaSResult = (overrides = {}) => ({
  isSaaS: true,
  canonicalName: "Slack",
  website: "https://slack.com",
  category: "Communication",
  confidence: 0.95,
  suggestedPatterns: ["slack", "slack technologies"],
  reasoning: "Slack is a well-known team communication SaaS",
  pricingModel: null,
  ...overrides,
});

const makeUsage = (input = 100, output = 50) => ({
  inputTokens: input,
  outputTokens: output,
});

describe("saas-classifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ==================== classifyMerchantWithLLM ====================
  describe("classifyMerchantWithLLM", () => {
    it("should return missing_api_key when ANTHROPIC_API_KEY is not set", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const input: SaaSInferenceInput = { merchantName: "Slack Technologies" };
      const result = await classifyMerchantWithLLM(input);

      expect(result.inference).toBeNull();
      expect(result.errorCode).toBe("missing_api_key");
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("should classify a SaaS merchant correctly", async () => {
      const saasResult = makeSaaSResult();
      mockGenerateObject.mockResolvedValueOnce({
        object: saasResult,
        usage: makeUsage(100, 50),
      });

      const input: SaaSInferenceInput = {
        merchantName: "Slack Technologies",
        memo: "Team subscription",
        amount: 500,
        currency: "USD",
      };

      const result = await classifyMerchantWithLLM(input);

      expect(result.inference).not.toBeNull();
      expect(result.inference?.isSaaS).toBe(true);
      expect(result.inference?.canonicalName).toBe("Slack");
      expect(result.inference?.confidence).toBe(0.95);
      expect(result.usage?.promptTokens).toBe(100);
      expect(result.usage?.completionTokens).toBe(50);
      expect(result.usage?.totalTokens).toBe(150);
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it("should classify a non-SaaS merchant", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: makeSaaSResult({
          isSaaS: false,
          canonicalName: null,
          website: null,
          category: null,
          confidence: 0.9,
          suggestedPatterns: [],
          reasoning: "Starbucks is a coffee retail chain, not SaaS",
        }),
        usage: makeUsage(),
      });

      const input: SaaSInferenceInput = { merchantName: "Starbucks Coffee" };
      const result = await classifyMerchantWithLLM(input);

      expect(result.inference).not.toBeNull();
      expect(result.inference?.isSaaS).toBe(false);
      expect(result.inference?.canonicalName).toBeNull();
    });

    it("should handle rate_limit error from SDK", async () => {
      const err = new Error("rate_limit: Too many requests");
      mockGenerateObject.mockRejectedValueOnce(err);

      const input: SaaSInferenceInput = {
        merchantName: uniqueName("RateLimit"),
      };
      const result = await classifyMerchantWithLLM(input);

      expect(result.inference).toBeNull();
      expect(result.errorCode).toBe("rate_limit");
    });

    it("should handle timeout (AbortError)", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockGenerateObject.mockRejectedValueOnce(abortError);

      const input: SaaSInferenceInput = { merchantName: uniqueName("Timeout") };
      const result = await classifyMerchantWithLLM(input);

      expect(result.inference).toBeNull();
      expect(result.errorCode).toBe("timeout");
    });

    it("should handle generic exception", async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error("Network error"));

      const input: SaaSInferenceInput = {
        merchantName: uniqueName("Exception"),
      };
      const result = await classifyMerchantWithLLM(input);

      expect(result.inference).toBeNull();
      expect(result.errorCode).toBe("exception");
    });

    it("should return cached result on second call", async () => {
      const saasResult = makeSaaSResult({ canonicalName: "CacheTest" });
      mockGenerateObject.mockResolvedValueOnce({
        object: saasResult,
        usage: makeUsage(),
      });

      const input: SaaSInferenceInput = {
        merchantName: uniqueName("CachedMerchant"),
      };

      const first = await classifyMerchantWithLLM(input);
      const second = await classifyMerchantWithLLM(input);

      expect(first.inference?.canonicalName).toBe("CacheTest");
      expect(second.inference?.canonicalName).toBe("CacheTest");
      // Second call should be served from cache — SDK called only once
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it("should cache failure and skip retry within TTL", async () => {
      const rateLimitErr = new Error("rate_limit: Too many requests");
      mockGenerateObject.mockRejectedValueOnce(rateLimitErr);

      const input: SaaSInferenceInput = {
        merchantName: uniqueName("FailCached"),
      };

      const first = await classifyMerchantWithLLM(input);
      const second = await classifyMerchantWithLLM(input);

      expect(first.errorCode).toBe("rate_limit");
      expect(second.errorCode).toBe("rate_limit");
      // Should NOT call SDK again for same key within TTL
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it("should call generateObject with correct model and system prompt", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: makeSaaSResult(),
        usage: makeUsage(),
      });

      await classifyMerchantWithLLM({ merchantName: uniqueName("ModelCheck") });

      const call = mockGenerateObject.mock.calls[0][0];
      expect(call.model).toBeDefined();
      expect(call.system).toContain("SaaS payment classifier");
      expect(call.temperature).toBe(0.1);
      expect(call.maxOutputTokens).toBe(300);
    });

    it("should handle overloaded error from SDK", async () => {
      mockGenerateObject.mockRejectedValueOnce(
        new Error("overloaded: service busy")
      );

      const input: SaaSInferenceInput = {
        merchantName: uniqueName("Overloaded"),
      };
      const result = await classifyMerchantWithLLM(input);

      expect(result.inference).toBeNull();
      expect(result.errorCode).toBe("overloaded");
    });

    it("should handle context_length error from SDK", async () => {
      mockGenerateObject.mockRejectedValueOnce(
        new Error("context_length exceeded: too many tokens")
      );

      const input: SaaSInferenceInput = {
        merchantName: uniqueName("ContextLen"),
      };
      const result = await classifyMerchantWithLLM(input);

      expect(result.inference).toBeNull();
      expect(result.errorCode).toBe("context_length_exceeded");
    });

    it("should sanitize merchant name input", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: makeSaaSResult(),
        usage: makeUsage(),
      });

      // Should not throw even with suspicious input
      const input: SaaSInferenceInput = {
        merchantName: "Test Merchant",
        memo: "user@email.com https://malicious.site 1234567890123",
      };

      const result = await classifyMerchantWithLLM(input);
      expect(result.inference).not.toBeNull();

      // Prompt passed to SDK should have sanitized content
      const call = mockGenerateObject.mock.calls[0][0];
      expect(call.prompt).not.toContain("user@email.com");
      expect(call.prompt).not.toContain("https://malicious.site");
    });
  });

  // ==================== classifyMerchantsBatchWithLLM ====================
  describe("classifyMerchantsBatchWithLLM", () => {
    it("should return missing_api_key when ANTHROPIC_API_KEY is not set", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const merchants: BatchMerchantInput[] = [
        { id: "1", merchantName: "Slack" },
      ];
      const result = await classifyMerchantsBatchWithLLM(merchants);

      expect(result.errorCode).toBe("missing_api_key");
      expect(result.results).toHaveLength(1);
      expect(result.results[0].inference).toBeNull();
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("should return empty results for empty input", async () => {
      const result = await classifyMerchantsBatchWithLLM([]);
      expect(result.results).toHaveLength(0);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("should classify batch merchants correctly", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          results: [
            { id: "1", inference: makeSaaSResult({ canonicalName: "Slack" }) },
            {
              id: "2",
              inference: makeSaaSResult({
                isSaaS: false,
                canonicalName: null,
                website: null,
                category: null,
                confidence: 0.9,
                suggestedPatterns: [],
                reasoning: "Not SaaS",
              }),
            },
          ],
        },
        usage: makeUsage(200, 100),
      });

      const merchants: BatchMerchantInput[] = [
        { id: "1", merchantName: uniqueName("Slack") },
        { id: "2", merchantName: uniqueName("Starbucks") },
      ];

      const result = await classifyMerchantsBatchWithLLM(merchants);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].inference?.isSaaS).toBe(true);
      expect(result.results[1].inference?.isSaaS).toBe(false);
      expect(result.usage?.totalTokens).toBe(300);
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it("should limit batch to BATCH_SIZE (15)", async () => {
      const manyMerchants: BatchMerchantInput[] = Array.from(
        { length: 20 },
        (_, i) => ({ id: String(i), merchantName: uniqueName(`Merchant${i}`) })
      );

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          results: manyMerchants.slice(0, 15).map((m) => ({
            id: m.id,
            inference: makeSaaSResult(),
          })),
        },
        usage: makeUsage(),
      });

      const result = await classifyMerchantsBatchWithLLM(manyMerchants);
      // Only BATCH_SIZE (15) processed
      expect(result.results).toHaveLength(15);
    });

    it("should serve cached results in batch without extra SDK calls", async () => {
      const merchantName = uniqueName("CachedBatch");

      // First batch call — populates cache
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          results: [
            {
              id: "1",
              inference: makeSaaSResult({ canonicalName: "CachedBatch" }),
            },
          ],
        },
        usage: makeUsage(),
      });

      await classifyMerchantsBatchWithLLM([{ id: "1", merchantName }]);

      // Second call with same merchant — should use cache
      const result = await classifyMerchantsBatchWithLLM([
        { id: "2", merchantName },
      ]);

      expect(result.results[0].inference?.canonicalName).toBe("CachedBatch");
      // generateObject called only once (first batch)
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it("should handle batch timeout (AbortError)", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockGenerateObject.mockRejectedValueOnce(abortError);

      const merchants: BatchMerchantInput[] = [
        { id: "1", merchantName: uniqueName("TimeoutBatch") },
      ];

      const result = await classifyMerchantsBatchWithLLM(merchants);
      expect(result.errorCode).toBe("timeout");
      expect(result.results[0].inference).toBeNull();
    });

    it("should handle batch generic exception", async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error("SDK failure"));

      const merchants: BatchMerchantInput[] = [
        { id: "1", merchantName: uniqueName("ExceptionBatch") },
      ];

      const result = await classifyMerchantsBatchWithLLM(merchants);
      expect(result.errorCode).toBe("exception");
    });

    it("should call generateObject with correct batch params", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          results: [{ id: "1", inference: makeSaaSResult() }],
        },
        usage: makeUsage(),
      });

      await classifyMerchantsBatchWithLLM([
        { id: "1", merchantName: uniqueName("BatchParams") },
      ]);

      const call = mockGenerateObject.mock.calls[0][0];
      expect(call.system).toContain("SaaS payment classifier");
      expect(call.temperature).toBe(0.1);
      expect(call.maxOutputTokens).toBe(2048);
    });

    it("should support custom AbortSignal", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const controller = new AbortController();
      controller.abort();

      const result = await classifyMerchantWithLLM(
        { merchantName: uniqueName("AbortSignal") },
        { signal: controller.signal }
      );

      // API key missing → missing_api_key (before signal is checked)
      expect(result.errorCode).toBe("missing_api_key");
    });

    it("should support custom AbortSignal in batch", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const controller = new AbortController();
      controller.abort();

      const result = await classifyMerchantsBatchWithLLM(
        [{ id: "1", merchantName: uniqueName("BatchAbort") }],
        { signal: controller.signal }
      );

      expect(result.errorCode).toBe("missing_api_key");
    });
  });

  // ==================== parseUsage (internal via SDK usage mapping) ====================
  describe("usage mapping", () => {
    it("should map SDK inputTokens/outputTokens to legacy fields", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: makeSaaSResult(),
        usage: { inputTokens: 123, outputTokens: 456 },
      });

      const result = await classifyMerchantWithLLM({
        merchantName: uniqueName("UsageMap"),
      });

      expect(result.usage?.promptTokens).toBe(123);
      expect(result.usage?.completionTokens).toBe(456);
      expect(result.usage?.totalTokens).toBe(579);
    });

    it("should handle undefined SDK usage gracefully", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: makeSaaSResult(),
        usage: undefined,
      });

      const result = await classifyMerchantWithLLM({
        merchantName: uniqueName("NoUsage"),
      });

      expect(result.usage).toBeUndefined();
    });
  });

  // ==================== input sanitization ====================
  describe("input sanitization", () => {
    it("should truncate long merchant names", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: makeSaaSResult(),
        usage: makeUsage(),
      });

      const longName = "A".repeat(500);
      await classifyMerchantWithLLM({ merchantName: longName });

      const call = mockGenerateObject.mock.calls[0][0];
      // Prompt should contain truncated version — 500-char name is cut to 200+... = 203 chars
      // Full prompt is longer but merchant name section should be capped
      expect(call.prompt).toContain("...");
      // 500-char raw name should NOT appear verbatim
      expect(call.prompt).not.toContain("A".repeat(500));
    });

    it("should handle null/undefined optional fields", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: makeSaaSResult(),
        usage: makeUsage(),
      });

      const result = await classifyMerchantWithLLM({
        merchantName: uniqueName("NullFields"),
        memo: null,
        storeBizNo: null,
        amount: null,
        currency: null,
      });

      expect(result.inference).not.toBeNull();
    });

    it("should reject invalid currency format", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: makeSaaSResult(),
        usage: makeUsage(),
      });

      await classifyMerchantWithLLM({
        merchantName: uniqueName("BadCurrency"),
        currency: "INVALID_VERY_LONG",
      });

      const call = mockGenerateObject.mock.calls[0][0];
      // Invalid currency should be excluded from prompt
      expect(call.prompt).not.toContain("INVALID_VERY_LONG");
    });
  });
});
