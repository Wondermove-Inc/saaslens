// src/components/apps/app-form.test.tsx
import messages from "@/i18n/messages/ko.json";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppForm } from "./app-form";
import { APP_TEMPLATES } from "./app-templates";

// next-intl mock: ko.json 메시지 기반으로 번역 함수 제공
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (
      acc &&
      typeof acc === "object" &&
      key in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[key];
    }
    return path;
  }, obj);
  return typeof value === "string" ? value : path;
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    return (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      let result = getNestedValue(
        messages as unknown as Record<string, unknown>,
        fullKey
      );
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    };
  },
  useLocale: () => "ko",
}));

const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
};

let mockValues: Record<string, string>;
const mockOnFinish = vi.fn();
let mockErrors: Record<string, { message: string }>;
let mockFormLoading = false;
let mockIsSubmitting = false;
let mockMutationResult: Record<string, unknown> | undefined;

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

vi.mock("@/actions/teams", () => ({
  getTeams: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock("react-hook-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-hook-form")>();
  return {
    ...actual,
    Controller: ({
      name,
      render,
    }: {
      name: string;
      render: (props: unknown) => React.ReactElement;
    }) =>
      render({
        field: {
          name,
          value: mockValues[name],
          onChange: (value: string) => {
            mockValues[name] = value;
          },
        },
      }),
  };
});

const mockSetValue = vi.fn((name: string, value: unknown) => {
  mockValues[name] = value as string;
});

vi.mock("@refinedev/react-hook-form", () => ({
  useForm: (options?: { defaultValues?: Record<string, string> }) => {
    // 초기화 시에만 기본값 설정 (이미 값이 있으면 덮어쓰지 않음)
    if (Object.keys(mockValues).length === 0) {
      mockValues = { ...(options?.defaultValues ?? {}) };
    }
    return {
      refineCore: {
        onFinish: mockOnFinish,
        formLoading: mockFormLoading,
        mutationResult: mockMutationResult,
      },
      handleSubmit: (cb: (values: Record<string, string>) => unknown) => () =>
        cb({ ...mockValues } as Record<string, string>),
      register: (name: string) => ({
        name,
        defaultValue: mockValues[name] ?? "",
        onChange: (event: { target: { value: string } }) => {
          mockValues[name] = event.target.value;
        },
        onBlur: vi.fn(),
        ref: vi.fn(),
      }),
      control: {},
      setValue: mockSetValue,
      watch: (name: string) => mockValues[name] ?? "",
      formState: { errors: mockErrors, isSubmitting: mockIsSubmitting },
    };
  },
}));

describe("AppForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues = {
      name: "",
      category: "",
      customWebsite: "",
      tags: "",
      notes: "",
    };
    mockErrors = {};
    mockFormLoading = false;
    mockIsSubmitting = false;
    mockMutationResult = undefined;
    mockOnFinish.mockResolvedValue({ data: { id: "new-app-1" } });
  });

  it("필수 입력 필드가 렌더링되어야 한다", () => {
    render(<AppForm />);

    expect(screen.getByLabelText(/앱 이름/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /등록/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /취소/ })).toBeInTheDocument();
  });

  it("선택적 입력 필드가 렌더링되어야 한다", () => {
    render(<AppForm />);

    expect(screen.getByLabelText(/카테고리/)).toBeInTheDocument();
    expect(screen.getByLabelText(/웹사이트/)).toBeInTheDocument();
    expect(screen.getByLabelText(/설명/)).toBeInTheDocument();
    expect(screen.getByLabelText(/태그/)).toBeInTheDocument();
  });

  it("앱 이름이 비어있으면 브라우저 기본 validation이 동작해야 한다", async () => {
    const user = userEvent.setup();
    render(<AppForm />);

    const nameInput = screen.getByLabelText(/앱 이름/) as HTMLInputElement;
    const submitButton = screen.getByRole("button", { name: /등록/ });

    await user.click(submitButton);

    // HTML5 validation
    expect(nameInput.validity.valueMissing).toBe(true);
  });

  it("취소 버튼 클릭시 이전 페이지로 이동해야 한다", async () => {
    const user = userEvent.setup();
    render(<AppForm />);

    const cancelButton = screen.getByRole("button", { name: /취소/ });
    await user.click(cancelButton);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("폼 제출 성공 시 앱 목록 페이지로 이동해야 한다", async () => {
    const user = userEvent.setup();
    render(<AppForm />);

    const nameInput = screen.getByLabelText(/앱 이름/);
    await user.type(nameInput, "New Test App");

    const submitButton = screen.getByRole("button", { name: /등록/ });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(mockOnFinish).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/apps/new-app-1");
    });
  });

  it("서버 에러 발생 시 에러 메시지를 표시해야 한다", async () => {
    mockOnFinish.mockRejectedValueOnce(new Error("이미 등록된 앱 이름입니다"));

    const user = userEvent.setup();
    render(<AppForm />);

    const nameInput = screen.getByLabelText(/앱 이름/);
    await user.type(nameInput, "Existing App");

    const submitButton = screen.getByRole("button", { name: /등록/ });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(screen.getByText("이미 등록된 앱 이름입니다")).toBeInTheDocument();
    });
  });

  it("로딩 중일 때 버튼이 비활성화되어야 한다", async () => {
    mockFormLoading = true;

    const user = userEvent.setup();
    render(<AppForm />);

    const nameInput = screen.getByLabelText(/앱 이름/);
    await user.type(nameInput, "Test App");

    const submitButton = screen.getByRole("button", { name: /등록/ });
    await user.click(submitButton);

    // During loading, button should be disabled
    await vi.waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it("모든 필드를 올바르게 제출해야 한다", async () => {
    const user = userEvent.setup();
    render(<AppForm />);

    await user.type(screen.getByLabelText(/앱 이름/), "Slack");
    await user.type(screen.getByLabelText(/카테고리/), "Collaboration");
    await user.type(screen.getByLabelText(/웹사이트/), "https://slack.com");
    await user.type(screen.getByLabelText(/태그/), "chat, team, messaging");
    await user.type(screen.getByLabelText(/설명/), "팀 커뮤니케이션 도구");

    const submitButton = screen.getByRole("button", { name: /등록/ });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(mockOnFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "Collaboration",
          customWebsite: "https://slack.com",
          name: "Slack",
          notes: "팀 커뮤니케이션 도구",
          tags: "chat, team, messaging",
        })
      );
    });
  });

  describe("템플릿 기능", () => {
    it("빠른 입력 템플릿 버튼들이 렌더링되어야 한다", () => {
      render(<AppForm />);

      expect(screen.getByText("빠른 입력:")).toBeInTheDocument();
      APP_TEMPLATES.forEach((template) => {
        expect(screen.getByAltText(template.name)).toBeInTheDocument();
      });
    });

    it("Slack 템플릿 클릭 시 폼이 자동으로 채워져야 한다", async () => {
      const user = userEvent.setup();
      render(<AppForm />);

      const slackButton = screen.getByAltText("Slack").closest("button");
      expect(slackButton).toBeInTheDocument();
      await user.click(slackButton!);

      const slackTemplate = APP_TEMPLATES.find((t) => t.id === "slack")!;
      expect(mockSetValue).toHaveBeenCalledWith("name", slackTemplate.name);
      expect(mockSetValue).toHaveBeenCalledWith(
        "category",
        slackTemplate.category
      );
      expect(mockSetValue).toHaveBeenCalledWith(
        "customWebsite",
        slackTemplate.website
      );
      expect(mockSetValue).toHaveBeenCalledWith("customLogoUrl", "");
      expect(mockSetValue).toHaveBeenCalledWith(
        "tags",
        slackTemplate.tags!["ko"]
      );
    });

    it("Claude 템플릿 클릭 시 폼이 자동으로 채워져야 한다", async () => {
      const user = userEvent.setup();
      render(<AppForm />);

      const claudeButton = screen.getByAltText("Claude").closest("button");
      expect(claudeButton).toBeInTheDocument();
      await user.click(claudeButton!);

      const claudeTemplate = APP_TEMPLATES.find((t) => t.id === "claude")!;
      expect(mockSetValue).toHaveBeenCalledWith("name", claudeTemplate.name);
      expect(mockSetValue).toHaveBeenCalledWith(
        "category",
        claudeTemplate.category
      );
      expect(mockSetValue).toHaveBeenCalledWith(
        "customWebsite",
        claudeTemplate.website
      );
      expect(mockSetValue).toHaveBeenCalledWith("customLogoUrl", "");
      expect(mockSetValue).toHaveBeenCalledWith(
        "tags",
        claudeTemplate.tags!["ko"]
      );
    });

    it("ChatGPT 템플릿 클릭 시 폼이 자동으로 채워져야 한다", async () => {
      const user = userEvent.setup();
      render(<AppForm />);

      const openaiButton = screen.getByAltText("ChatGPT").closest("button");
      expect(openaiButton).toBeInTheDocument();
      await user.click(openaiButton!);

      const openaiTemplate = APP_TEMPLATES.find((t) => t.id === "openai")!;
      expect(mockSetValue).toHaveBeenCalledWith("name", openaiTemplate.name);
      expect(mockSetValue).toHaveBeenCalledWith(
        "category",
        openaiTemplate.category
      );
      expect(mockSetValue).toHaveBeenCalledWith(
        "customWebsite",
        openaiTemplate.website
      );
      expect(mockSetValue).toHaveBeenCalledWith("customLogoUrl", "");
      expect(mockSetValue).toHaveBeenCalledWith(
        "tags",
        openaiTemplate.tags!["ko"]
      );
    });

    it("Cursor 템플릿 클릭 시 폼이 자동으로 채워져야 한다", async () => {
      const user = userEvent.setup();
      render(<AppForm />);

      const cursorButton = screen.getByAltText("Cursor").closest("button");
      expect(cursorButton).toBeInTheDocument();
      await user.click(cursorButton!);

      const cursorTemplate = APP_TEMPLATES.find((t) => t.id === "cursor")!;
      expect(mockSetValue).toHaveBeenCalledWith("name", cursorTemplate.name);
      expect(mockSetValue).toHaveBeenCalledWith(
        "category",
        cursorTemplate.category
      );
      expect(mockSetValue).toHaveBeenCalledWith(
        "customWebsite",
        cursorTemplate.website
      );
      expect(mockSetValue).toHaveBeenCalledWith("customLogoUrl", "");
      expect(mockSetValue).toHaveBeenCalledWith(
        "tags",
        cursorTemplate.tags!["ko"]
      );
    });

    it("로딩 중일 때 템플릿 버튼들이 비활성화되어야 한다", () => {
      mockFormLoading = true;
      render(<AppForm />);

      APP_TEMPLATES.forEach((template) => {
        const button = screen.getByAltText(template.name).closest("button");
        expect(button).toBeDisabled();
      });
    });
  });
});
