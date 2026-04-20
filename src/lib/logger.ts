import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

/**
 * Pino Logger
 * - JSON output (production) / pretty print (development via pipe)
 * - 환경별 로그 레벨 (debug for dev, info for prod)
 * - 민감 정보 자동 마스킹
 */
export const logger = pino({
  level: isDev ? "debug" : "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  redact: {
    paths: [
      "password",
      "token",
      "secret",
      "authorization",
      "cookie",
      "*.password",
      "*.token",
      "*.secret",
      "*.authorization",
      "*.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      // payload 내 민감 정보 (Server Action withLogging)
      "payload.password",
      "payload.token",
      "payload.secret",
      "payload.privateKey",
      "payload.currentPassword",
      "payload.newPassword",
      "payload.confirmPassword",
      "payload.*.password",
      "payload.*.token",
      "payload.*.secret",
      "payload.*.privateKey",
      "payload.credentials.privateKey",
      "payload.credentials.secret",
      // request body 내 민감 정보 (API Route withLogging)
      "body.password",
      "body.token",
      "body.secret",
      "body.privateKey",
      "body.currentPassword",
      "body.newPassword",
      "body.confirmPassword",
      "body.*.password",
      "body.*.token",
      "body.*.secret",
      "body.*.privateKey",
      "body.credentials.privateKey",
      "body.credentials.secret",
      // response body 내 민감 정보 (API Route withLogging)
      "responseBody.password",
      "responseBody.token",
      "responseBody.secret",
      "responseBody.*.password",
      "responseBody.*.token",
      "responseBody.*.secret",
    ],
    censor: "[REDACTED]",
  },
  base: {
    service: process.env.SERVICE_NAME || "saaslens",
  },
});
