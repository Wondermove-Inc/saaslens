# 08. Multi-Tenant 패턴 가이드

이 문서는 SaaS Management Platform의 멀티테넌트 아키텍처와 organizationId 기반 데이터 격리 패턴을 설명합니다.

## 목차

1. [핵심 개념](#1-핵심-개념)
2. [인증 헬퍼 함수](#2-인증-헬퍼-함수)
3. [Prisma 쿼리 패턴](#3-prisma-쿼리-패턴)
4. [역할 기반 접근 제어](#4-역할-기반-접근-제어)
5. [테스트 패턴](#5-테스트-패턴)
6. [체크리스트](#6-체크리스트)

---

## 1. 핵심 개념

### 1.1 멀티테넌시란?

하나의 애플리케이션 인스턴스가 여러 조직(테넌트)을 동시에 서비스하는 아키텍처입니다.

```
┌─────────────────────────────────────────────────┐
│                  Application                     │
├─────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Org A   │  │ Org B   │  │ Org C   │          │
│  │ (Data)  │  │ (Data)  │  │ (Data)  │          │
│  └─────────┘  └─────────┘  └─────────┘          │
├─────────────────────────────────────────────────┤
│              Shared Database                     │
└─────────────────────────────────────────────────┘
```

### 1.2 organizationId

- **정의**: 모든 데이터를 조직 단위로 격리하는 핵심 식별자
- **위치**: 모든 엔티티 테이블에 `organizationId` 컬럼 존재
- **검증**: 모든 쿼리에서 organizationId 필터 필수

```typescript
// 올바른 예시
const apps = await prisma.app.findMany({
  where: { organizationId }, // ✅ organizationId 포함
});

// 잘못된 예시 - 데이터 누출 위험!
const apps = await prisma.app.findMany({
  where: { id: appId }, // ❌ organizationId 누락
});
```

---

## 2. 인증 헬퍼 함수

### 2.1 requireOrganization()

가장 많이 사용하는 헬퍼. 인증된 사용자 + 조직 필수.

**파일**: `src/lib/auth/require-auth.ts`

```typescript
import { requireOrganization } from "@/lib/auth/require-auth";

export async function getApps() {
  const { organizationId, userId, role, session } = await requireOrganization();

  // organizationId가 보장된 상태로 쿼리 수행
  const apps = await prisma.app.findMany({
    where: { organizationId },
  });

  return apps;
}
```

**반환 값**:
| 필드 | 타입 | 설명 |
|------|------|------|
| `session` | `Session` | NextAuth 세션 객체 |
| `organizationId` | `string` | 현재 사용자의 조직 ID |
| `userId` | `string` | 현재 사용자 ID |
| `role` | `"ADMIN" \| "MEMBER" \| "VIEWER"` | 사용자 역할 |

**자동 리다이렉트**:

- 세션 없음 → `/login`
- 조직 없음 → `/onboarding`

### 2.2 requireAuth()

조직 없이 인증만 필요한 경우 사용.

```typescript
import { requireAuth } from "@/lib/auth/require-auth";

// 온보딩 완료 전 API에서 사용
export async function createOrganization() {
  const session = await requireAuth();
  // session.user 접근 가능
}
```

### 2.3 getCachedSession()

동일 요청 내 여러 번 세션 조회 시 캐싱.

```typescript
import { getCachedSession } from "@/lib/auth/require-auth";

// React의 cache()로 래핑되어 동일 요청 내 중복 호출 방지
const session = await getCachedSession();
```

---

## 3. Prisma 쿼리 패턴

### 3.1 기본 조회 패턴

```typescript
// ✅ 올바른 패턴
export async function getApps() {
  const { organizationId } = await requireOrganization();

  return prisma.app.findMany({
    where: { organizationId }, // 항상 organizationId 포함
  });
}
```

### 3.2 단일 레코드 조회

```typescript
export async function getApp(id: string) {
  const { organizationId } = await requireOrganization();

  // findFirst로 organizationId 함께 검증
  const app = await prisma.app.findFirst({
    where: {
      id,
      organizationId, // ✅ 다른 조직 데이터 접근 방지
    },
  });

  if (!app) {
    throw new Error("앱을 찾을 수 없습니다");
  }

  return app;
}
```

### 3.3 생성 시 패턴

```typescript
export async function createApp(formData: FormData) {
  const { organizationId, userId } = await requireOrganization();

  const app = await prisma.app.create({
    data: {
      name: formData.get("name") as string,
      organizationId, // ✅ 필수: 소속 조직 지정
    },
  });

  // 감사 로그도 organizationId 포함
  await prisma.auditLog.create({
    data: {
      action: "CREATE_APP",
      entityType: "App",
      entityId: app.id,
      userId,
      organizationId,
    },
  });

  return app;
}
```

### 3.4 수정/삭제 시 패턴

```typescript
export async function updateApp(id: string, data: UpdateAppData) {
  const { organizationId, userId } = await requireOrganization();

  // 1. 먼저 해당 조직의 데이터인지 확인
  const existing = await prisma.app.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error("앱을 찾을 수 없습니다");
  }

  // 2. 업데이트 수행
  return prisma.app.update({
    where: { id },
    data,
  });
}
```

### 3.5 관계 데이터 검증

```typescript
export async function assignOwner(appId: string, ownerId: string) {
  const { organizationId } = await requireOrganization();

  // 소유자가 같은 조직에 속하는지 검증
  const owner = await prisma.user.findFirst({
    where: {
      id: ownerId,
      organizationId, // ✅ 같은 조직 사용자만 허용
    },
  });

  if (!owner) {
    throw new Error("지정된 소유자가 조직에 속하지 않습니다");
  }

  return prisma.app.update({
    where: { id: appId },
    data: { ownerId },
  });
}
```

---

## 4. 역할 기반 접근 제어

### 4.1 역할 정의

| 역할     | 권한                                    |
| -------- | --------------------------------------- |
| `ADMIN`  | 모든 작업 (생성, 수정, 삭제, 설정 변경) |
| `MEMBER` | 조회, 생성, 수정                        |
| `VIEWER` | 조회만 가능                             |

### 4.2 역할 검사 패턴

```typescript
export async function deleteApp(id: string) {
  const { organizationId, role } = await requireOrganization();

  // ADMIN만 삭제 가능
  if (role !== "ADMIN") {
    throw new Error("삭제 권한이 없습니다");
  }

  return prisma.app.delete({
    where: { id },
  });
}
```

### 4.3 UI에서 역할 기반 렌더링

```tsx
"use client";

import { useSession } from "next-auth/react";

export function AppActions({ appId }: { appId: string }) {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <div>
      <Button variant="outline">보기</Button>

      {role !== "VIEWER" && <Button variant="outline">수정</Button>}

      {role === "ADMIN" && <Button variant="destructive">삭제</Button>}
    </div>
  );
}
```

---

## 5. 테스트 패턴

### 5.1 세션 모킹

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { getApps } from "./apps";

// 모듈 모킹
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    app: {
      findMany: vi.fn(),
    },
  },
}));

import { requireOrganization } from "@/lib/auth/require-auth";

describe("getApps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return apps for the current organization", async () => {
    // Arrange: 세션 모킹
    vi.mocked(requireOrganization).mockResolvedValue({
      session: {} as any,
      organizationId: "org-123",
      userId: "user-456",
      role: "ADMIN",
    });

    const mockApps = [{ id: "app-1", name: "Test App" }];
    vi.mocked(prisma.app.findMany).mockResolvedValue(mockApps);

    // Act
    const result = await getApps();

    // Assert
    expect(prisma.app.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-123" },
    });
    expect(result).toEqual(mockApps);
  });
});
```

### 5.2 다른 조직 접근 테스트

```typescript
it("should not return apps from other organizations", async () => {
  // 조직 A로 로그인
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-A",
    // ...
  });

  // 조직 B의 앱 조회 시도
  const result = await getApp("app-from-org-B");

  // 조직 검증으로 인해 null 반환 또는 에러
  expect(result).toBeNull();
});
```

### 5.3 역할 테스트

```typescript
it("should throw error when VIEWER tries to delete", async () => {
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-123",
    role: "VIEWER", // Viewer 역할
    // ...
  });

  await expect(deleteApp("app-1")).rejects.toThrow("삭제 권한이 없습니다");
});

it("should allow ADMIN to delete", async () => {
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-123",
    role: "ADMIN", // Admin 역할
    // ...
  });

  await deleteApp("app-1");

  expect(prisma.app.delete).toHaveBeenCalled();
});
```

---

## 6. 체크리스트

### 코드 리뷰 시 확인 사항

- [ ] 모든 Prisma 쿼리에 `organizationId` 조건 포함
- [ ] `requireOrganization()` 또는 `requireAuth()` 호출
- [ ] 관계 데이터(ownerId 등) 같은 조직 소속 검증
- [ ] 역할 기반 권한 검사 (삭제, 설정 변경 등)
- [ ] 감사 로그에 `organizationId` 포함
- [ ] 테스트에서 다양한 organizationId로 격리 검증

### 안티 패턴 (절대 금지)

```typescript
// ❌ organizationId 없이 전체 조회
const allApps = await prisma.app.findMany();

// ❌ id만으로 조회 (다른 조직 데이터 접근 가능)
const app = await prisma.app.findUnique({ where: { id } });

// ❌ 조직 검증 없이 관계 설정
await prisma.app.update({
  where: { id },
  data: { ownerId: anyUserId }, // 다른 조직 사용자일 수 있음
});
```

---

## 관련 문서

- [02-development-principles.md](./02-development-principles.md) - 개발 원칙
- [09-error-handling-strategy.md](./09-error-handling-strategy.md) - 에러 처리 전략
- [11-audit-logging.md](./11-audit-logging.md) - 감사 로깅
