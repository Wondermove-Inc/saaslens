// prisma/schema.test.ts
// RED Phase: Prisma Schema 변경 사항을 검증하는 스냅샷 테스트
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("Prisma Schema - Extension Models", () => {
  const schemaPath = path.join(__dirname, "schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  describe("Extension Models", () => {
    it("should have ExtensionWhitelist model", () => {
      expect(schemaContent).toContain("model ExtensionWhitelist");
    });

    it("should have ExtensionBlacklist model", () => {
      expect(schemaContent).toContain("model ExtensionBlacklist");
    });

    it("should have ExtensionConfig model", () => {
      expect(schemaContent).toContain("model ExtensionConfig");
    });

    it("should have ExtensionBuild model", () => {
      expect(schemaContent).toContain("model ExtensionBuild");
    });
  });

  describe("Extension Enums", () => {
    it("should have ExtensionWhitelistSource enum", () => {
      expect(schemaContent).toContain("enum ExtensionWhitelistSource");
    });

    it("should have ExtensionConfigCategory enum", () => {
      expect(schemaContent).toContain("enum ExtensionConfigCategory");
    });

    it("should have ExtensionConfigValueType enum", () => {
      expect(schemaContent).toContain("enum ExtensionConfigValueType");
    });

    it("should have ExtensionPlatform enum", () => {
      expect(schemaContent).toContain("enum ExtensionPlatform");
    });

    it("should have ExtensionBuildStatus enum", () => {
      expect(schemaContent).toContain("enum ExtensionBuildStatus");
    });
  });

  describe("Organization Relations", () => {
    it("should have extensionWhitelists relation in Organization model", () => {
      expect(schemaContent).toContain(
        "extensionWhitelists ExtensionWhitelist[]"
      );
    });

    it("should have extensionBlacklists relation in Organization model", () => {
      expect(schemaContent).toContain(
        "extensionBlacklists ExtensionBlacklist[]"
      );
    });

    it("should have extensionConfigs relation in Organization model", () => {
      expect(schemaContent).toContain("extensionConfigs    ExtensionConfig[]");
    });

    it("should have extensionBuilds relation in Organization model", () => {
      expect(schemaContent).toContain("extensionBuilds     ExtensionBuild[]");
    });
  });
});
