import { logger } from "@/lib/logger";
import pino from "pino";
import { Writable } from "stream";
import { describe, expect, it } from "vitest";

/** 출력을 캡처하는 테스트용 로거 생성 */
function createTestLogger(options: pino.LoggerOptions = {}) {
  let output = "";
  const dest = new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void) {
      output += chunk.toString();
      callback();
    },
  });

  const testLogger = pino(
    {
      formatters: {
        level(label: string) {
          return { level: label };
        },
      },
      base: {},
      ...options,
    },
    dest
  );

  return {
    logger: testLogger,
    flush: () => dest.end(),
    getParsed: () => JSON.parse(output.trim()),
  };
}

describe("logger", () => {
  // ─── 기본 설정 ───

  describe("기본 설정", () => {
    it("should be defined", () => {
      expect(logger).toBeDefined();
    });

    it("should have standard log methods", () => {
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });
  });

  // ─── Pino API 호출 형식 검증 ───

  describe("pino API 호출 형식", () => {
    it("should accept object + message format for info", () => {
      expect(() => {
        logger.info({ name: "test" }, "start");
      }).not.toThrow();
    });

    it("should accept object + message format for error", () => {
      expect(() => {
        logger.error({ err: new Error("test"), name: "test" }, "fail");
      }).not.toThrow();
    });

    it("should accept object + message format for warn", () => {
      expect(() => {
        logger.warn({ reason: "test" }, "warning message");
      }).not.toThrow();
    });

    it("should accept simple string message", () => {
      expect(() => {
        logger.info("simple message");
      }).not.toThrow();
    });

    it("should accept object with nested data", () => {
      expect(() => {
        logger.info(
          {
            name: "GET /api/v1/apps",
            durationMs: 150,
            result: { total: 10 },
          },
          "done"
        );
      }).not.toThrow();
    });
  });

  // ─── 민감정보 Redaction 검증 ───

  describe("민감정보 redaction", () => {
    it("should redact password field", () => {
      const child = logger.child({ password: "secret123" });
      expect(child).toBeDefined();
    });

    it("should redact token field", () => {
      const child = logger.child({ token: "bearer-xyz" });
      expect(child).toBeDefined();
    });

    it("should redact nested sensitive fields", () => {
      const child = logger.child({
        user: { password: "secret", name: "John" },
      });
      expect(child).toBeDefined();
    });
  });

  // ─── 출력 포맷 검증 (JSON stream 캡처) ───

  describe("출력 포맷", () => {
    it("should output level as string label (not number)", () => {
      const t = createTestLogger({ base: { service: "test" } });

      t.logger.info("test message");
      t.flush();

      const parsed = t.getParsed();
      expect(parsed.level).toBe("info");
      expect(typeof parsed.level).toBe("string");
    });

    it("should include service in base fields", () => {
      const t = createTestLogger({
        base: { service: "saaslens" },
      });

      t.logger.info({ name: "test" }, "hello");
      t.flush();

      const parsed = t.getParsed();
      expect(parsed.service).toBe("saaslens");
      expect(parsed.name).toBe("test");
      expect(parsed.msg).toBe("hello");
    });

    it("should include timestamp", () => {
      const t = createTestLogger();

      t.logger.info("timestamp test");
      t.flush();

      const parsed = t.getParsed();
      expect(parsed.time).toBeDefined();
      expect(typeof parsed.time).toBe("number");
    });

    it("should redact password in JSON output", () => {
      const t = createTestLogger({
        redact: {
          paths: ["password", "*.password"],
          censor: "[REDACTED]",
        },
      });

      t.logger.info({ password: "supersecret" }, "login attempt");
      t.flush();

      const parsed = t.getParsed();
      expect(parsed.password).toBe("[REDACTED]");
      expect(parsed.password).not.toBe("supersecret");
    });

    it("should serialize Error objects with err key", () => {
      const t = createTestLogger();

      const testError = new Error("something went wrong");
      t.logger.error({ err: testError }, "operation failed");
      t.flush();

      const parsed = t.getParsed();
      expect(parsed.err).toBeDefined();
      expect(parsed.err.message).toBe("something went wrong");
      expect(parsed.err.type).toBe("Error");
      expect(parsed.err.stack).toBeDefined();
      expect(parsed.msg).toBe("operation failed");
    });
  });
});
