import { applyRequestSubmitPolyfill } from "@/test-utils/request-submit-polyfill";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import koMessages from "./src/i18n/messages/ko.json";

// jest-dom matchers 확장
expect.extend(matchers);

// 각 테스트 후 cleanup
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Next.js navigation 모킹
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// next/cache 모킹
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// next/headers 모킹
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}));

// next-intl: stub that resolves keys against ko messages where possible.
// Falls back to the key when a message is not found (compatible with unit
// tests that don't care about translation text).
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");

  const lookup = (
    namespace: string,
    key: string,
    values?: Record<string, unknown>
  ): string => {
    const full = namespace ? `${namespace}.${key}` : key;
    const parts = full.split(".");
    let node: unknown = koMessages;
    for (const part of parts) {
      if (node && typeof node === "object" && part in (node as object)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return full;
      }
    }
    if (typeof node !== "string") return full;
    if (!values) return node;
    return Object.entries(values).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
      node
    );
  };

  return {
    ...actual,
    useTranslations: (namespace = "") => {
      const fn = (key: string, values?: Record<string, unknown>) =>
        lookup(namespace, key, values);
      (fn as unknown as { rich: (k: string) => string }).rich = (k: string) =>
        lookup(namespace, k);
      (fn as unknown as { raw: (k: string) => unknown }).raw = (k: string) =>
        lookup(namespace, k);
      return fn;
    },
    useLocale: () => "ko",
    useFormatter: () => ({
      dateTime: (d: Date) => d.toISOString(),
      number: (n: number) => String(n),
      relativeTime: (d: Date) => d.toISOString(),
    }),
    getTranslations:
      async (namespace = "") =>
      (key: string, values?: Record<string, unknown>) =>
        lookup(namespace, key, values),
  };
});

// next-intl/server: Server Component subpath mock
vi.mock("next-intl/server", () => {
  const lookup = (
    namespace: string,
    key: string,
    values?: Record<string, unknown>
  ): string => {
    const full = namespace ? `${namespace}.${key}` : key;
    const parts = full.split(".");
    let node: unknown = koMessages;
    for (const part of parts) {
      if (node && typeof node === "object" && part in (node as object)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return full;
      }
    }
    if (typeof node !== "string") return full;
    if (!values) return node;
    return Object.entries(values).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
      node
    );
  };

  return {
    getTranslations: async (namespace = "") => {
      const fn = (key: string, values?: Record<string, unknown>) =>
        lookup(namespace as string, key, values);
      (fn as unknown as { rich: (k: string) => string }).rich = (k: string) =>
        lookup(namespace as string, k);
      (fn as unknown as { raw: (k: string) => unknown }).raw = (k: string) =>
        lookup(namespace as string, k);
      return fn;
    },
    getLocale: async () => "ko",
    getFormatter: async () => ({
      dateTime: (d: Date) => d.toISOString(),
      number: (n: number) => String(n),
      relativeTime: (d: Date) => d.toISOString(),
    }),
    getMessages: async () => koMessages,
  };
});

// ResizeObserver 모킹 (shadcn/ui 컴포넌트에 필요)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// matchMedia 모킹
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver 모킹 (callback 즉시 호출하여 카운트업 등 동작)
// class 기반으로 정의하여 `new IntersectionObserver(...)` 호환
global.IntersectionObserver = class MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  constructor(callback: IntersectionObserverCallback) {
    this.observe = vi.fn((element: Element) => {
      callback(
        [
          {
            isIntersecting: true,
            target: element,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver
      );
    });
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }
} as unknown as typeof IntersectionObserver;

// framer-motion 모킹 (jsdom 호환)
vi.mock("framer-motion", async () => {
  const React = await import("react");

  // motion 프록시: HTML 요소에 대해 일반 요소로 폴백
  const motionProxy = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        const Component = React.forwardRef(function MotionMock(
          props: Record<string, unknown>,
          ref: React.Ref<HTMLElement>
        ) {
          const {
            initial: _initial,
            animate: _animate,
            exit: _exit,
            variants: _variants,
            whileInView: _whileInView,
            whileHover: _whileHover,
            whileTap: _whileTap,
            viewport: _viewport,
            transition: _transition,
            layout: _layout,
            layoutId: _layoutId,
            onAnimationComplete: _onAnimationComplete,
            ...rest
          } = props;
          return React.createElement(prop, { ...rest, ref });
        });
        Component.displayName = `motion.${prop}`;
        return Component;
      },
    }
  );

  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useAnimation: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      set: vi.fn(),
    }),
    useInView: () => true,
    // animate() 모킹: onUpdate를 즉시 최종값으로 호출
    animate: (
      from: number,
      to: number,
      options?: { onUpdate?: (v: number) => void }
    ) => {
      options?.onUpdate?.(to);
      return { stop: vi.fn(), cancel: vi.fn() };
    },
  };
});

// scrollTo 모킹
window.scrollTo = vi.fn();

// jsdom에서 requestSubmit 미구현 대응 (공용 폴리필)
applyRequestSubmitPolyfill();

// NEXT_REDIRECT 등 테스트 노이즈 필터링
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const hasRedirect = args.some((arg) => {
    if (typeof arg === "string" && arg.includes("NEXT_REDIRECT")) return true;
    if (arg instanceof Error) {
      const digest = (arg as { digest?: string }).digest;
      if (typeof digest === "string" && digest.includes("NEXT_REDIRECT"))
        return true;
      if (arg.message.includes("NEXT_REDIRECT")) return true;
    }
    // 문자열 변환으로도 확인 (Unknown 타입 방지)
    if (String(arg).includes("NEXT_REDIRECT")) return true;
    return false;
  });

  if (hasRedirect) {
    return;
  }

  originalConsoleError(...args);
};
