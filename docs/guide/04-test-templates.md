# Test Templates (테스트 템플릿)

> **복사해서 사용하는 테스트 코드 템플릿**

---

## 1. Server Actions 테스트

### 1.1 기본 템플릿

```typescript
// src/actions/apps.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, updateApp, deleteApp } from "./apps";

// Prisma 모킹
vi.mock("@/lib/db", () => ({
  prisma: {
    app: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// revalidatePath 모킹
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// 인증 모킹
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    })
  ),
}));

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

describe("createApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when valid input", () => {
    it("should create app and return success", async () => {
      // Arrange
      const formData = new FormData();
      formData.set("name", "Slack");
      formData.set("category", "Communication");

      vi.mocked(prisma.app.create).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        category: "Communication",
        organizationId: "org-1",
        status: "ACTIVE",
        source: "MANUAL",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await createApp(formData);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.app.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Slack",
          organizationId: "org-1",
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith("/apps");
    });
  });

  describe("when invalid input", () => {
    it("should return validation errors for empty name", async () => {
      // Arrange
      const formData = new FormData();
      formData.set("name", "");

      // Act
      const result = await createApp(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors?.name).toBeDefined();
      expect(prisma.app.create).not.toHaveBeenCalled();
    });
  });

  describe("when database error", () => {
    it("should return error ActionState", async () => {
      // Arrange
      const formData = new FormData();
      formData.set("name", "Slack");

      vi.mocked(prisma.app.create).mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act
      const result = await createApp(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Database");
    });
  });
});
```

---

## 2. React 컴포넌트 테스트

### 2.1 기본 컴포넌트 템플릿

```typescript
// src/components/dashboard/app-card.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppCard } from './app-card';

// userEvent 인스턴스 생성
const user = userEvent.setup();

describe('AppCard', () => {
  // 테스트 데이터 팩토리
  const createMockApp = (overrides = {}) => ({
    id: '1',
    name: 'Slack',
    status: 'ACTIVE' as const,
    category: 'Communication',
    logoUrl: null,
    ...overrides,
  });

  // 렌더 헬퍼
  const renderAppCard = (props = {}) => {
    const defaultProps = {
      app: createMockApp(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };
    return render(<AppCard {...defaultProps} {...props} />);
  };

  describe('rendering', () => {
    it('should display app name and category', () => {
      renderAppCard();

      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Communication')).toBeInTheDocument();
    });

    it('should show status badge', () => {
      renderAppCard({ app: createMockApp({ status: 'INACTIVE' }) });

      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });

    it('should render fallback avatar when no logo', () => {
      renderAppCard({ app: createMockApp({ logoUrl: null }) });

      expect(screen.getByText('SL')).toBeInTheDocument(); // Slack 이니셜
    });
  });

  describe('interactions', () => {
    it('should call onEdit when edit button clicked', async () => {
      const onEdit = vi.fn();
      renderAppCard({ onEdit });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      expect(onEdit).toHaveBeenCalledWith('1');
    });

    it('should call onDelete when delete confirmed', async () => {
      const onDelete = vi.fn();
      renderAppCard({ onDelete });

      // 삭제 버튼 클릭
      await user.click(screen.getByRole('button', { name: /delete/i }));

      // 확인 다이얼로그에서 확인 클릭
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(onDelete).toHaveBeenCalledWith('1');
    });
  });
});
```

### 2.2 Form 컴포넌트 템플릿

```typescript
// src/components/forms/app-form.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppForm } from './app-form';

const user = userEvent.setup();

describe('AppForm', () => {
  const mockOnSubmit = vi.fn();

  const renderForm = (props = {}) => {
    return render(<AppForm onSubmit={mockOnSubmit} {...props} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('should show error for empty name', async () => {
      renderForm();

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for name too short', async () => {
      renderForm();

      await user.type(screen.getByLabelText(/name/i), 'Ab');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/at least 3 characters/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('submission', () => {
    it('should submit valid form data', async () => {
      renderForm();

      await user.type(screen.getByLabelText(/name/i), 'Slack');

      // Select 컴포넌트 선택
      await user.click(screen.getByRole('combobox', { name: /category/i }));
      await user.click(screen.getByRole('option', { name: /communication/i }));

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Slack',
          category: 'Communication',
        });
      });
    });

    it('should disable submit button while submitting', async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderForm();

      await user.type(screen.getByLabelText(/name/i), 'Slack');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    });
  });
});
```

---

## 3. Custom Hook 테스트

### 3.1 기본 템플릿

```typescript
// src/hooks/use-apps.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useApps } from "./use-apps";

// fetch 모킹
global.fetch = vi.fn();

describe("useApps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApps = [
    { id: "1", name: "Slack", status: "ACTIVE" },
    { id: "2", name: "Notion", status: "ACTIVE" },
  ];

  it("should fetch apps on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockApps }),
    } as Response);

    const { result } = renderHook(() => useApps("org-1"));

    // 초기 로딩 상태
    expect(result.current.isLoading).toBe(true);

    // 로딩 완료 대기
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps).toEqual(mockApps);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useApps("org-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.apps).toEqual([]);
  });

  it("should refetch when refetch called", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: mockApps }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [...mockApps, { id: "3", name: "GitHub" }],
          }),
      } as Response);

    const { result } = renderHook(() => useApps("org-1"));

    await waitFor(() => expect(result.current.apps).toHaveLength(2));

    // refetch 호출
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.apps).toHaveLength(3));
  });
});
```

---

## 4. Service/Business Logic 테스트

### 4.1 기본 템플릿

```typescript
// src/lib/services/subscription/renewal.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateRenewalAlerts,
  sendRenewalReminder,
  getUpcomingRenewals,
} from "./renewal";

// 의존성 모킹
vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: { findMany: vi.fn() },
    renewalAlert: { create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/services/notification", () => ({
  sendEmail: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/services/notification";

describe("Renewal Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 날짜 고정
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getUpcomingRenewals", () => {
    it("should return subscriptions due in 30 days", async () => {
      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          renewalDate: new Date("2024-02-14"), // 30일 후
          app: { name: "Slack", organization: { name: "Acme" } },
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions
      );

      const result = await getUpcomingRenewals("org-1", 30);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("sub-1");
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          renewalDate: expect.any(Object),
        },
        include: expect.any(Object),
      });
    });

    it("should return empty array when no renewals upcoming", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getUpcomingRenewals("org-1", 30);

      expect(result).toEqual([]);
    });
  });

  describe("sendRenewalReminder", () => {
    it("should send email notification", async () => {
      vi.mocked(sendEmail).mockResolvedValue({ success: true });

      await sendRenewalReminder({
        subscriptionId: "sub-1",
        email: "admin@example.com",
        appName: "Slack",
        daysUntilRenewal: 30,
      });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "admin@example.com",
          subject: expect.stringContaining("Slack"),
        })
      );
    });

    it("should throw error when email fails", async () => {
      vi.mocked(sendEmail).mockRejectedValue(new Error("SMTP error"));

      await expect(
        sendRenewalReminder({
          subscriptionId: "sub-1",
          email: "admin@example.com",
          appName: "Slack",
          daysUntilRenewal: 30,
        })
      ).rejects.toThrow("SMTP error");
    });
  });
});
```

---

## 5. Zod Schema 테스트

### 5.1 기본 템플릿

```typescript
// src/lib/validation/app.test.ts
import { describe, it, expect } from "vitest";
import { appSchema, subscriptionSchema } from "./app";

describe("appSchema", () => {
  describe("valid data", () => {
    it("should parse valid app data", () => {
      const validData = {
        name: "Slack",
        category: "Communication",
        url: "https://slack.com",
      };

      const result = appSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Slack");
      }
    });
  });

  describe("invalid data", () => {
    it("should reject empty name", () => {
      const invalidData = {
        name: "",
        category: "Communication",
      };

      const result = appSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("name");
      }
    });

    it("should reject name shorter than 2 characters", () => {
      const invalidData = {
        name: "A",
        category: "Communication",
      };

      const result = appSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject invalid URL format", () => {
      const invalidData = {
        name: "Slack",
        category: "Communication",
        url: "not-a-valid-url",
      };

      const result = appSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("url");
      }
    });
  });
});

describe("subscriptionSchema", () => {
  it("should validate cost as positive number", () => {
    const validData = {
      appId: "app-1",
      cost: 29.99,
      billingCycle: "MONTHLY",
    };

    const result = subscriptionSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it("should reject negative cost", () => {
    const invalidData = {
      appId: "app-1",
      cost: -10,
      billingCycle: "MONTHLY",
    };

    const result = subscriptionSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });
});
```

---

## 6. Zustand Store 테스트

### 6.1 기본 템플릿

```typescript
// src/stores/app-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useAppStore } from "./app-store";

describe("useAppStore", () => {
  beforeEach(() => {
    // 스토어 리셋
    act(() => {
      useAppStore.setState({
        apps: [],
        selectedAppId: null,
        isLoading: false,
      });
    });
  });

  describe("setApps", () => {
    it("should update apps list", () => {
      const mockApps = [
        { id: "1", name: "Slack" },
        { id: "2", name: "Notion" },
      ];

      act(() => {
        useAppStore.getState().setApps(mockApps);
      });

      expect(useAppStore.getState().apps).toEqual(mockApps);
    });
  });

  describe("selectApp", () => {
    it("should set selected app id", () => {
      act(() => {
        useAppStore.getState().selectApp("app-1");
      });

      expect(useAppStore.getState().selectedAppId).toBe("app-1");
    });

    it("should clear selection when null passed", () => {
      act(() => {
        useAppStore.getState().selectApp("app-1");
        useAppStore.getState().selectApp(null);
      });

      expect(useAppStore.getState().selectedAppId).toBeNull();
    });
  });

  describe("addApp", () => {
    it("should add new app to list", () => {
      const newApp = { id: "1", name: "Slack" };

      act(() => {
        useAppStore.getState().addApp(newApp);
      });

      expect(useAppStore.getState().apps).toContainEqual(newApp);
    });
  });

  describe("removeApp", () => {
    it("should remove app from list", () => {
      const mockApps = [
        { id: "1", name: "Slack" },
        { id: "2", name: "Notion" },
      ];

      act(() => {
        useAppStore.getState().setApps(mockApps);
        useAppStore.getState().removeApp("1");
      });

      expect(useAppStore.getState().apps).toHaveLength(1);
      expect(useAppStore.getState().apps[0].id).toBe("2");
    });
  });
});
```

---

## 7. 테스트 파일 시작 템플릿

### 7.1 최소 템플릿

```typescript
// src/[path]/[name].test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { functionName } from "./[name]";

describe("[functionName]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should [expected behavior] when [condition]", () => {
    // Arrange
    const input = {};

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

---

## 8. FormData Server Action 테스트

Server Actions에서 FormData를 사용하는 경우의 테스트 패턴입니다.

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "./apps";

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

import { requireOrganization } from "@/lib/auth/require-auth";

describe("createApp with FormData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganization).mockResolvedValue({
      organizationId: "org-123",
      userId: "user-456",
      role: "ADMIN",
      session: {} as any,
    });
  });

  it("should create app from FormData", async () => {
    const formData = new FormData();
    formData.set("name", "Test App");
    formData.set("category", "Productivity");

    const result = await createApp({ success: false }, formData);

    expect(result.success).toBe(true);
  });

  it("should return validation errors for empty name", async () => {
    const formData = new FormData();
    formData.set("name", "");

    const result = await createApp({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.name).toBeDefined();
  });
});
```

자세한 내용은 [10-form-data-patterns.md](./10-form-data-patterns.md) 참조.

---

## 9. 다음 단계

- [05-common-patterns.md](./05-common-patterns.md) - 공통 테스트 패턴
- [06-coverage-checklist.md](./06-coverage-checklist.md) - 커버리지 체크리스트
- [08-multi-tenant-patterns.md](./08-multi-tenant-patterns.md) - Multi-tenant 테스트 패턴
- [11-audit-logging.md](./11-audit-logging.md) - 감사 로그 테스트 패턴
