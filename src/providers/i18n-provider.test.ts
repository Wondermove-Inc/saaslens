import { describe, expect, it } from "vitest";
import { i18nProvider } from "./i18n-provider";

describe("i18nProvider", () => {
  it("기본 로케일을 반환한다", () => {
    expect(i18nProvider.getLocale?.()).toBe("ko");
  });

  it("로케일을 변경할 수 있다", async () => {
    await i18nProvider.changeLocale?.("en");
    expect(i18nProvider.getLocale?.()).toBe("en");
    // 기본값 복원
    await i18nProvider.changeLocale?.("ko");
  });

  it("번역 키를 찾으면 반환하고, 없으면 원본을 반환한다", () => {
    const t = i18nProvider.translate;
    expect(t?.("buttons.save")).toBe("저장");
    expect(t?.("nonexistent.key")).toBe("nonexistent.key");
  });
});
