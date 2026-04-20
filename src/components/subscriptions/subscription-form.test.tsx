// src/components/subscriptions/subscription-form.test.tsx
import messages from "@/i18n/messages/ko.json";
import type { SubscriptionDetail } from "@/types/subscription";
import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionForm } from "./subscription-form";
import type { AppWithTeams } from "./subscription-form-assignment";

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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock shadcn/ui components (radix-ui 기반 → React dual-copy 방지)
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
    disabled,
    name,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
    name?: string;
  }) => (
    <div data-testid={`select-${name ?? "default"}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<Record<string, unknown>>,
            { value, onValueChange, disabled }
          );
        }
        return child;
      })}
    </div>
  ),
  SelectTrigger: ({
    children,
    id,
    ...props
  }: {
    children: React.ReactNode;
    id?: string;
    value?: string;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
  }) => (
    <button
      role="combobox"
      id={id}
      aria-labelledby={id ? `label-${id}` : undefined}
    >
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandInput: ({ placeholder }: { placeholder?: string }) => (
    <input placeholder={placeholder} />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    id?: string;
  }) => (
    <input
      type="checkbox"
      checked={checked ?? false}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      id={id}
      {...props}
    />
  ),
}));

// Mock sub-components that also use radix-ui internally
vi.mock("./subscription-form-assignment", () => ({
  SubscriptionFormAssignment: () => <div data-testid="form-assignment" />,
}));

vi.mock("./subscription-form-period", () => ({
  SubscriptionFormPeriod: ({
    control,
    errors,
    isPending,
  }: {
    control: unknown;
    errors: Record<string, unknown>;
    isPending: boolean;
  }) => (
    <div data-testid="form-period">
      <label htmlFor="startDate">시작일 *</label>
      <input id="startDate" type="date" />
    </div>
  ),
}));

vi.mock("./subscription-form-renewal", () => ({
  SubscriptionFormRenewal: ({
    control,
    isPending,
  }: {
    control: unknown;
    isPending: boolean;
  }) => (
    <div data-testid="form-renewal">
      <label>
        <input type="checkbox" defaultChecked />
        자동 갱신
      </label>
      <label>
        <input type="checkbox" defaultChecked />
        30일 전 알림
      </label>
      <label>
        <input type="checkbox" />
        60일 전 알림
      </label>
      <label>
        <input type="checkbox" />
        90일 전 알림
      </label>
    </div>
  ),
}));

vi.mock("./subscription-form-pricing", () => ({
  SubscriptionFormPricing: ({
    errors,
    isPending,
    register,
  }: {
    errors: Record<string, { message?: string }>;
    isPending: boolean;
    register: (name: string) => Record<string, unknown>;
  }) => (
    <div data-testid="form-pricing">
      <label htmlFor="billingCycle">결제 주기 *</label>
      <label htmlFor="amount">금액 *</label>
      <input id="amount" type="number" {...register("amount")} />
      {errors.amount?.message && (
        <p className="text-destructive text-sm">{errors.amount.message}</p>
      )}
    </div>
  ),
}));

let mockValues: Record<string, unknown> = {};
let mockErrors: Record<string, { message: string }> = {};
let mockIsSubmitting = false;
let mockFormLoading = false;
let capturedOnFinishPayload: Record<string, unknown> | null = null;

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
    useWatch: ({ name }: { name: string }) => mockValues[name],
  };
});

vi.mock("@refinedev/react-hook-form", () => ({
  useForm: (options?: { defaultValues?: Record<string, unknown> }) => {
    mockValues = { ...(options?.defaultValues ?? {}) };
    return {
      refineCore: {
        onFinish: vi.fn(async (payload: Record<string, unknown>) => {
          capturedOnFinishPayload = payload;
          return { data: { id: "sub-1" } };
        }),
        formLoading: mockFormLoading,
      },
      handleSubmit: (cb: (values: Record<string, unknown>) => unknown) => () =>
        cb({ ...mockValues }),
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
      setValue: (name: string, value: unknown) => {
        mockValues[name] = value;
      },
      formState: {
        errors: mockErrors,
        isSubmitting: mockIsSubmitting,
      },
    };
  },
}));

const mockApps: AppWithTeams[] = [
  {
    id: "app-1",
    name: "Slack",
    teams: [{ id: "team-1", name: "Engineering" }],
  },
  { id: "app-2", name: "Notion", teams: [] },
  { id: "app-3", name: "Jira", teams: [{ id: "team-2", name: "Design" }] },
];

const mockSubscription: SubscriptionDetail = {
  id: "sub-1",
  appId: "app-1",
  appName: "Slack",
  appLogoUrl: null,
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  billingType: "FLAT_RATE",
  amount: 10000,
  perSeatPrice: null,
  currency: "KRW",
  totalLicenses: 100,
  usedLicenses: 80,
  startDate: new Date("2024-01-01"),
  endDate: null,
  renewalDate: new Date("2024-02-01"),
  autoRenewal: true,
  renewalAlert30: true,
  renewalAlert60: false,
  renewalAlert90: false,
  contractUrl: null,
  notes: "테스트 메모",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  teamId: null,
  teamName: null,
  team: null,
  teams: [],
  assignedUsers: [],
};

describe("SubscriptionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues = {};
    mockErrors = {};
    mockIsSubmitting = false;
    mockFormLoading = false;
    capturedOnFinishPayload = null;
  });

  describe("신규 생성 모드", () => {
    it("빈 폼을 렌더링해야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(screen.getByText(/앱 선택/)).toBeInTheDocument();
      expect(screen.getByText("결제 주기 *")).toBeInTheDocument();
      expect(screen.getByLabelText(/금액/)).toBeInTheDocument();
      expect(screen.getByLabelText(/시작일/)).toBeInTheDocument();
    });

    it("구독 등록 버튼이 표시되어야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(
        screen.getByRole("button", { name: /구독 등록/i })
      ).toBeInTheDocument();
    });

    it("앱 선택 관련 UI가 존재해야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(screen.getByText("앱을 선택하세요")).toBeInTheDocument();
    });

    it("결제 주기 관련 UI가 존재해야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(screen.getByText("결제 주기 *")).toBeInTheDocument();
    });
  });

  describe("수정 모드", () => {
    it("기존 데이터로 폼을 채워야 한다", () => {
      render(
        <SubscriptionForm apps={mockApps} subscription={mockSubscription} />
      );

      expect(screen.getByDisplayValue("10000")).toBeInTheDocument();
      expect(screen.getByDisplayValue("테스트 메모")).toBeInTheDocument();
    });

    it("저장 버튼이 표시되어야 한다", () => {
      render(
        <SubscriptionForm apps={mockApps} subscription={mockSubscription} />
      );

      expect(screen.getByRole("button", { name: /저장/i })).toBeInTheDocument();
    });

    it("자동 갱신 체크박스가 선택되어 있어야 한다", () => {
      render(
        <SubscriptionForm apps={mockApps} subscription={mockSubscription} />
      );

      const autoRenewalCheckbox = screen.getByLabelText("자동 갱신");
      expect(autoRenewalCheckbox).toBeChecked();
    });

    it("갱신 알림 체크박스 상태가 올바르게 설정되어야 한다", () => {
      render(
        <SubscriptionForm apps={mockApps} subscription={mockSubscription} />
      );

      expect(screen.getByLabelText("30일 전 알림")).toBeChecked();
      expect(screen.getByLabelText("60일 전 알림")).not.toBeChecked();
      expect(screen.getByLabelText("90일 전 알림")).not.toBeChecked();
    });
  });

  describe("유효성 검사", () => {
    it("필수 필드 라벨이 표시되어야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(screen.getByText("앱 선택 *")).toBeInTheDocument();
      expect(screen.getByText("결제 주기 *")).toBeInTheDocument();
      expect(screen.getByText("금액 *")).toBeInTheDocument();
      expect(screen.getByText("시작일 *")).toBeInTheDocument();
    });
  });

  describe("취소 버튼", () => {
    it("취소 버튼이 존재해야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      const cancelButton = screen.getByRole("button", { name: /취소/i });
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe("레이아웃", () => {
    it("2컬럼 grid가 아닌 단일 컬럼이어야 한다", () => {
      const { container } = render(<SubscriptionForm apps={mockApps} />);

      const gridDiv = container.querySelector(
        ".lg\\:grid-cols-\\[1fr_400px\\]"
      );
      expect(gridDiv).not.toBeInTheDocument();
    });

    it("계약서 카드가 존재하지 않아야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(screen.queryByText("계약서")).not.toBeInTheDocument();
    });

    it("메모가 별도 카드로 하단에 표시되어야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(screen.getByText("메모")).toBeInTheDocument();
    });

    it("요금 서브컴포넌트가 렌더링되어야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(screen.getByTestId("form-pricing")).toBeInTheDocument();
    });

    it("상태 필드가 기본 정보 카드에 포함되어야 한다", () => {
      render(<SubscriptionForm apps={mockApps} />);

      expect(screen.getByText("상태")).toBeInTheDocument();
    });
  });

  describe("에러 메시지 표시", () => {
    it("notes 에러 메시지가 표시되어야 한다", () => {
      mockErrors = { notes: { message: "메모는 1000자 이하여야 합니다" } };
      render(<SubscriptionForm apps={mockApps} />);
      expect(
        screen.getByText("메모는 1000자 이하여야 합니다")
      ).toBeInTheDocument();
    });
  });

  describe("금액 전송 (amount는 string으로 서버에 전달)", () => {
    it("onSubmit 시 amount가 string으로 전달되어야 한다", async () => {
      // subscription.amount = 10000 → defaultValues.amount = "10000"
      render(
        <SubscriptionForm apps={mockApps} subscription={mockSubscription} />
      );

      const form = screen
        .getByRole("button", { name: /저장/i })
        .closest("form");
      expect(form).toBeInTheDocument();

      form?.dispatchEvent(new Event("submit", { bubbles: true }));

      expect(capturedOnFinishPayload).not.toBeNull();
      expect(typeof capturedOnFinishPayload!.amount).toBe("string");
      expect(capturedOnFinishPayload!.amount).toBe("10000");
    });

    it("PER_SEAT 구독도 perSeatPrice validation 없이 저장되어야 한다", async () => {
      const perSeatSub: SubscriptionDetail = {
        ...mockSubscription,
        billingType: "PER_SEAT",
        perSeatPrice: 1500,
      };
      render(<SubscriptionForm apps={mockApps} subscription={perSeatSub} />);

      const form = screen
        .getByRole("button", { name: /저장/i })
        .closest("form");
      form?.dispatchEvent(new Event("submit", { bubbles: true }));

      expect(capturedOnFinishPayload).not.toBeNull();
      // perSeatPrice is no longer part of the form schema
      expect(capturedOnFinishPayload!.perSeatPrice).toBeUndefined();
    });
  });

  describe("hideActions 모드", () => {
    it("hideActions=true 시 액션 버튼이 숨겨져야 한다", () => {
      render(
        <SubscriptionForm apps={mockApps} hideActions formId="test-form" />
      );

      expect(
        screen.queryByRole("button", { name: /구독 등록/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /취소/i })
      ).not.toBeInTheDocument();
    });

    it("formId가 form 요소에 설정되어야 한다", () => {
      const { container } = render(
        <SubscriptionForm apps={mockApps} hideActions formId="my-form" />
      );

      const form = container.querySelector("form#my-form");
      expect(form).toBeInTheDocument();
    });
  });
});
