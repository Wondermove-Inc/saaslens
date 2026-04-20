import { I18nProvider } from "@refinedev/core";

type Locale = "ko" | "en";

const messages: Record<Locale, Record<string, string>> = {
  ko: {
    "buttons.create": "생성",
    "buttons.edit": "수정",
    "buttons.delete": "삭제",
    "buttons.show": "상세",
    "buttons.save": "저장",
    "buttons.cancel": "취소",
    "buttons.refresh": "새로고침",
  },
  en: {
    "buttons.create": "Create",
    "buttons.edit": "Edit",
    "buttons.delete": "Delete",
    "buttons.show": "Show",
    "buttons.save": "Save",
    "buttons.cancel": "Cancel",
    "buttons.refresh": "Refresh",
  },
};

let currentLocale: Locale = "ko";

/**
 * Refine I18nProvider 스켈레톤.
 * - 초기에는 주요 버튼 키만 포함하며, 후속 작업에서 pages/notifications 등으로 확장한다.
 */
export const i18nProvider: I18nProvider = {
  translate: (key: string, options?: Record<string, unknown>) => {
    const template = messages[currentLocale]?.[key];
    if (!template) {
      return key;
    }

    if (!options) {
      return template;
    }

    return Object.entries(options).reduce(
      (acc, [optionKey, value]) =>
        acc.replace(`{{${optionKey}}}`, String(value)),
      template
    );
  },
  changeLocale: async (lang: string) => {
    if (lang === "en" || lang === "ko") {
      currentLocale = lang;
    }
    return Promise.resolve();
  },
  getLocale: () => currentLocale,
};
