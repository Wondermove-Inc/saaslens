# TDD Quick Start Guide (TDD 빠른 시작)

> **목표**: 5분 안에 첫 테스트 작성하기

---

## 1. 설치 확인

```bash
# 의존성 설치 (package.json에 이미 설정됨)
npm install
```

---

## 2. 테스트 실행 명령어

```bash
# 테스트 한 번 실행
npm test

# 파일 변경 시 자동 재실행 (개발 중 권장)
npm run test:watch

# 커버리지 리포트 생성
npm run test:coverage

# Vitest UI (시각적 테스트 결과)
npm run test:ui

# 품질 검사 전체 실행 (lint + type-check + test)
npm run quality
```

---

## 3. 첫 테스트 작성하기

### 3.1 테스트 파일 위치 규칙

**Co-located Pattern**: 소스 파일 옆에 `.test.ts` 파일 생성

```
src/lib/utils.ts           # 소스 파일
src/lib/utils.test.ts      # 테스트 파일 (바로 옆에)
```

### 3.2 예제: 유틸리티 함수 테스트

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (className 병합 유틸리티)", () => {
  it("should merge class names", () => {
    // Arrange & Act
    const result = cn("px-2", "py-1");

    // Assert
    expect(result).toBe("px-2 py-1");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");

    expect(result).toBe("base active");
  });

  it("should override conflicting Tailwind classes", () => {
    // 나중에 오는 클래스가 우선
    const result = cn("px-2", "px-4");

    expect(result).toBe("px-4");
  });
});
```

---

## 4. TDD Red-Green-Refactor 사이클

### 4.1 RED (실패하는 테스트 먼저 작성)

```typescript
// src/lib/services/app.test.ts
import { describe, it, expect } from "vitest";
import { calculateAppUsageScore } from "./app";

describe("calculateAppUsageScore", () => {
  it("should return high score for frequently used apps", () => {
    // 아직 함수가 존재하지 않음 - 테스트 실패!
    const score = calculateAppUsageScore({
      loginCount: 100,
      lastLoginDaysAgo: 1,
    });

    expect(score).toBeGreaterThan(80);
  });
});
```

```bash
npm test  # 실패 (RED)
```

### 4.2 GREEN (최소한의 코드로 통과)

```typescript
// src/lib/services/app.ts
export function calculateAppUsageScore({
  loginCount,
  lastLoginDaysAgo,
}: {
  loginCount: number;
  lastLoginDaysAgo: number;
}): number {
  // 최소한의 구현
  if (loginCount > 50 && lastLoginDaysAgo <= 7) {
    return 85;
  }
  return 50;
}
```

```bash
npm test  # 통과 (GREEN)
```

### 4.3 REFACTOR (코드 개선, 테스트 유지)

```typescript
// src/lib/services/app.ts
const SCORE_WEIGHTS = {
  LOGIN_FREQUENCY: 0.6,
  RECENCY: 0.4,
};

export function calculateAppUsageScore({
  loginCount,
  lastLoginDaysAgo,
}: {
  loginCount: number;
  lastLoginDaysAgo: number;
}): number {
  const frequencyScore = Math.min(loginCount / 100, 1) * 100;
  const recencyScore = Math.max(0, 100 - lastLoginDaysAgo * 3);

  return Math.round(
    frequencyScore * SCORE_WEIGHTS.LOGIN_FREQUENCY +
      recencyScore * SCORE_WEIGHTS.RECENCY
  );
}
```

```bash
npm test  # 여전히 통과 (REFACTOR 완료)
```

---

## 5. 일일 개발 워크플로우

```bash
# 1. 작업 시작 시 watch 모드 실행
npm run test:watch

# 2. 새 기능 개발 전 테스트 먼저 작성
# 3. 테스트 실패 확인 (RED)
# 4. 구현 코드 작성
# 5. 테스트 통과 확인 (GREEN)
# 6. 리팩토링 (REFACTOR)

# 7. 커밋 전 품질 검사
npm run quality

# 8. 커밋 (pre-commit hook이 자동으로 lint-staged 실행)
git add .
git commit -m "feat: add app usage score calculation"
```

---

## 6. 디렉토리별 테스트 파일 구조

```
src/
├── actions/
│   ├── apps.ts
│   └── apps.test.ts           # Server Actions 테스트
├── lib/
│   ├── utils.ts
│   ├── utils.test.ts          # 유틸리티 테스트
│   └── services/
│       ├── subscription/
│       │   ├── renewal.ts
│       │   └── renewal.test.ts # 서비스 테스트
│       └── sso/
│           ├── google.ts
│           └── google.test.ts
├── hooks/
│   ├── use-apps.ts
│   └── use-apps.test.ts       # Hook 테스트
├── components/
│   └── dashboard/
│       ├── stats-card.tsx
│       └── stats-card.test.tsx # 컴포넌트 테스트
└── stores/
    ├── app-store.ts
    └── app-store.test.ts      # Zustand 스토어 테스트
```

---

## 7. 자주 사용하는 테스트 패턴

### 7.1 비동기 함수 테스트

```typescript
it("should fetch apps from API", async () => {
  const apps = await fetchApps("org-1");
  expect(apps).toHaveLength(3);
});
```

### 7.2 에러 케이스 테스트

```typescript
it("should throw error for invalid input", () => {
  expect(() => validateAppData({ name: "" })).toThrow("Name is required");
});

// 비동기 에러
it("should reject for unauthorized access", async () => {
  await expect(fetchProtectedData()).rejects.toThrow("Unauthorized");
});
```

### 7.3 모킹 기본

```typescript
import { vi } from "vitest";

// 함수 모킹
const mockFn = vi.fn();
mockFn.mockReturnValue("mocked value");

// 모듈 모킹
vi.mock("@/lib/db", () => ({
  prisma: {
    app: {
      findMany: vi.fn(),
    },
  },
}));
```

---

## 8. Multi-Tenant 테스트 패턴

멀티테넌트 환경에서는 `organizationId`를 포함한 세션 모킹이 필수입니다.

```typescript
// requireOrganization 모킹
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

import { requireOrganization } from "@/lib/auth/require-auth";

it("should filter by organizationId", async () => {
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-123",
    userId: "user-456",
    role: "ADMIN",
    session: {} as any,
  });

  // organizationId 포함 쿼리 검증
  expect(prisma.app.findMany).toHaveBeenCalledWith({
    where: { organizationId: "org-123" },
  });
});
```

자세한 내용은 [08-multi-tenant-patterns.md](./08-multi-tenant-patterns.md) 참조.

---

## 9. 다음 단계

- [02-development-principles.md](./02-development-principles.md) - 개발 원칙
- [03-shadcn-ui-rules.md](./03-shadcn-ui-rules.md) - shadcn/ui 컴포넌트 규칙
- [04-test-templates.md](./04-test-templates.md) - 복사해서 사용하는 테스트 템플릿
- [08-multi-tenant-patterns.md](./08-multi-tenant-patterns.md) - Multi-tenant 테스트 패턴
- [09-error-handling-strategy.md](./09-error-handling-strategy.md) - 에러 처리 전략
