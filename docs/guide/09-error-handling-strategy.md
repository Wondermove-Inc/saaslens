# 09. 에러 처리 전략 가이드

이 문서는 Server Actions 및 API Routes에서의 표준 에러 처리 패턴을 설명합니다.

## 목차

1. [ActionState 패턴](#1-actionstate-패턴)
2. [에러 응답 결정 매트릭스](#2-에러-응답-결정-매트릭스)
3. [Server Action 에러 처리](#3-server-action-에러-처리)
4. [API Route 에러 처리](#4-api-route-에러-처리)
5. [클라이언트 에러 처리](#5-클라이언트-에러-처리)
6. [테스트 패턴](#6-테스트-패턴)

---

## 1. ActionState 패턴

### 1.1 타입 정의

**파일**: `src/types/index.ts`

```typescript
export interface ActionState<T = null> {
  success: boolean; // 성공 여부
  message?: string; // 사용자에게 보여줄 메시지
  data?: T; // 성공 시 반환 데이터
  errors?: Record<string, string[]>; // 필드별 유효성 검사 오류
}
```

### 1.2 응답 유형

#### 성공 응답

```typescript
// 데이터 없이 성공
return { success: true };

// 데이터와 함께 성공
return { success: true, data: { id: app.id } };

// 메시지와 함께 성공
return { success: true, message: "앱이 생성되었습니다" };
```

#### 유효성 검사 오류

```typescript
// Zod 유효성 검사 실패
const result = schema.safeParse(data);
if (!result.success) {
  return {
    success: false,
    errors: result.error.flatten().fieldErrors as Record<string, string[]>,
  };
}
```

#### 비즈니스 규칙 오류

```typescript
// 중복 검사 실패
if (existingApp) {
  return { success: false, message: "이미 등록된 앱 이름입니다" };
}

// 권한 부족
if (role !== "ADMIN") {
  return { success: false, message: "삭제 권한이 없습니다" };
}
```

---

## 2. 에러 응답 결정 매트릭스

### 2.1 Server Action 에러 유형

| 시나리오               | 응답 방식                 | 예시                    |
| ---------------------- | ------------------------- | ----------------------- |
| **세션 없음**          | `redirect('/login')`      | 로그인 필요             |
| **조직 없음**          | `redirect('/onboarding')` | 온보딩 필요             |
| **유효성 검사 실패**   | `ActionState.errors`      | 필드별 오류 메시지      |
| **비즈니스 규칙 위반** | `ActionState.message`     | "중복된 이름입니다"     |
| **리소스 없음**        | `ActionState.message`     | "앱을 찾을 수 없습니다" |
| **권한 부족**          | `ActionState.message`     | "권한이 없습니다"       |
| **DB/네트워크 오류**   | `ActionState.message`     | 일반 오류 메시지        |

### 2.2 API Route 에러 유형

| 시나리오        | HTTP 상태        | 응답 형식                         |
| --------------- | ---------------- | --------------------------------- |
| **세션 없음**   | 401 Unauthorized | `{ error: "인증이 필요합니다" }`  |
| **권한 부족**   | 403 Forbidden    | `{ error: "권한이 없습니다" }`    |
| **리소스 없음** | 404 Not Found    | `{ error: "찾을 수 없습니다" }`   |
| **유효성 오류** | 400 Bad Request  | `{ error: "...", errors: {...} }` |
| **서버 오류**   | 500 Internal     | `{ error: "서버 오류" }`          |

---

## 3. Server Action 에러 처리

### 3.1 기본 패턴

```typescript
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import type { ActionState } from "@/types";

// Redirect 에러 감지 헬퍼
function isRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const hasRedirectDigest =
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.includes("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.includes("NEXT_NOT_FOUND"));

  const hasRedirectMessage = error.message?.includes("NEXT_REDIRECT") ?? false;

  return hasRedirectDigest || hasRedirectMessage;
}

export async function createApp(
  _prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  try {
    // 1. 인증 확인 (자동 redirect)
    const { organizationId, userId } = await requireOrganization();

    // 2. 입력 데이터 파싱
    const rawData = {
      name: formData.get("name") as string,
      category: formData.get("category") as string | null,
    };

    // 3. 유효성 검사
    const result = createAppSchema.safeParse(rawData);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    // 4. 비즈니스 규칙 검사
    const existing = await prisma.app.findFirst({
      where: { organizationId, name: result.data.name },
    });
    if (existing) {
      return { success: false, message: "이미 등록된 앱 이름입니다" };
    }

    // 5. 데이터 생성
    const app = await prisma.app.create({
      data: { ...result.data, organizationId },
    });

    // 6. 캐시 무효화
    revalidatePath("/apps");

    // 7. 성공 응답
    return { success: true, data: { id: app.id } };
  } catch (error) {
    // 8. Redirect 에러는 재throw (Next.js 필수)
    if (isRedirectError(error)) throw error;

    // 9. 로깅 및 일반 에러 응답
    console.error("앱 생성 오류:", error);
    return { success: false, message: "앱 생성 중 오류가 발생했습니다" };
  }
}
```

### 3.2 isRedirectError 필수 사용

Next.js의 `redirect()`는 특수한 에러를 throw합니다. 이를 잡아서 재throw하지 않으면 리다이렉트가 동작하지 않습니다.

```typescript
try {
  await requireOrganization(); // 내부에서 redirect() 호출 가능
  // ...
} catch (error) {
  // ⚠️ 중요: Redirect 에러는 반드시 재throw
  if (isRedirectError(error)) throw error;

  // 다른 에러만 처리
  return { success: false, message: "오류가 발생했습니다" };
}
```

### 3.3 에러 로깅

```typescript
catch (error) {
  if (isRedirectError(error)) throw error;

  // 개발 환경: 전체 에러 출력
  // 프로덕션: 에러 추적 서비스로 전송 (Sentry 등)
  console.error("앱 생성 오류:", error);

  // 사용자에게는 일반적인 메시지
  return { success: false, message: "앱 생성 중 오류가 발생했습니다" };
}
```

---

## 4. API Route 에러 처리

### 4.1 기본 패턴

```typescript
// src/app/api/v1/apps/route.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // 1. 인증 확인
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");

    // 3. 데이터 조회
    const apps = await getApps({ page });

    // 4. 성공 응답
    return NextResponse.json(apps);
  } catch (error) {
    console.error("API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // JSON 파싱
    const body = await request.json();

    // Server Action 호출을 위한 FormData 변환
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

### 4.2 HTTP 상태 코드 가이드

| 상태 코드                   | 사용 시점                     |
| --------------------------- | ----------------------------- |
| `200 OK`                    | GET 성공                      |
| `201 Created`               | POST 성공 (리소스 생성)       |
| `204 No Content`            | DELETE 성공                   |
| `400 Bad Request`           | 유효성 검사 실패, 잘못된 요청 |
| `401 Unauthorized`          | 인증 필요                     |
| `403 Forbidden`             | 권한 부족                     |
| `404 Not Found`             | 리소스 없음                   |
| `500 Internal Server Error` | 서버 오류                     |

---

## 5. 클라이언트 에러 처리

### 5.1 useActionState 사용

```tsx
"use client";

import { useActionState } from "react";
import { createApp } from "@/actions/apps";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AppForm() {
  const [state, formAction, isPending] = useActionState(createApp, {
    success: false,
  });

  return (
    <form action={formAction}>
      {/* 일반 에러 메시지 */}
      {!state.success && state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* 필드별 에러 */}
      <div>
        <Input name="name" />
        {state.errors?.name && (
          <p className="text-destructive text-sm">{state.errors.name[0]}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "처리 중..." : "생성"}
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

  // ...
}
```

---

## 6. 테스트 패턴

### 6.1 성공 케이스 테스트

```typescript
it("should create app successfully", async () => {
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-123",
    userId: "user-456",
    role: "ADMIN",
    session: {} as any,
  });

  vi.mocked(prisma.app.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.app.create).mockResolvedValue({
    id: "app-789",
    name: "Test App",
  } as any);

  const formData = new FormData();
  formData.set("name", "Test App");

  const result = await createApp({ success: false }, formData);

  expect(result.success).toBe(true);
  expect(result.data?.id).toBe("app-789");
});
```

### 6.2 유효성 검사 오류 테스트

```typescript
it("should return validation errors for empty name", async () => {
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-123",
    // ...
  });

  const formData = new FormData();
  formData.set("name", ""); // 빈 이름

  const result = await createApp({ success: false }, formData);

  expect(result.success).toBe(false);
  expect(result.errors?.name).toBeDefined();
  expect(result.errors?.name[0]).toContain("2자 이상");
});
```

### 6.3 비즈니스 규칙 오류 테스트

```typescript
it("should return error for duplicate name", async () => {
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-123",
    // ...
  });

  // 이미 존재하는 앱
  vi.mocked(prisma.app.findFirst).mockResolvedValue({ id: "existing" } as any);

  const formData = new FormData();
  formData.set("name", "Existing App");

  const result = await createApp({ success: false }, formData);

  expect(result.success).toBe(false);
  expect(result.message).toBe("이미 등록된 앱 이름입니다");
});
```

### 6.4 리다이렉트 테스트

```typescript
it("should redirect when not authenticated", async () => {
  // redirect 에러를 throw하는 mock
  vi.mocked(requireOrganization).mockImplementation(() => {
    const error = new Error("NEXT_REDIRECT");
    (error as any).digest = "NEXT_REDIRECT;/login";
    throw error;
  });

  const formData = new FormData();
  formData.set("name", "Test");

  // redirect 에러가 다시 throw되어야 함
  await expect(createApp({ success: false }, formData)).rejects.toThrow(
    "NEXT_REDIRECT"
  );
});
```

---

## 체크리스트

### Server Action 구현 시

- [ ] `requireOrganization()` 또는 `requireAuth()` 호출
- [ ] Zod 스키마로 유효성 검사 (safeParse 사용)
- [ ] 비즈니스 규칙 검사 (중복, 권한 등)
- [ ] try-catch로 에러 핸들링
- [ ] `isRedirectError()` 체크 및 재throw
- [ ] 일반 에러는 로깅 후 사용자 친화적 메시지 반환

### API Route 구현 시

- [ ] 세션 확인 및 401 응답
- [ ] 적절한 HTTP 상태 코드 사용
- [ ] JSON 응답 형식 일관성 유지
- [ ] 에러 로깅

---

## 관련 문서

- [08-multi-tenant-patterns.md](./08-multi-tenant-patterns.md) - Multi-tenant 패턴
- [10-form-data-patterns.md](./10-form-data-patterns.md) - FormData 패턴
- [04-test-templates.md](./04-test-templates.md) - 테스트 템플릿
