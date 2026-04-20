# Coverage Checklist (커버리지 체크리스트)

> **PR 전 필수 확인 사항**

---

## 1. Quick Commands

```bash
# 테스트 실행
npm test

# 커버리지 리포트 생성
npm run test:coverage

# HTML 리포트 열기
open coverage/index.html

# 품질 검사 전체 실행
npm run quality:full
```

---

## 2. 커버리지 요구사항

### 2.1 전체 목표: 80%

```
✅ Statements: 80%
✅ Branches: 80%
✅ Functions: 80%
✅ Lines: 80%
```

### 2.2 디렉토리별 목표

| 디렉토리            | 최소 커버리지 | 우선순위  |
| ------------------- | ------------- | --------- |
| `src/actions/`      | 90%           | P0 - 필수 |
| `src/lib/services/` | 90%           | P0 - 필수 |
| `src/lib/utils.ts`  | 95%           | P0 - 필수 |
| `src/hooks/`        | 85%           | P1 - 높음 |
| `src/stores/`       | 85%           | P1 - 높음 |
| `src/components/`   | 80%           | P1 - 높음 |
| `src/app/api/`      | 80%           | P2 - 보통 |

---

## 3. PR 전 체크리스트

### 3.1 테스트 파일 확인

```markdown
[ ] 새 소스 파일마다 .test.ts 파일 존재
[ ] 테스트 파일이 소스 파일 옆에 위치 (co-located)
[ ] 테스트가 실제로 실행됨 (npm test 통과)
```

### 3.2 커버리지 확인

```markdown
[ ] npm run test:coverage 실행
[ ] 전체 커버리지 80% 이상
[ ] 새로 추가한 코드 커버리지 확인
[ ] Uncovered Lines 검토
```

### 3.3 테스트 품질 확인

```markdown
[ ] Happy path (정상 케이스) 테스트
[ ] Error case (에러 케이스) 테스트
[ ] Edge case (경계 케이스) 테스트
[ ] 테스트 이름이 명확함 (should/when 패턴)
```

---

## 4. 테스트해야 할 것

### 4.1 필수 테스트 대상

```typescript
// ✅ Server Actions
// - 모든 입력 검증
// - 성공 케이스
// - 실패 케이스 (validation, DB 에러, 권한 없음)
// - revalidatePath 호출 확인

// ✅ 비즈니스 로직
// - 계산 함수
// - 데이터 변환 함수
// - 필터/정렬 로직

// ✅ 커스텀 훅
// - 모든 상태 (loading, error, success)
// - 상태 변경 함수
// - 리렌더링 최적화

// ✅ 폼 검증
// - 각 필드 검증 규칙
// - 전체 폼 제출
// - 에러 메시지 표시

// ✅ 컴포넌트
// - 데이터 렌더링
// - 조건부 렌더링
// - 이벤트 핸들러
// - 로딩/에러 상태
```

### 4.2 테스트 스킵 가능 (커버리지 제외)

```typescript
// ⏭️ shadcn/ui 컴포넌트 내부 동작
// - Button 클릭 가능 여부
// - Dialog 열기/닫기
// - Select 옵션 선택

// ⏭️ Next.js 내부 동작
// - Router 동작
// - Image 컴포넌트

// ⏭️ 정적 JSX
// - 로직 없는 순수 마크업
// - 스타일만 있는 컴포넌트

// ⏭️ 타입 정의
// - interface
// - type alias

// ⏭️ 설정 파일
// - vitest.config.ts
// - next.config.ts
```

---

## 5. Uncovered Lines 해결 방법

### 5.1 리포트 확인

```bash
npm run test:coverage
open coverage/index.html
```

### 5.2 일반적인 Uncovered 패턴

```typescript
// 패턴 1: 에러 핸들링
// 문제: catch 블록이 커버되지 않음
try {
  await riskyOperation();
} catch (error) {
  console.error(error); // ← Uncovered
  return { error: "Failed" };
}

// 해결: 에러 발생 테스트 추가
it("should handle error", async () => {
  vi.mocked(riskyOperation).mockRejectedValue(new Error("Test error"));
  const result = await functionUnderTest();
  expect(result.error).toBe("Failed");
});
```

```typescript
// 패턴 2: 조건부 렌더링
// 문제: else 브랜치 미커버
function Component({ isLoading }) {
  if (isLoading) {
    return <Spinner />;
  }
  return <Content />;  // ← Uncovered
}

// 해결: 두 케이스 모두 테스트
it('should show spinner when loading', () => {
  render(<Component isLoading={true} />);
  expect(screen.getByTestId('spinner')).toBeInTheDocument();
});

it('should show content when not loading', () => {
  render(<Component isLoading={false} />);
  expect(screen.getByTestId('content')).toBeInTheDocument();
});
```

```typescript
// 패턴 3: early return
// 문제: 검증 실패 케이스 미커버
function validate(data) {
  if (!data.name) {
    return { error: "Name required" }; // ← Uncovered
  }
  return { success: true };
}

// 해결: 실패 케이스 테스트 추가
it("should return error for missing name", () => {
  const result = validate({});
  expect(result.error).toBe("Name required");
});
```

---

## 6. 커버리지 예외 처리

### 6.1 의도적 제외

```typescript
// vitest.config.ts에서 제외
coverage: {
  exclude: [
    'src/app/layout.tsx',      // Next.js 레이아웃
    'src/app/**/loading.tsx',  // 로딩 컴포넌트
    'src/app/**/error.tsx',    // 에러 컴포넌트
    'src/types/**',            // 타입 정의
  ],
}
```

### 6.2 인라인 제외 (사용 자제)

```typescript
// 특정 라인 제외 (정말 필요한 경우만)
/* v8 ignore next */
console.log("debug only");

// 블록 제외
/* v8 ignore start */
if (process.env.NODE_ENV === "development") {
  // 개발 전용 코드
}
/* v8 ignore stop */
```

---

## 7. CI/CD 커버리지 체크

### 7.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Check Coverage Threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80% threshold"
      exit 1
    fi
```

### 7.2 Pre-commit Hook (선택적)

```bash
# .husky/pre-push
npm run test:coverage
```

---

## 8. 커버리지 개선 팁

### 8.1 점진적 개선

```markdown
Week 1: 핵심 Server Actions 90% 달성
Week 2: 서비스 레이어 90% 달성
Week 3: 컴포넌트 80% 달성
Week 4: 전체 80% 유지 및 안정화
```

### 8.2 새 코드 우선

```markdown
- 새로 작성하는 코드는 반드시 테스트 포함
- 기존 코드는 수정 시 테스트 추가
- 버그 수정 시 해당 버그 재현 테스트 추가
```

### 8.3 리팩토링과 함께

```markdown
- 코드 리팩토링 시 테스트 먼저 작성
- 테스트 통과 확인 후 리팩토링
- 리팩토링 후 테스트 재실행
```

---

## 9. 커버리지 리포트 해석

### 9.1 지표 설명

| 지표       | 설명                                     |
| ---------- | ---------------------------------------- |
| Statements | 실행된 문장 비율                         |
| Branches   | 실행된 조건 분기 비율 (if/else, ternary) |
| Functions  | 호출된 함수 비율                         |
| Lines      | 실행된 코드 라인 비율                    |

### 9.2 우선순위

```
1. Branches - 가장 중요 (모든 조건 테스트)
2. Functions - 모든 함수 호출 확인
3. Lines - 실행되지 않은 코드 확인
4. Statements - 전반적인 커버리지 확인
```

---

## 10. 요약 체크리스트

### PR 제출 전 최종 확인

```markdown
[ ] npm run quality:full 통과
[ ] 전체 커버리지 80% 이상
[ ] 새 코드에 대한 테스트 존재
[ ] 테스트 파일이 소스 옆에 위치
[ ] .skip 테스트 없음
[ ] 모든 테스트 통과
```

---

## 관련 문서

- [01-tdd-quick-start.md](./01-tdd-quick-start.md) - TDD 시작하기
- [02-development-principles.md](./02-development-principles.md) - 개발 원칙
- [04-test-templates.md](./04-test-templates.md) - 테스트 템플릿
- [08-multi-tenant-patterns.md](./08-multi-tenant-patterns.md) - Multi-tenant 테스트 패턴
- [11-audit-logging.md](./11-audit-logging.md) - 감사 로그 테스트 패턴
- [12-git-workflow.md](./12-git-workflow.md) - Git 워크플로우 및 PR 프로세스
