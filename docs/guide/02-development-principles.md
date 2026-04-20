# Development Principles (개발 원칙)

> **TDD 기반 개발 필수 준수 사항**

---

## 1. TDD Red-Green-Refactor 사이클 (필수)

### 1.1 개발 순서

```
[ ] 1. RED    - 실패하는 테스트 먼저 작성
[ ] 2. GREEN  - 테스트 통과하는 최소한의 코드 작성
[ ] 3. REFACTOR - 테스트 유지하며 코드 품질 개선
```

### 1.2 커밋 메시지 규칙

```bash
# RED 단계
git commit -m "test: add failing test for [feature]"

# GREEN 단계
git commit -m "feat: implement [feature] to pass tests"

# REFACTOR 단계
git commit -m "refactor: improve [feature] implementation"
```

---

## 2. 파일 구조 규칙

### 2.1 Co-located Tests (필수)

**규칙**: 모든 소스 파일은 동일 위치에 `.test.ts` 파일을 가져야 함

```
src/actions/apps.ts         -> src/actions/apps.test.ts        ✅
src/lib/services/foo.ts     -> src/lib/services/foo.test.ts    ✅
src/components/Bar.tsx      -> src/components/Bar.test.tsx     ✅
```

### 2.2 테스트 파일 네이밍

| 소스 파일      | 테스트 파일         |
| -------------- | ------------------- |
| `utils.ts`     | `utils.test.ts`     |
| `use-apps.ts`  | `use-apps.test.ts`  |
| `app-card.tsx` | `app-card.test.tsx` |

---

## 3. 코드 품질 규칙

### 3.1 파일 길이 제한: 500줄

- **최대**: 500줄 (초과 시 리팩토링 필수)
- **권장**: 300줄 이하
- **400줄 접근 시**: 분리 계획 수립

```typescript
// 분리 방법
// 1. 헬퍼 함수 -> 별도 파일로 추출
// 2. 타입 정의 -> types.ts로 분리
// 3. 상수 -> constants.ts로 분리
// 4. 큰 컴포넌트 -> 하위 컴포넌트로 분리
```

### 3.2 커버리지 목표

| 영역                                 | 최소 커버리지 | 우선순위 |
| ------------------------------------ | ------------- | -------- |
| Server Actions (`src/actions/`)      | 90%           | P0       |
| Services (`src/lib/services/`)       | 90%           | P0       |
| Utility Functions (`src/lib/utils/`) | 95%           | P0       |
| React Hooks (`src/hooks/`)           | 85%           | P1       |
| Components (`src/components/`)       | 80%           | P1       |
| Zustand Stores (`src/stores/`)       | 85%           | P1       |

---

## 4. 네이밍 컨벤션

### 4.1 describe 블록

```typescript
// 패턴: "should [동작] when [조건]"
describe("AppCard", () => {
  it("should display app name", () => {}); // ✅
  it("should show status badge when active", () => {}); // ✅
  it("should call onDelete when delete button clicked", () => {}); // ✅

  // 금지
  it("renders", () => {}); // ❌ 너무 모호
  it("handles click", () => {}); // ❌ 결과 미명시
  it("status", () => {}); // ❌ 문장이 아님
});
```

### 4.2 그룹화

```typescript
describe("createApp action", () => {
  describe("when valid input", () => {
    it("should create app in database", () => {});
    it("should return success ActionState", () => {});
    it("should revalidate /apps path", () => {});
  });

  describe("when invalid input", () => {
    it("should return validation errors", () => {});
    it("should not create app", () => {});
  });

  describe("when unauthorized", () => {
    it("should return error ActionState", () => {});
  });
});
```

### 4.3 변수 네이밍

```typescript
// 테스트 데이터
const mockApp = { id: "1", name: "Slack" }; // mock + EntityName
const mockApps = [mockApp]; // mock + EntityName + s

// 설정 함수
const renderAppCard = (props?: Partial<AppCardProps>) => {}; // render + ComponentName
const createTestApp = (overrides?: Partial<App>) => {}; // createTest + EntityName

// 모킹 함수
const onDeleteMock = vi.fn(); // eventName + Mock
const handleSubmitMock = vi.fn(); // handlerName + Mock
```

---

## 5. 품질 게이트

### 5.1 커밋 전 필수 검사

```bash
# 자동 실행 (pre-commit hook)
npm run lint-staged

# 수동 실행 (권장)
npm run quality
```

### 5.2 PR 전 필수 검사

```bash
npm run quality:full
# 실행 내용: lint + type-check + test:coverage
```

### 5.3 CI/CD 품질 게이트

| 검사            | 명령어                  | 필수 |
| --------------- | ----------------------- | ---- |
| Type Check      | `npm run type-check`    | ✅   |
| ESLint          | `npm run lint`          | ✅   |
| Prettier        | `npm run format:check`  | ✅   |
| Unit Tests      | `npm run test`          | ✅   |
| Coverage >= 80% | `npm run test:coverage` | ✅   |

---

## 6. 계획 작성 규칙

### 6.1 체크박스 필수

모든 계획 항목에 `[ ]` 체크박스 포함

```markdown
## 작업 계획

### Phase 1: 설정

[ ] vitest.config.ts 생성
[ ] package.json 업데이트
[x] docs/guide 폴더 생성 (완료)

### Phase 2: 구현

[ ] App 서비스 구현
[ ] createApp 함수
[ ] updateApp 함수
[ ] 테스트 작성
```

### 6.2 진행 상황 기록

```markdown
## 진행 상황

### 2024-01-15

[x] vitest 설정 완료 - vitest.config.ts 생성 - vitest.setup.ts 생성 - 처리 방법: Next.js mock 추가 필요했음

[ ] 테스트 작성 중 - createApp: 완료 - updateApp: 진행 중 (validation 로직 추가 필요)
```

---

## 7. 코드 리뷰 체크리스트

### 7.1 테스트 관련

```markdown
[ ] 새 소스 파일에 대응하는 .test.ts 파일 존재
[ ] 테스트가 Arrange-Act-Assert 패턴 따름
[ ] 테스트 이름이 should/when/given 패턴 사용
[ ] .skip 테스트 없음 (있다면 이슈 링크 필요)
[ ] beforeEach/afterEach에서 mock 정리
```

### 7.2 커버리지 관련

```markdown
[ ] 새 코드 커버리지 >= 80%
[ ] Happy path + Error case 테스트
[ ] Edge case 문서화 및 테스트
```

### 7.3 품질 관련

```markdown
[ ] 소스 파일 500줄 이하
[ ] shadcn/ui 컴포넌트 사용 (기본 컴포넌트 재생성 금지)
[ ] TypeScript strict 통과
[ ] any 타입 사용 시 JSDoc 설명 필수
```

---

## 8. 금지 사항

### 8.1 절대 금지

```
❌ 테스트 없이 기능 코드 작성
❌ .skip 테스트 방치
❌ any 타입 무분별 사용
❌ 500줄 초과 파일
❌ shadcn/ui 기본 컴포넌트 재생성 (Button, Input, Card 등)
❌ 커버리지 80% 미만 PR 머지
```

### 8.2 주의 사항

```
⚠️ 모킹 과다 사용 (실제 로직 테스트 필요)
⚠️ 테스트 간 상태 공유
⚠️ 비동기 코드에서 await 누락
⚠️ 하드코딩된 테스트 데이터
```

---

## 9. 관련 가이드 참조

### Multi-tenant 및 에러 처리

모든 데이터 조작은 `organizationId` 기반으로 격리해야 합니다:

- [08-multi-tenant-patterns.md](./08-multi-tenant-patterns.md) - Multi-tenant 데이터 격리 패턴
- [09-error-handling-strategy.md](./09-error-handling-strategy.md) - ActionState 및 에러 처리

### FormData 및 Audit 로깅

Server Actions 구현 시 참조:

- [10-form-data-patterns.md](./10-form-data-patterns.md) - FormData 파싱 및 Zod 검증
- [11-audit-logging.md](./11-audit-logging.md) - 감사 로그 생성 패턴

---

## 10. 다음 단계

- [03-shadcn-ui-rules.md](./03-shadcn-ui-rules.md) - 컴포넌트 재사용 정책
- [04-test-templates.md](./04-test-templates.md) - 테스트 템플릿
- [05-common-patterns.md](./05-common-patterns.md) - 공통 테스트 패턴
- [12-git-workflow.md](./12-git-workflow.md) - Git 워크플로우
