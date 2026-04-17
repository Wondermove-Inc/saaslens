/**
 * @file utils.test.ts
 * @description 유틸리티 함수 테스트 - cn, getBaseUrl
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cn, getBaseUrl } from "./utils";

describe("cn (className 병합 유틸리티)", () => {
  it("should merge multiple class names", () => {
    const result = cn("px-2", "py-1");
    expect(result).toBe("px-2 py-1");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("should filter out falsy values", () => {
    const result = cn("base", false && "hidden", null, undefined, "visible");
    expect(result).toBe("base visible");
  });

  it("should override conflicting Tailwind classes", () => {
    // tailwind-merge가 충돌하는 클래스를 병합
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("should handle array of classes", () => {
    const result = cn(["flex", "items-center"]);
    expect(result).toBe("flex items-center");
  });

  it("should handle object syntax", () => {
    const result = cn({
      "bg-red-500": true,
      "bg-blue-500": false,
      "text-white": true,
    });
    expect(result).toBe("bg-red-500 text-white");
  });

  it("should return empty string for no input", () => {
    const result = cn();
    expect(result).toBe("");
  });
});

describe("getBaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return production URL when VERCEL_ENV is production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "my-app.vercel.app";

    const result = getBaseUrl();

    expect(result).toBe("https://my-app.vercel.app");
  });

  it("should return preview URL when VERCEL_URL is set", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "my-app-preview-123.vercel.app";

    const result = getBaseUrl();

    expect(result).toBe("https://my-app-preview-123.vercel.app");
  });

  it("should return localhost with default port when no env vars set", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.PORT;

    const result = getBaseUrl();

    expect(result).toBe("http://localhost:3000");
  });

  it("should return localhost with custom port when PORT is set", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    process.env.PORT = "4000";

    const result = getBaseUrl();

    expect(result).toBe("http://localhost:4000");
  });
});
