# Storybook 구성 소스코드 개선 계획

**작성일**: 2025-10-11 **상태**: 계획 중 **목적**: Storybook 구성 소스코드
분석을 통한 코드 품질 개선 및 일관성 강화

---

## 📋 분석 대상 파일

### Storybook 설정 파일

- `.storybook/main.ts` - Storybook 메인 설정
- `.storybook/preview.ts` - Preview 설정 (테마, 정렬, 접근성)
- `.storybook/preview.css` - Storybook 스타일링
- `.storybook/preview-body.html` - Geist 폰트 로딩
- `.storybook/vitest.setup.ts` - Vitest 테스트 설정
- `vitest.config.ts` - Vitest 프로젝트 설정 (storybook + unit)

### 관련 설정 파일

- `package.json` - 의존성 및 스크립트
- `tsconfig.json` - TypeScript 설정
- `eslint.config.mjs` - ESLint 설정

### 스토리 파일

- 총 59개 스토리 파일 분석 (`src/registry/atoms/`)
- Play function 포함 스토리: 54개 (91.5%)

---

## 🔍 발견된 주요 이슈

### 1. 🚨 **접근성 테스트 수준 불일치** (High Priority)

**현재 상태**:

```typescript
// .storybook/preview.ts:28
a11y: {
  test: "error",  // 🚨 WCAG 2.1 AA 위반 시 CI 실패
}
```

**문제점**:

- CLAUDE.md에는 `test: "todo"` (violations 표시만) 명시
- 실제 코드는 `test: "error"` (CI 실패 강제)
- 문서와 실제 구현이 불일치

**영향**:

- 접근성 위반 시 CI 파이프라인 실패 가능
- 개발자 경험 저하 (예상치 못한 빌드 실패)
- 문서 신뢰성 저하

**관련 파일**:

- `.storybook/preview.ts:28`
- `CLAUDE.md:27` (문서 내용 불일치)

---

### 2. 📦 **Meta 타입 정의 불일치** (Medium Priority)

**현재 상태**: 두 가지 다른 타입 정의 패턴 혼용:

**패턴 A** (button.stories.tsx):

```typescript
const meta: Meta<typeof Button> = {
  title: "ui/Button",
  component: Button,
  // ...
};
```

**패턴 B** (input.stories.tsx, alert.stories.tsx):

```typescript
const meta = {
  title: "ui/Input",
  component: Input,
  // ...
} satisfies Meta<typeof Input>;
```

**문제점**:

- 타입 안전성 수준이 다름 (패턴 B가 더 엄격)
- 코드베이스 일관성 부족
- 신규 개발자에게 혼란 유발

**영향 범위**:

- 59개 스토리 파일 중 약 30% 패턴 A, 70% 패턴 B 사용
- 타입 체크 일관성 저하

**관련 파일**:

- `src/registry/atoms/button-story/button.stories.tsx:16`
- `src/registry/atoms/input-story/input.stories.tsx:13`
- `src/registry/atoms/alert-story/alert.stories.tsx:42`

---

### 3. 🧪 **Play Function 테스트 커버리지 격차** (Medium Priority)

**현재 상태**:

- Play function 있는 스토리: 54개 (91.5%)
- Play function 없는 스토리: 5개 (8.5%)

**Play function 없는 컴포넌트**:

1. **Skeleton** - 정적 컴포넌트이지만 다양한 variant 테스트 필요
2. **Badge** - 다양한 variant 렌더링 검증 필요
3. **Card** - 구조적 컴포넌트이지만 렌더링 테스트 필요
4. **(기타 3개 미확인)**

**문제점**:

- 시각적 회귀 테스트 부족
- 자동화된 검증 없음
- Storybook addon-vitest 활용 미흡

**영향**:

- 컴포넌트 변경 시 회귀 위험 증가
- QA 시간 증가

---

### 4. 📚 **JSDoc 주석 일관성 부족** (Low Priority)

**현재 상태**: JSDoc 주석 패턴 불일치:

**패턴 A** (상세 설명):

```typescript
/**
 * Ref 사용 예제: Button에 ref를 전달하여 DOM 요소에 직접 접근합니다.
 * 이 예제는 ref를 통한 focus 제어를 보여줍니다.
 */
export const WithRef: Story = {
  /* ... */
};
```

**패턴 B** (간단 설명):

```typescript
/**
 * Icon button example.
 */
export const Icon: Story = {
  /* ... */
};
```

**문제점**:

- 문서화 품질 불균형
- Storybook autodocs 출력 일관성 저하
- 새로운 개발자의 학습 곡선 증가

**영향 범위**:

- 59개 스토리 파일 전체
- 약 300+ 개별 Story export

---

### 5. 🔧 **Form 컴포넌트 React 18 호환성 주석** (Low Priority)

**현재 상태**:

```typescript
// form.stories.tsx:175-178
// React 18 호환성: ref.current는 read-only이므로 타입 단언 사용
(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
```

**문제점**:

- React 19.1.1 사용 중 (package.json:62-64)
- React 18 호환성 주석이 여전히 존재
- 혼란 유발 가능 (현재 버전과 주석 불일치)

**영향**:

- 실제 기능 문제 없음 (동작은 정상)
- 문서 신뢰성 저하
- 코드 리뷰 시 혼란

**관련 파일**:

- `src/registry/atoms/form-story/form.stories.tsx:175-178`
- `package.json:62-64` (React 19.1.1 명시)

---

### 6. 🎨 **Preview CSS 하드코딩된 색상 값** (Low Priority)

**현재 상태**:

```css
/* .storybook/preview.css */
html:not(.dark) .sb-show-main {
  background-color: hsl(0 0% 100%); /* 하드코딩 */
  color: hsl(240 10% 3.9%); /* 하드코딩 */
}
```

**문제점**:

- Tailwind CSS 디자인 토큰 미사용
- 테마 일관성 부족 (global.css와 중복)
- 유지보수성 저하

**영향**:

- 디자인 시스템 변경 시 수동 업데이트 필요
- CSS 변수와 하드코딩 색상 혼재

**관련 파일**:

- `.storybook/preview.css:8-18`

---

## 🎯 개선 계획 (High-Level Tasks)

### Task 1: 접근성 테스트 수준 통일

**목표**: `.storybook/preview.ts`의 a11y 설정을 CLAUDE.md 문서와 일치시켜 개발자
경험 개선

**작업 내용**:

1. `.storybook/preview.ts`의 `a11y.test` 값을 `"error"`에서 `"todo"`로 변경
2. CLAUDE.md 문서 검토하여 접근성 정책 확인
3. 변경 후 Storybook 빌드 테스트
4. 접근성 위반 발생 시 UI에서만 표시되는지 확인 (CI 실패 없어야 함)

**예상 시간**: 15분 **위험도**: 낮음 (단순 설정 변경) **영향 파일**:

- `.storybook/preview.ts`

---

### Task 2: Meta 타입 정의 패턴 통일

**목표**: 모든 스토리 파일의 Meta 타입 정의를 `satisfies Meta<T>` 패턴으로
통일하여 타입 안전성 강화

**작업 내용**:

1. 59개 스토리 파일 중 패턴 A 사용 파일 목록 추출
2. 각 파일의 `const meta: Meta<T>` → `const meta = { ... } satisfies Meta<T>`
   변환
3. 타입 체크 수행 (`npm run type-check`)
4. 변경 후 Storybook 빌드 및 실행 확인

**예상 시간**: 1-2시간 (자동화 스크립트 작성 시 30분) **위험도**: 낮음 (타입
정의만 변경, 런타임 동작 동일) **영향 파일**:

- `src/registry/atoms/button-story/button.stories.tsx`
- 기타 패턴 A 사용 스토리 파일 (약 18개 예상)

---

### Task 3: Play Function 테스트 추가

**목표**: Play function이 없는 5개 컴포넌트에 기본 렌더링 테스트 추가

**작업 내용**:

1. Play function 없는 5개 스토리 파일 정확히 식별
2. 각 컴포넌트 특성에 맞는 기본 테스트 작성:
   - **Skeleton**: 다양한 variant 렌더링 확인
   - **Badge**: variant별 텍스트 렌더링 확인
   - **Card**: 구조 요소(Header, Content, Footer) 렌더링 확인
3. `expect`, `within` 사용하여 기본 검증 추가
4. `tags: ["!dev", "!autodocs"]` 설정으로 문서에서 숨김

**예상 시간**: 1-2시간 **위험도**: 낮음 (새로운 테스트 추가, 기존 코드 미변경)
**영향 파일**:

- `src/registry/atoms/skeleton-story/skeleton.stories.tsx`
- `src/registry/atoms/badge-story/badge.stories.tsx`
- `src/registry/atoms/card-story/card.stories.tsx`
- 기타 2개 미확인 파일

---

### Task 4: JSDoc 주석 표준화

**목표**: Story export JSDoc 주석 가이드라인 수립 및 일관성 개선

**작업 내용**:

1. JSDoc 주석 표준 패턴 정의:
   - **Default Story**: "The default form of the [component]."
   - **Variant Story**: "Use the `[variant]` variant for [use case]."
   - **Interactive Story**: "[Action/Behavior] - [Purpose]."
   - **WithRef Story**: "Ref 사용 예제: [설명] (한국어 유지)"
2. CLAUDE.md에 JSDoc 표준 추가
3. 주요 컴포넌트 10-15개에 표준 적용
4. 나머지는 점진적 개선 (옵션)

**예상 시간**: 2-3시간 (전체 적용 시 5-6시간) **위험도**: 낮음 (주석만 변경,
코드 동작 무관) **영향 파일**:

- 59개 스토리 파일 전체 (점진적 적용)
- `CLAUDE.md` (JSDoc 표준 추가)

---

### Task 5: React 버전 주석 정리

**목표**: React 18 호환성 주석을 React 19 현실에 맞게 업데이트

**작업 내용**:

1. Form 컴포넌트의 React 18 호환성 주석 검토
2. 주석을 React 19로 업데이트하거나 불필요 시 제거
3. 동일한 패턴이 있는지 다른 파일 검색
4. 변경 후 테스트 실행

**예상 시간**: 15-30분 **위험도**: 낮음 (주석만 변경, 코드 로직 미변경) **영향
파일**:

- `src/registry/atoms/form-story/form.stories.tsx`

---

### Task 6: Preview CSS 디자인 토큰 적용 (Optional)

**목표**: 하드코딩된 색상 값을 Tailwind CSS 변수로 변환하여 디자인 시스템 일관성
확보

**작업 내용**:

1. `.storybook/preview.css`의 하드코딩 색상 목록 추출
2. Tailwind CSS 변수 또는 CSS 변수(`var(--background)`)로 변환
3. 라이트/다크 모드 동작 테스트
4. 변경 전후 시각적 비교 (Chromatic 또는 수동)

**예상 시간**: 1-2시간 **위험도**: 중간 (색상 변경 시 시각적 회귀 가능) **영향
파일**:

- `.storybook/preview.css`

---

## ❓ 사용자 의사결정 필요 사항

### 1️⃣ **접근성 테스트 수준 선택**

**선택지**:

- **옵션 A**: `test: "todo"` (권장)
  - 장점: 개발 중 접근성 위반 표시만, CI 실패 없음
  - 단점: 접근성 이슈 강제 수정 안 됨
  - 사용 사례: 점진적 접근성 개선 진행 중

- **옵션 B**: `test: "error"` (현재 상태 유지)
  - 장점: 접근성 위반 시 즉시 CI 실패로 강제 수정
  - 단점: 기존 컴포넌트 위반 시 빌드 차단 가능
  - 사용 사례: 접근성 준수 필수 프로덕션 환경

**권장**: 옵션 A (`test: "todo"`) **이유**: CLAUDE.md 문서와 일치, 개발자 경험
우선

---

### 2️⃣ **Meta 타입 통일 범위 선택**

**선택지**:

- **최소 구현**: 주요 컴포넌트 10개만 변경
  - 시간: 30분
  - 효과: 핵심 패턴 통일

- **표준 구현**: 패턴 A 사용 파일 전체 변경 (~18개)
  - 시간: 1-2시간
  - 효과: 일관성 대폭 개선

- **확장 구현**: 59개 전체 검토 및 통일
  - 시간: 3-4시간
  - 효과: 완벽한 일관성 확보

**권장**: 표준 구현 (패턴 A 파일 전체 변경) **이유**: 시간 대비 효과 최적, 타입
안전성 핵심 개선

---

### 3️⃣ **Play Function 추가 우선순위**

**선택지**:

- **High Priority**: Skeleton, Badge, Card (사용자 직면 컴포넌트)
- **Medium Priority**: 기타 2개 미확인 컴포넌트
- **Low Priority**: 이미 Play function 있는 54개 컴포넌트 테스트 강화

**권장**: High Priority 3개 먼저 처리 **이유**: 빠른 개선 효과, 테스트 커버리지
95%+ 달성

---

### 4️⃣ **JSDoc 표준화 범위**

**선택지**:

- **최소**: 가이드라인만 CLAUDE.md에 추가 (코드 변경 없음)
- **점진적**: 주요 10-15개 컴포넌트에만 적용
- **전체**: 59개 전체 표준화

**권장**: 점진적 적용 (10-15개) **이유**: 표준 정립 + 실제 적용 예시 제공,
나머지는 자연스럽게 개선

---

### 5️⃣ **Preview CSS 디자인 토큰 적용 여부**

**선택지**:

- **적용**: 디자인 시스템 일관성 확보 (1-2시간)
- **보류**: 낮은 우선순위, 현재 동작 문제 없음

**권장**: 보류 **이유**: 시각적 회귀 위험 대비 효과 낮음, 다른 개선사항 우선

---

## 📊 예상 작업 시간

| Task                           | 최소 시간       | 표준 시간   | 확장 시간     |
| ------------------------------ | --------------- | ----------- | ------------- |
| Task 1: 접근성 설정            | 15분            | 15분        | 15분          |
| Task 2: Meta 타입 통일         | 30분            | 1-2시간     | 3-4시간       |
| Task 3: Play Function 추가     | 1시간           | 1-2시간     | 3-4시간       |
| Task 4: JSDoc 표준화           | 30분 (가이드만) | 2-3시간     | 5-6시간       |
| Task 5: React 주석 정리        | 15분            | 15-30분     | 30분          |
| Task 6: Preview CSS (Optional) | -               | 1-2시간     | 2-3시간       |
| **총 예상 시간**               | **2.5시간**     | **5-8시간** | **14-18시간** |

---

## ✅ 완료 기준

### Task 1: 접근성 설정

- [ ] `.storybook/preview.ts`에서 `a11y.test: "todo"` 설정
- [ ] Storybook 빌드 성공 확인
- [ ] 접근성 위반 시 UI에만 표시되는지 확인 (CI 실패 없음)

### Task 2: Meta 타입 통일

- [ ] 패턴 A 사용 파일 목록 추출 완료
- [ ] 모든 대상 파일 `satisfies Meta<T>` 패턴으로 변환
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] Storybook 빌드 및 실행 확인

### Task 3: Play Function 추가

- [ ] Play function 없는 5개 파일 정확히 식별
- [ ] 각 파일에 기본 렌더링 테스트 추가
- [ ] `npm run test:storybook` 통과
- [ ] 테스트 커버리지 95% 이상 달성

### Task 4: JSDoc 표준화

- [ ] JSDoc 표준 패턴 정의 완료
- [ ] CLAUDE.md에 JSDoc 가이드라인 추가
- [ ] 주요 10-15개 컴포넌트에 표준 적용
- [ ] `npm run build` 성공 (autodocs 생성 확인)

### Task 5: React 주석 정리

- [ ] Form 컴포넌트 React 18 주석 업데이트 또는 제거
- [ ] 다른 파일에 동일 패턴 검색 및 정리
- [ ] `npm run test:unit` 통과

### Task 6: Preview CSS (Optional)

- [ ] 하드코딩 색상 목록 추출
- [ ] CSS 변수로 변환
- [ ] 라이트/다크 모드 동작 테스트
- [ ] 시각적 회귀 없음 확인

---

## 🚨 위험 요소 및 대응 방안

### 위험 1: Meta 타입 변경 시 타입 에러

**대응**: 변경 전 각 파일 개별 타입 체크, 에러 발생 시 원복

### 위험 2: Play Function 추가 시 테스트 실패

**대응**: 간단한 렌더링 검증만 추가, 복잡한 상호작용 테스트 제외

### 위험 3: JSDoc 변경 시 autodocs 출력 변경

**대응**: 변경 전후 Storybook 빌드 결과 비교, 문제 시 롤백

### 위험 4: Preview CSS 변경 시 시각적 회귀

**대응**: Chromatic 또는 수동 시각적 비교, 문제 발생 시 즉시 원복

---

## 📝 참고사항

### 분석 방법

- Storybook 설정 파일 직접 읽기
- 59개 스토리 파일 패턴 분석
- package.json, tsconfig.json, eslint.config.mjs 검토
- CLAUDE.md 문서와 실제 코드 비교

### 제외 사항

- Registry 시스템 (`registry.json`) 변경 없음
- 컴포넌트 구현 코드 (`src/components/ui/`) 변경 없음
- Next.js 설정 변경 없음
- Vitest 설정 변경 없음 (현재 구성 양호)

### 후속 작업 제안 (Optional)

- Chromatic 시각적 회귀 테스트 도입
- Storybook Interaction Testing 강화
- Component-Driven Development 워크플로우 문서화
- Storybook 성능 최적화 (빌드 시간 단축)

---

## 🎯 다음 단계

1. **사용자 승인 대기**
   - 위 5가지 의사결정 사항에 대한 선택 받기
   - 작업 범위 최종 확정

2. **승인 후 작업 시작**
   - Task 1부터 순차적으로 진행
   - 각 Task 완료 시 완료 기준 체크
   - 테스트 및 검증 철저히 수행

3. **완료 보고**
   - 변경사항 요약
   - 테스트 결과 공유
   - 개선 효과 측정

---

**📌 Note**: 이 계획서는 실제 코드 분석을 기반으로 작성되었으며, 최소 수정
원칙을 준수합니다. 모든 작업은 기존 기능을 유지하면서 코드 품질과 일관성을
개선하는 데 초점을 맞췄습니다.
