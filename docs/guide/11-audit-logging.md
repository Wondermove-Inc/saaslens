# 11. 감사 로그 (Audit Logging) 가이드

이 문서는 SaaS Management Platform의 감사 로그 생성, 조회, 테스트 패턴을 설명합니다.

## 목차

1. [핵심 개념](#1-핵심-개념)
2. [감사 로그 스키마](#2-감사-로그-스키마)
3. [감사 로그 생성 패턴](#3-감사-로그-생성-패턴)
4. [표준 액션 명명 규칙](#4-표준-액션-명명-규칙)
5. [감사 로그 조회](#5-감사-로그-조회)
6. [테스트 패턴](#6-테스트-패턴)

---

## 1. 핵심 개념

### 1.1 감사 로그란?

시스템에서 발생하는 중요한 이벤트를 기록하여 **보안**, **컴플라이언스**, **디버깅**에 활용합니다.

```
┌─────────────────────────────────────────────────────────┐
│                    Audit Log Entry                       │
├─────────────────────────────────────────────────────────┤
│  WHO: userId, userName                                  │
│  WHAT: action, entityType, entityId                     │
│  WHEN: createdAt                                        │
│  WHERE: ipAddress, userAgent                            │
│  DETAILS: changes, metadata                             │
└─────────────────────────────────────────────────────────┘
```

### 1.2 감사 로그 생성 시점

| 액션 유형  | 필수 | 설명                              |
| ---------- | :--: | --------------------------------- |
| **CREATE** | Yes  | 리소스 생성 (앱, 구독, 사용자 등) |
| **UPDATE** | Yes  | 리소스 수정                       |
| **DELETE** | Yes  | 리소스 삭제                       |
| **LOGIN**  | Yes  | 사용자 로그인                     |
| **LOGOUT** | Yes  | 사용자 로그아웃                   |
| **SYNC**   | Yes  | 외부 시스템 동기화                |
| **EXPORT** | Yes  | 데이터 내보내기                   |
| **IMPORT** | Yes  | 데이터 가져오기                   |
| **VIEW**   |  No  | 단순 조회 (선택적)                |

### 1.3 Multi-Tenant 격리

감사 로그도 `organizationId`로 격리됩니다:

```typescript
// ✅ 올바른 패턴
await prisma.auditLog.create({
  data: {
    action: "CREATE_APP",
    organizationId, // 필수
    userId,
    // ...
  },
});
```

---

## 2. 감사 로그 스키마

### 2.1 Prisma 모델

**파일**: `prisma/schema.prisma`

```prisma
model AuditLog {
  id String @id @default(cuid())

  organizationId String       @map("organization_id")
  organization   Organization @relation(...)

  userId String? @map("user_id")
  user   User?   @relation(...)

  action     String
  entityType String  @map("entity_type")
  entityId   String? @map("entity_id")

  changes  Json?   // 변경 전후 데이터
  metadata Json?   // 추가 컨텍스트 정보

  ipAddress String? @map("ip_address")
  userAgent String? @map("user_agent")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([organizationId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### 2.2 필드 설명

| 필드             | 타입     | 필수 | 설명                               |
| ---------------- | -------- | :--: | ---------------------------------- |
| `id`             | String   | Yes  | CUID 고유 식별자                   |
| `organizationId` | String   | Yes  | 테넌트 격리용                      |
| `userId`         | String   |  No  | 수행한 사용자 (시스템 작업은 null) |
| `action`         | String   | Yes  | 수행한 액션 (CREATE_APP 등)        |
| `entityType`     | String   | Yes  | 대상 엔티티 타입 (App, User 등)    |
| `entityId`       | String   |  No  | 대상 엔티티 ID                     |
| `changes`        | Json     |  No  | 변경 전후 데이터                   |
| `metadata`       | Json     |  No  | 추가 정보 (앱 이름 등)             |
| `ipAddress`      | String   |  No  | 요청 IP 주소                       |
| `userAgent`      | String   |  No  | 브라우저/클라이언트 정보           |
| `createdAt`      | DateTime | Yes  | 생성 시각                          |

---

## 3. 감사 로그 생성 패턴

### 3.1 기본 패턴

```typescript
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/auth/require-auth";

export async function createApp(formData: FormData) {
  const { organizationId, userId } = await requireOrganization();

  // 1. 비즈니스 로직 수행
  const app = await prisma.app.create({
    data: {
      name: formData.get("name") as string,
      organizationId,
    },
  });

  // 2. 감사 로그 생성
  await prisma.auditLog.create({
    data: {
      action: "CREATE_APP",
      entityType: "App",
      entityId: app.id,
      userId,
      organizationId,
      metadata: { appName: app.name },
    },
  });

  return { success: true, data: { id: app.id } };
}
```

### 3.2 수정 시 변경 내역 기록

```typescript
export async function updateApp(id: string, formData: FormData) {
  const { organizationId, userId } = await requireOrganization();

  // 1. 기존 데이터 조회
  const existingApp = await prisma.app.findFirst({
    where: { id, organizationId },
  });

  if (!existingApp) {
    return { success: false, message: "앱을 찾을 수 없습니다" };
  }

  // 2. 업데이트 수행
  const newName = formData.get("name") as string;
  const app = await prisma.app.update({
    where: { id },
    data: { name: newName },
  });

  // 3. 변경 내역과 함께 감사 로그 생성
  await prisma.auditLog.create({
    data: {
      action: "UPDATE_APP",
      entityType: "App",
      entityId: app.id,
      userId,
      organizationId,
      changes: {
        before: { name: existingApp.name },
        after: { name: app.name },
      },
      metadata: { appName: app.name },
    },
  });

  return { success: true };
}
```

### 3.3 삭제 시 패턴

```typescript
export async function deleteApp(id: string) {
  const { organizationId, userId, role } = await requireOrganization();

  if (role !== "ADMIN") {
    return { success: false, message: "관리자 권한이 필요합니다" };
  }

  const existingApp = await prisma.app.findFirst({
    where: { id, organizationId },
  });

  if (!existingApp) {
    return { success: false, message: "앱을 찾을 수 없습니다" };
  }

  // 1. 삭제 수행
  await prisma.app.delete({ where: { id } });

  // 2. 감사 로그 (삭제된 엔티티 정보 보존)
  await prisma.auditLog.create({
    data: {
      action: "DELETE_APP",
      entityType: "App",
      entityId: id, // 삭제된 ID 기록
      userId,
      organizationId,
      metadata: {
        appName: existingApp.name,
        deletedData: existingApp, // 필요시 전체 데이터 보존
      },
    },
  });

  return { success: true };
}
```

### 3.4 시스템 작업 (userId 없음)

```typescript
// Cron job, 외부 시스템 연동 등
export async function syncIntegration(integrationId: string) {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  // 동기화 로직...

  // 시스템 작업은 userId가 null
  await prisma.auditLog.create({
    data: {
      action: "SYNC_INTEGRATION",
      entityType: "Integration",
      entityId: integrationId,
      userId: null, // 시스템 작업
      organizationId: integration!.organizationId,
      metadata: {
        syncedAt: new Date().toISOString(),
        recordsProcessed: 150,
      },
    },
  });
}
```

### 3.5 트랜잭션 내 감사 로그

중요한 작업은 트랜잭션으로 묶어 일관성 보장:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. 비즈니스 로직
  const app = await tx.app.create({
    data: { name: "New App", organizationId },
  });

  // 2. 감사 로그 (같은 트랜잭션)
  await tx.auditLog.create({
    data: {
      action: "CREATE_APP",
      entityType: "App",
      entityId: app.id,
      userId,
      organizationId,
    },
  });

  return app;
});
```

---

## 4. 표준 액션 명명 규칙

### 4.1 액션 이름 형식

```
{동사}_{엔티티}
```

- **동사**: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, SYNC, EXPORT, IMPORT
- **엔티티**: APP, SUBSCRIPTION, USER, INTEGRATION, ORGANIZATION, PAYMENT

### 4.2 표준 액션 목록

#### 앱 관련

| 액션               | 설명           |
| ------------------ | -------------- |
| `CREATE_APP`       | 앱 생성        |
| `UPDATE_APP`       | 앱 수정        |
| `DELETE_APP`       | 앱 삭제        |
| `ASSIGN_APP_OWNER` | 앱 소유자 지정 |

#### 구독 관련

| 액션                  | 설명      |
| --------------------- | --------- |
| `CREATE_SUBSCRIPTION` | 구독 생성 |
| `UPDATE_SUBSCRIPTION` | 구독 수정 |
| `DELETE_SUBSCRIPTION` | 구독 삭제 |
| `RENEW_SUBSCRIPTION`  | 구독 갱신 |

#### 사용자 관련

| 액션              | 설명            |
| ----------------- | --------------- |
| `CREATE_USER`     | 사용자 생성     |
| `UPDATE_USER`     | 사용자 수정     |
| `DELETE_USER`     | 사용자 삭제     |
| `INVITE_USER`     | 사용자 초대     |
| `DEACTIVATE_USER` | 사용자 비활성화 |

#### 인증 관련

| 액션             | 설명            |
| ---------------- | --------------- |
| `LOGIN`          | 로그인          |
| `LOGOUT`         | 로그아웃        |
| `LOGIN_FAILED`   | 로그인 실패     |
| `PASSWORD_RESET` | 비밀번호 재설정 |

#### 연동 관련

| 액션                 | 설명        |
| -------------------- | ----------- |
| `CREATE_INTEGRATION` | 연동 생성   |
| `UPDATE_INTEGRATION` | 연동 수정   |
| `DELETE_INTEGRATION` | 연동 삭제   |
| `SYNC_INTEGRATION`   | 연동 동기화 |
| `SYNC_FAILED`        | 동기화 실패 |

#### 데이터 관련

| 액션          | 설명            |
| ------------- | --------------- |
| `EXPORT_DATA` | 데이터 내보내기 |
| `IMPORT_DATA` | 데이터 가져오기 |
| `BULK_UPDATE` | 대량 수정       |

### 4.3 엔티티 타입 목록

```typescript
const entityTypes = [
  "App",
  "Subscription",
  "User",
  "Integration",
  "Organization",
  "Payment",
  "Report",
  "Invitation",
];
```

---

## 5. 감사 로그 조회

### 5.1 목록 조회 (페이지네이션)

**파일**: `src/actions/audit.ts`

```typescript
export interface AuditLogFilters {
  action?: string;
  userId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLogs(
  filters: AuditLogFilters
): Promise<AuditLogListResponse> {
  const session = await auth();
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  const organizationId = session.user.organizationId;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { organizationId };

  // 필터 조건 추가
  if (filters.action) where.action = filters.action;
  if (filters.userId) where.userId = filters.userId;
  if (filters.entityType) where.entityType = filters.entityType;

  // 날짜 범위
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      userName: log.user?.name ?? null,
      userEmail: log.user?.email ?? null,
      changes: log.changes,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
```

### 5.2 필터 옵션 조회

```typescript
export async function getAuditLogFilterOptions(): Promise<AuditLogFilterOptions> {
  const session = await auth();
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  const users = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return {
    actions: [
      "CREATE",
      "UPDATE",
      "DELETE",
      "LOGIN",
      "LOGOUT",
      "SYNC",
      "EXPORT",
      "IMPORT",
    ],
    entityTypes: [
      "App",
      "Subscription",
      "User",
      "Integration",
      "Organization",
      "Payment",
    ],
    users: users.map((u) => ({
      id: u.id,
      name: u.name ?? "",
      email: u.email,
    })),
  };
}
```

---

## 6. 테스트 패턴

### 6.1 감사 로그 생성 검증

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { createApp } from "./apps";

vi.mock("@/lib/db", () => ({
  prisma: {
    app: { create: vi.fn(), findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

describe("createApp - Audit Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create audit log on app creation", async () => {
    // Arrange
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

    // Act
    const result = await createApp({ success: false }, formData);

    // Assert
    expect(result.success).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CREATE_APP",
        entityType: "App",
        entityId: "app-789",
        userId: "user-456",
        organizationId: "org-123",
        metadata: { appName: "Test App" },
      }),
    });
  });
});
```

### 6.2 삭제 시 감사 로그 검증

```typescript
it("should create audit log with deleted data on app deletion", async () => {
  vi.mocked(requireOrganization).mockResolvedValue({
    organizationId: "org-123",
    userId: "user-456",
    role: "ADMIN",
    session: {} as any,
  });

  vi.mocked(prisma.app.findFirst).mockResolvedValue({
    id: "app-789",
    name: "Deleted App",
    organizationId: "org-123",
  } as any);

  vi.mocked(prisma.app.delete).mockResolvedValue({} as any);

  // Act
  const result = await deleteApp("app-789");

  // Assert
  expect(prisma.auditLog.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      action: "DELETE_APP",
      entityType: "App",
      entityId: "app-789",
      metadata: expect.objectContaining({
        appName: "Deleted App",
      }),
    }),
  });
});
```

### 6.3 감사 로그 조회 테스트

```typescript
describe("getAuditLogs", () => {
  it("should filter by organizationId", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: "org-123" },
    } as any);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

    await getAuditLogs({});

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-123",
        }),
      })
    );
  });

  it("should apply date filters", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: "org-123" },
    } as any);

    await getAuditLogs({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2024-01-01"),
            lte: new Date("2024-01-31"),
          },
        }),
      })
    );
  });
});
```

---

## 체크리스트

### 감사 로그 생성 시

- [ ] `organizationId` 포함 (Multi-tenant 격리)
- [ ] 적절한 `action` 이름 사용 (표준 명명 규칙)
- [ ] `entityType`과 `entityId` 설정
- [ ] 삭제 시 `metadata`에 삭제된 데이터 보존
- [ ] 수정 시 `changes`에 변경 전후 데이터 기록

### 감사 로그 조회 시

- [ ] `organizationId`로 필터링 (다른 조직 접근 방지)
- [ ] 페이지네이션 적용
- [ ] 최신순 정렬 (`createdAt: "desc"`)

### 테스트 시

- [ ] 감사 로그 생성 함수 호출 검증
- [ ] 올바른 `action`, `entityType` 검증
- [ ] `organizationId` 포함 검증

---

## 관련 문서

- [08-multi-tenant-patterns.md](./08-multi-tenant-patterns.md) - Multi-tenant 패턴
- [09-error-handling-strategy.md](./09-error-handling-strategy.md) - 에러 처리 전략
- [05-common-patterns.md](./05-common-patterns.md) - 공통 테스트 패턴
