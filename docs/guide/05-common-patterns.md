# Common Test Patterns (공통 테스트 패턴)

> **자주 사용하는 모킹 및 테스트 패턴**

---

## 1. Prisma 클라이언트 모킹

### 1.1 기본 모킹

```typescript
// 테스트 파일 상단에 추가
vi.mock("@/lib/db", () => ({
  prisma: {
    app: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

import { prisma } from "@/lib/db";

// 테스트에서 사용
it("should create app", async () => {
  vi.mocked(prisma.app.create).mockResolvedValue({
    id: "app-1",
    name: "Slack",
    organizationId: "org-1",
  });

  // ... 테스트 로직
});
```

### 1.2 전역 Prisma Mock 파일

```typescript
// src/__mocks__/prisma.ts
import { vi } from "vitest";

export const prismaMock = {
  app: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(prismaMock)),
};

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

export { prismaMock as prisma };
```

### 1.3 관계 데이터 포함 모킹

```typescript
it("should return app with subscriptions", async () => {
  vi.mocked(prisma.app.findUnique).mockResolvedValue({
    id: "app-1",
    name: "Slack",
    organizationId: "org-1",
    // include 관계 데이터
    subscriptions: [
      {
        id: "sub-1",
        cost: 1000,
        billingCycle: "MONTHLY",
      },
    ],
    _count: {
      users: 10,
    },
  });
});
```

---

## 2. NextAuth 세션 모킹

### 2.1 인증된 사용자

```typescript
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "ADMIN",
        organizationId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
  ),
}));
```

### 2.2 미인증 사용자

```typescript
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));
```

### 2.3 동적 세션 변경

```typescript
import { auth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("with different auth states", () => {
  it("should handle admin user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "1", role: "ADMIN", organizationId: "org-1" },
    });
    // ... 테스트
  });

  it("should handle member user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "2", role: "MEMBER", organizationId: "org-1" },
    });
    // ... 테스트
  });

  it("should handle unauthorized", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    // ... 테스트
  });
});
```

---

## 3. React Hook Form 테스트

### 3.1 Form Provider 래퍼

```typescript
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// 테스트용 래퍼 컴포넌트
function FormWrapper({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: Record<string, unknown>;
}) {
  const methods = useForm({
    defaultValues,
    resolver: zodResolver(schema),
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

// 테스트에서 사용
render(
  <FormWrapper defaultValues={{ name: '', email: '' }}>
    <FormField />
  </FormWrapper>
);
```

### 3.2 Form Submit 테스트

```typescript
it('should submit form with valid data', async () => {
  const onSubmit = vi.fn();
  render(<MyForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'John');
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(
      { name: 'John', email: 'john@example.com' },
      expect.anything() // form event
    );
  });
});
```

---

## 4. Server Components 테스트

### 4.1 비동기 Server Component

```typescript
// src/app/(dashboard)/apps/page.tsx 테스트
import { render, screen } from "@testing-library/react";

describe("AppsPage (Server Component)", () => {
  it("should render apps from database", async () => {
    // 데이터 페칭 모킹
    vi.mocked(prisma.app.findMany).mockResolvedValue([
      { id: "1", name: "Slack", status: "ACTIVE" },
      { id: "2", name: "Notion", status: "ACTIVE" },
    ]);

    // Server Component 렌더링
    const jsx = await AppsPage();
    render(jsx);

    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
  });

  it("should show empty state when no apps", async () => {
    vi.mocked(prisma.app.findMany).mockResolvedValue([]);

    const jsx = await AppsPage();
    render(jsx);

    expect(screen.getByText(/no apps found/i)).toBeInTheDocument();
  });
});
```

---

## 5. 로딩/에러 상태 테스트

### 5.1 로딩 상태

```typescript
it('should show skeleton while loading', async () => {
  // 지연된 응답
  vi.mocked(fetch).mockImplementation(
    () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ items: [] }),
            } as Response),
          100
        )
      )
  );

  render(<AppList />);

  // 로딩 상태 확인
  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

  // 로딩 완료 후
  await waitFor(() => {
    expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
  });
});
```

### 5.2 에러 상태

```typescript
it('should show error message on fetch failure', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

  render(<AppList />);

  await waitFor(() => {
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});

it('should show retry button on error', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

  render(<AppList />);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
```

---

## 6. 테스트 데이터 팩토리

### 6.1 팩토리 패턴

```typescript
// src/test-utils/factories.ts

// User 팩토리
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: "test@example.com",
  name: "Test User",
  role: "MEMBER",
  status: "ACTIVE",
  organizationId: "org-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// App 팩토리
export const createMockApp = (overrides: Partial<App> = {}): App => ({
  id: `app-${Math.random().toString(36).substr(2, 9)}`,
  name: "Test App",
  status: "ACTIVE",
  source: "MANUAL",
  category: "Productivity",
  organizationId: "org-1",
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  discoveredAt: new Date(),
  ...overrides,
});

// Subscription 팩토리
export const createMockSubscription = (
  overrides: Partial<Subscription> = {}
): Subscription => ({
  id: `sub-${Math.random().toString(36).substr(2, 9)}`,
  appId: "app-1",
  organizationId: "org-1",
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  cost: 10000,
  currency: "KRW",
  startDate: new Date(),
  renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// 리스트 팩토리
export const createMockApps = (count: number): App[] =>
  Array.from({ length: count }, (_, i) =>
    createMockApp({ id: `app-${i}`, name: `App ${i}` })
  );
```

### 6.2 팩토리 사용

```typescript
import { createMockApp, createMockApps } from "@/test-utils/factories";

describe("AppList", () => {
  it("should render list of apps", () => {
    const apps = createMockApps(5);
    vi.mocked(prisma.app.findMany).mockResolvedValue(apps);
    // ...
  });

  it("should handle app with specific status", () => {
    const inactiveApp = createMockApp({ status: "INACTIVE" });
    // ...
  });
});
```

---

## 7. Custom Render 함수

### 7.1 Provider 래퍼

```typescript
// src/test-utils/render.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark';
}

function AllProviders({
  children,
  theme = 'light',
}: {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme={theme} forcedTheme={theme}>
      {children}
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { theme, ...options }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders theme={theme}>{children}</AllProviders>
    ),
    ...options,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
```

### 7.2 사용

```typescript
import { render, screen } from '@/test-utils/render';

it('should render in dark mode', () => {
  render(<ThemeToggle />, { theme: 'dark' });
  // ...
});
```

---

## 8. 날짜/시간 모킹

### 8.1 고정 날짜

```typescript
describe("Renewal calculations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T09:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should calculate days until renewal", () => {
    const renewalDate = new Date("2024-02-14");
    const result = calculateDaysUntilRenewal(renewalDate);
    expect(result).toBe(30);
  });
});
```

### 8.2 시간 진행

```typescript
it('should update after timeout', async () => {
  vi.useFakeTimers();

  render(<AutoRefreshComponent interval={5000} />);

  // 5초 진행
  await vi.advanceTimersByTimeAsync(5000);

  expect(fetchMock).toHaveBeenCalledTimes(2); // 초기 + 1회

  vi.useRealTimers();
});
```

---

## 9. Error Boundary 테스트

### 9.1 에러 발생 테스트

```typescript
// console.error 억제
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleSpy.mockRestore();
});

it('should render fallback on error', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

---

## 10. API 응답 모킹

### 10.1 fetch 모킹

```typescript
// 성공 응답
vi.mocked(global.fetch).mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data: "success" }),
} as Response);

// 실패 응답
vi.mocked(global.fetch).mockResolvedValue({
  ok: false,
  status: 404,
  json: () => Promise.resolve({ error: "Not found" }),
} as Response);

// 네트워크 에러
vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));
```

### 10.2 순차적 응답

```typescript
vi.mocked(fetch)
  .mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ page: 1 }),
  } as Response)
  .mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ page: 2 }),
  } as Response);
```

---

## 11. requireOrganization 모킹

Multi-tenant 인증 헬퍼 모킹 패턴입니다.

```typescript
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

import { requireOrganization } from "@/lib/auth/require-auth";

describe("Multi-tenant actions", () => {
  beforeEach(() => {
    vi.mocked(requireOrganization).mockResolvedValue({
      organizationId: "org-123",
      userId: "user-456",
      role: "ADMIN",
      session: {} as any,
    });
  });

  it("should query with organizationId", async () => {
    await getApps();

    expect(prisma.app.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-123",
      }),
    });
  });
});
```

---

## 12. Audit 로그 테스트

감사 로그 생성 검증 패턴입니다.

```typescript
it("should create audit log on create", async () => {
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-123",
    userId: "user-456",
    role: "ADMIN",
    session: {} as any,
  });

  const formData = new FormData();
  formData.set("name", "Test App");

  await createApp({ success: false }, formData);

  expect(prisma.auditLog.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      action: "CREATE_APP",
      entityType: "App",
      organizationId: "org-123",
      userId: "user-456",
    }),
  });
});
```

자세한 내용은 [11-audit-logging.md](./11-audit-logging.md) 참조.

---

## 13. 다음 단계

- [06-coverage-checklist.md](./06-coverage-checklist.md) - 커버리지 체크리스트
- [08-multi-tenant-patterns.md](./08-multi-tenant-patterns.md) - Multi-tenant 패턴
- [09-error-handling-strategy.md](./09-error-handling-strategy.md) - 에러 처리 전략
- [10-form-data-patterns.md](./10-form-data-patterns.md) - FormData 패턴
