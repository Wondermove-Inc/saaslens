import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";

import "../app/globals.css";
import "./preview.css";

const preview: Preview = {
  parameters: {
    react: {
      rootSelector: "#root",
    },
    options: {
      storySort: {
        order: ["foundation", "design", "ui", "templates", "*"],
        method: "alphabetical",
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations (WCAG 2.1 AA compliance enforced)
      // 'off' - skip a11y checks entirely
      test: "error",
    },
    backgrounds: {
      disable: false,
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#0a0a0a" },
        { name: "gray", value: "#f5f5f5" },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile",
          styles: { width: "375px", height: "667px" },
          type: "mobile",
        },
        tablet: {
          name: "Tablet",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1920px", height: "1080px" },
          type: "desktop",
        },
        figmaDesktop: {
          name: "Figma Desktop",
          styles: { width: "1721px", height: "1080px" },
          type: "desktop",
        },
      },
      defaultViewport: "desktop",
    },
  },

  tags: ["autodocs"],
  decorators: [
    // 테마 및 모드 조합 선택 (7가지 색상 × 2가지 모드 = 14가지 조합)
    // 모든 컬러 테마는 다중 클래스 방식으로 default 테마로 폴백
    withThemeByClassName({
      themes: {
        "default-light": "theme-default-light",
        "default-dark": "theme-default-dark",
        "red-light": "theme-default-light theme-red-light",
        "red-dark": "theme-default-dark theme-red-dark",
        "orange-light": "theme-default-light theme-orange-light",
        "orange-dark": "theme-default-dark theme-orange-dark",
        "green-light": "theme-default-light theme-green-light",
        "green-dark": "theme-default-dark theme-green-dark",
        "blue-light": "theme-default-light theme-blue-light",
        "blue-dark": "theme-default-dark theme-blue-dark",
        "yellow-light": "theme-default-light theme-yellow-light",
        "yellow-dark": "theme-default-dark theme-yellow-dark",
        "violet-light": "theme-default-light theme-violet-light",
        "violet-dark": "theme-default-dark theme-violet-dark",
      },
      defaultTheme: "blue-light",
      parentSelector: "html",
    }),
  ],
};

export default preview;
