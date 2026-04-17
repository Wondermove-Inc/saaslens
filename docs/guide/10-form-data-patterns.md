# 10. FormData 패턴 가이드

이 문서는 Server Actions에서 FormData를 파싱하고 Zod로 유효성 검사하는 패턴을 설명합니다.

## 목차

1. [Server Action 시그니처](#1-server-action-시그니처)
2. [FormData 파싱](#2-formdata-파싱)
3. [Zod 유효성 검사](#3-zod-유효성-검사)
4. [API Route에서 JSON → FormData](#4-api-route에서-json--formdata)
5. [클라이언트 통합](#5-클라이언트-통합)
6. [테스트 패턴](#6-테스트-패턴)

---

## 1. Server Action 시그니처

### 1.1 기본 시그니처 (useActionState용)

```typescript
"use server";

import type { ActionState } from "@/types";

export async function createApp(
  _prevState: ActionState<{ id: string }>, // 이전 상태 (useActionState에서 필요)
  formData: FormData // 폼 데이터
): Promise<ActionState<{ id: string }>> {
  // 반환 타입
  // ...
}
```

### 1.2 ID 파라미터 포함 시그니처 (수정 액션)

```typescript
export async function updateApp(
  id: string, // 수정할 리소스 ID
  _prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  // ...
}
```

### 1.3 클라이언트에서 호출

```tsx
"use client";

import { useActionState } from "react";
import { createApp, updateApp } from "@/actions/apps";

// 생성: 기본 호출
const [state, formAction] = useActionState(createApp, { success: false });

// 수정: bind로 ID 고정
const updateAppWithId = updateApp.bind(null, appId);
const [state, formAction] = useActionState(updateAppWithId, { success: false });
```

---

## 2. FormData 파싱

### 2.1 기본 파싱

```typescript
const rawData = {
  name: formData.get("name") as string,
  category: formData.get("category") as string | null,
  notes: formData.get("notes") as string | null,
};
```

### 2.2 타입별 파싱

#### 문자열 (필수)

```typescript
const name = formData.get("name") as string;
// 빈 문자열이면 Zod에서 에러 처리
```

#### 문자열 (선택)

```typescript
const category = formData.get("category") as string | null;
// null 또는 빈 문자열 가능
```

#### 숫자

```typescript
const amount = formData.get("amount");
const parsedAmount = amount ? Number(amount) : null;
// 또는 Zod에서 coerce 사용
```

#### 불리언 (체크박스)

```typescript
const isActive = formData.get("isActive") === "on";
// 체크박스는 체크 시 "on", 미체크 시 null
```

#### 배열 (콤마 구분 문자열)

```typescript
const tagsString = formData.get("tags") as string | null;
const tags = tagsString
  ? tagsString
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  : [];
```

#### 파일

```typescript
const file = formData.get("file") as File | null;
if (file && file.size > 0) {
  // 파일 처리
}
```

### 2.3 전체 파싱 예시

```typescript
export async function createApp(
  _prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  const { organizationId, userId } = await requireOrganization();

  // FormData → 객체 변환
  const rawData = {
    name: formData.get("name") as string,
    category: formData.get("category") as string | null,
    customLogoUrl: formData.get("customLogoUrl") as string | null,
    customWebsite: formData.get("customWebsite") as string | null,
    notes: formData.get("notes") as string | null,
    tags: formData.get("tags") as string | null,
    ownerId: formData.get("ownerId") as string | null,
    catalogId: formData.get("catalogId") as string | null,
  };

  // 이후 Zod 검증...
}
```

---

## 3. Zod 유효성 검사

### 3.1 스키마 정의

```typescript
import { z } from "zod";

const createAppSchema = z.object({
  name: z
    .string()
    .min(2, "앱 이름은 2자 이상이어야 합니다")
    .max(100, "앱 이름은 100자 이하여야 합니다"),

  category: z.string().nullish(), // null 또는 undefined 허용

  customLogoUrl: z
    .string()
    .url("유효한 URL을 입력하세요")
    .nullish()
    .or(z.literal("")), // 빈 문자열도 허용

  customWebsite: z
    .string()
    .url("유효한 URL을 입력하세요")
    .nullish()
    .or(z.literal("")),

  notes: z.string().max(1000, "메모는 1000자 이하여야 합니다").nullish(),

  tags: z.string().nullish(), // 파싱은 별도로

  ownerId: z.string().nullish(),

  catalogId: z.string().nullish(),
});
```

### 3.2 safeParse 사용 (권장)

```typescript
// ✅ safeParse: 에러 throw 안함
const result = createAppSchema.safeParse(rawData);

if (!result.success) {
  return {
    success: false,
    errors: result.error.flatten().fieldErrors as Record<string, string[]>,
  };
}

const data = result.data; // 타입 안전 데이터
```

### 3.3 parse 사용 (비권장)

```typescript
// ❌ parse: 에러 throw - try-catch 필요
try {
  const data = createAppSchema.parse(rawData);
} catch (error) {
  if (error instanceof z.ZodError) {
    // 에러 처리
  }
}
```

### 3.4 고급 스키마 패턴

#### 숫자 변환 (coerce)

```typescript
const subscriptionSchema = z.object({
  amount: z.coerce.number().positive("금액은 0보다 커야 합니다"),
  seats: z.coerce.number().int().min(1, "최소 1석 이상"),
});
```

#### 날짜 변환

```typescript
const dateSchema = z.object({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
});
```

#### 조건부 필드

```typescript
const schema = z
  .object({
    type: z.enum(["monthly", "yearly"]),
    billingCycle: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "monthly") {
        return data.billingCycle !== undefined;
      }
      return true;
    },
    {
      message: "월간 구독은 청구 주기가 필요합니다",
      path: ["billingCycle"],
    }
  );
```

#### Enum

```typescript
import { AppStatus } from "@prisma/client";

const updateAppSchema = createAppSchema.extend({
  status: z.nativeEnum(AppStatus).nullish(),
});
```

---

## 4. API Route에서 JSON → FormData

API Route에서 JSON body를 받아 Server Action을 호출할 때 FormData로 변환합니다.

### 4.1 변환 패턴

```typescript
// src/app/api/v1/apps/route.ts
import { NextResponse } from "next/server";
import { createApp } from "@/actions/apps";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // JSON body 파싱
    const body = await request.json();

    // FormData로 변환
    const formData = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    // Server Action 호출
    const result = await createApp({ success: false }, formData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, errors: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
```

### 4.2 배열/객체 처리

```typescript
const body = {
  name: "Test App",
  tags: ["tag1", "tag2"], // 배열
};

const formData = new FormData();
Object.entries(body).forEach(([key, value]) => {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    // 배열: 콤마 구분 문자열로 변환
    formData.append(key, value.join(","));
  } else if (typeof value === "object") {
    // 객체: JSON 문자열로 변환
    formData.append(key, JSON.stringify(value));
  } else {
    formData.append(key, String(value));
  }
});
```

---

## 5. 클라이언트 통합

### 5.1 기본 폼

```tsx
"use client";

import { useActionState } from "react";
import { createApp } from "@/actions/apps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AppForm() {
  const [state, formAction, isPending] = useActionState(createApp, {
    success: false,
  });

  return (
    <form action={formAction} className="space-y-4">
      {/* 일반 에러 메시지 */}
      {!state.success && state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* 이름 필드 */}
      <div className="space-y-2">
        <Label htmlFor="name">앱 이름 *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="앱 이름을 입력하세요"
        />
        {state.errors?.name && (
          <p className="text-destructive text-sm">{state.errors.name[0]}</p>
        )}
      </div>

      {/* 카테고리 필드 (선택) */}
      <div className="space-y-2">
        <Label htmlFor="category">카테고리</Label>
        <Input
          id="category"
          name="category"
          placeholder="카테고리를 입력하세요"
        />
      </div>

      {/* 제출 버튼 */}
      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "저장"}
      </Button>
    </form>
  );
}
```

### 5.2 성공 후 리다이렉트

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

export function AppForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createApp, {
    success: false,
  });

  useEffect(() => {
    if (state.success && state.data?.id) {
      router.push(`/apps/${state.data.id}`);
    }
  }, [state, router]);

  // ... 폼 렌더링
}
```

### 5.3 수정 폼 (초기값)

```tsx
"use client";

import { useActionState } from "react";
import { updateApp } from "@/actions/apps";
import type { AppDetail } from "@/types/app";

interface EditFormProps {
  app: AppDetail;
}

export function AppEditForm({ app }: EditFormProps) {
  const updateAppWithId = updateApp.bind(null, app.id);
  const [state, formAction, isPending] = useActionState(updateAppWithId, {
    success: false,
  });

  return (
    <form action={formAction}>
      <Input
        name="name"
        defaultValue={app.name} // 초기값 설정
      />
      <Input name="category" defaultValue={app.category ?? ""} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "수정 중..." : "수정"}
      </Button>
    </form>
  );
}
```

---

## 6. 테스트 패턴

### 6.1 FormData 생성

```typescript
import { describe, it, expect, vi } from "vitest";

it("should create app with valid data", async () => {
  // FormData 생성
  const formData = new FormData();
  formData.set("name", "Test App");
  formData.set("category", "Productivity");
  formData.set("notes", "테스트 메모");

  // Server Action 호출
  const result = await createApp({ success: false }, formData);

  expect(result.success).toBe(true);
});
```

### 6.2 필수 필드 누락 테스트

```typescript
it("should return error when name is empty", async () => {
  const formData = new FormData();
  formData.set("name", ""); // 빈 이름

  const result = await createApp({ success: false }, formData);

  expect(result.success).toBe(false);
  expect(result.errors?.name).toBeDefined();
  expect(result.errors?.name[0]).toContain("2자 이상");
});
```

### 6.3 유효성 검사 오류 테스트

```typescript
it("should return error for invalid URL", async () => {
  const formData = new FormData();
  formData.set("name", "Test App");
  formData.set("customLogoUrl", "not-a-url"); // 잘못된 URL

  const result = await createApp({ success: false }, formData);

  expect(result.success).toBe(false);
  expect(result.errors?.customLogoUrl).toBeDefined();
  expect(result.errors?.customLogoUrl[0]).toContain("URL");
});
```

### 6.4 선택 필드 테스트

```typescript
it("should create app with only required fields", async () => {
  const formData = new FormData();
  formData.set("name", "Minimal App");
  // category, notes 등 선택 필드 미설정

  const result = await createApp({ success: false }, formData);

  expect(result.success).toBe(true);
});
```

### 6.5 수정 액션 테스트

```typescript
it("should update app", async () => {
  // 기존 앱 모킹
  vi.mocked(prisma.app.findFirst).mockResolvedValue({
    id: "app-123",
    name: "Old Name",
    organizationId: "org-123",
  } as any);

  const formData = new FormData();
  formData.set("name", "New Name");

  const result = await updateApp("app-123", { success: false }, formData);

  expect(result.success).toBe(true);
  expect(prisma.app.update).toHaveBeenCalledWith({
    where: { id: "app-123" },
    data: expect.objectContaining({ name: "New Name" }),
  });
});
```

---

## 체크리스트

### Server Action 구현 시

- [ ] 올바른 시그니처 사용 (`_prevState`, `formData`)
- [ ] FormData에서 모든 필드 파싱
- [ ] null/undefined 처리
- [ ] Zod `safeParse()` 사용
- [ ] 에러 시 `errors` 필드 반환

### 폼 구현 시

- [ ] `useActionState` 훅 사용
- [ ] `name` 속성 모든 입력 필드에 설정
- [ ] 필드별 에러 메시지 표시
- [ ] 일반 에러 메시지 표시
- [ ] 로딩 상태 처리 (`isPending`)
- [ ] 성공 후 리다이렉트 처리

---

## 관련 문서

- [09-error-handling-strategy.md](./09-error-handling-strategy.md) - 에러 처리 전략
- [04-test-templates.md](./04-test-templates.md) - 테스트 템플릿
- [05-common-patterns.md](./05-common-patterns.md) - 공통 패턴
