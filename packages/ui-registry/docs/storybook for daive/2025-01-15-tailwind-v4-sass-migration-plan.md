# 🎯 Tailwind v4 + Sass 분리 사용 점진적 마이그레이션 계획

**작성일**: 2025-01-15 **프로젝트**: skuber-mgmt-client (DAIVE) **목적**:
Tailwind CSS v4와 Sass를 분리하여 사용하고, shadcn-storybook-registry 컴포넌트로
점진적 UI 개선

---

## 📊 현재 상황 분석

### ✅ 프로젝트 현황

```
프로젝트: skuber-mgmt-client (Electron + Webpack)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tailwind v4.1.14 설치됨 (실제 사용 안 함)
✅ @tailwindcss/postcss v4.1.14 설치됨
✅ Sass + Webpack 환경 구축됨
✅ shadcn-storybook-registry 프로젝트 보유 (46/51 컴포넌트 완성)
✅ UI 개선 계획 수립 중
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 🎯 마이그레이션 전략

```
전략: Tailwind v4 + Sass 분리 사용 + 점진적 컴포넌트 교체
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 기존 Sass 코드는 그대로 유지 (안정성 보장)
2. 새로운 UI 개선 시 Tailwind v4 사용 (최신 기술 활용)
3. Storybook 컴포넌트로 점진적 교체 (검증된 컴포넌트 사용)
4. 시간이 지나면서 자연스럽게 Sass → Tailwind 전환
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### ⚠️ 주요 이슈

**Tailwind v4 + Sass 호환성 문제**:

- Tailwind CSS v4는 Sass/SCSS 전처리기 지원을 **공식적으로 중단**
- 현재 프로젝트의 Webpack 설정: `sass-loader` →
  `postcss-loader (@tailwindcss/postcss)` 순서
- 이 조합은 **작동하지 않거나 불안정함**

**해결 방안**:

- Tailwind v4와 Sass를 **완전히 분리**하여 사용
- `.css` 파일 (Tailwind 전용) / `.scss` 파일 (Sass 전용) 별도 처리

---

## 🚨 Phase 1: 필수 실행 계획 (인프라 구축)

### 1. Tailwind v4 CSS 엔트리 파일 생성

**목적**: Tailwind v4를 Sass와 완전히 분리하여 사용 가능하게 만들기

**작업 내용**:

```css
/* packages/core/src/renderer/tailwind.css */
@import "tailwindcss";

/* 프로젝트별 Tailwind 커스터마이징 (CSS Variables) */
@theme {
  --font-sans: Roboto, Helvetica, Arial, sans-serif;

  /* 기존 CSS 변수 참조 */
  --color-accent: var(--textColorAccent);
  --color-primary: var(--textColorPrimary);
  --color-tertiary: var(--textColorTertiary);
  --color-dimmed: var(--textColorDimmed);
}
```

**영향 파일**:

- `packages/core/src/renderer/tailwind.css` (신규 생성)

**예상 시간**: 10분 **위험도**: 낮음 (기존 코드 영향 없음)

---

### 2. Webpack 설정에 Tailwind CSS 전용 규칙 추가

**목적**: `.css` 파일(Tailwind 전용)과 `.scss` 파일(기존 Sass) 분리 처리

**작업 내용**:

```typescript
// packages/core/webpack/renderer.ts 수정

/**
 * Tailwind CSS 전용 로더 (Sass 없이)
 * .css 파일만 처리하여 Tailwind v4와 호환
 */
export function tailwindCssWebpackRule(): webpack.RuleSetRule {
  return {
    test: /\.css$/, // .css만 처리
    exclude: /\.module\.css$/, // CSS Modules 제외
    use: [
      MiniCssExtractPlugin.loader,
      {
        loader: "css-loader",
        options: {
          sourceMap: isDevelopment,
          modules: false, // CSS Modules 비활성화
        },
      },
      {
        loader: "postcss-loader",
        options: {
          sourceMap: isDevelopment,
          postcssOptions: {
            plugins: ["@tailwindcss/postcss"],
          },
        },
      },
    ],
  };
}

/**
 * Sass 전용 로더 (기존 코드)
 * .scss 파일만 처리, Tailwind 처리 제외
 */
export function cssModulesWebpackRule({
  styleLoader,
}: CssModulesWebpackRuleOptions = {}): webpack.RuleSetRule {
  styleLoader ??= MiniCssExtractPlugin.loader;

  return {
    test: /\.s?css$/, // 변경 없음
    use: [
      styleLoader,
      {
        loader: "css-loader",
        options: {
          sourceMap: isDevelopment,
          modules: {
            auto: /\.module\./i,
            mode: "local",
            localIdentName: "[name]__[local]--[hash:base64:5]",
          },
        },
      },
      {
        loader: "postcss-loader",
        options: {
          sourceMap: isDevelopment,
          postcssOptions: {
            plugins: ["@tailwindcss/postcss"], // ⚠️ 이 부분 제거 고려
          },
        },
      },
      {
        loader: "sass-loader",
        options: {
          api: "modern",
          sourceMap: isDevelopment,
        },
      },
    ],
  };
}

// Webpack config에 규칙 추가
export function webpackLensRenderer(): webpack.Configuration {
  return {
    // ... 기존 설정
    module: {
      rules: [
        // ... 기존 규칙들
        tailwindCssWebpackRule(), // ← 새로 추가
        cssModulesWebpackRule(),
        // ... 기타 규칙들
      ],
    },
  };
}
```

**주의사항**:

- `.css` 파일과 `.scss` 파일이 별도 규칙으로 처리됨
- Tailwind는 `.css` 파일에서만 작동
- 기존 Sass 코드는 영향 없음

**영향 파일**:

- `packages/core/webpack/renderer.ts` (수정)

**예상 시간**: 30분 **위험도**: 중간 (빌드 설정 변경이지만 기존 Sass 코드는 영향
없음)

---

### 3. Tailwind CSS import 추가

**목적**: 애플리케이션에서 Tailwind 스타일 사용 가능하게 설정

**작업 내용**:

```typescript
// packages/core/src/renderer/library.ts 또는 메인 엔트리에 추가
import "./tailwind.css";

// 또는 HTML 템플릿에서 직접 로드
// <link rel="stylesheet" href="./tailwind.css">
```

**영향 파일**:

- `packages/core/src/renderer/library.ts` 또는 메인 엔트리 파일

**예상 시간**: 5분 **위험도**: 낮음

---

### 4. 빌드 테스트 및 검증

**목적**: Tailwind + Sass 동시 사용 환경이 정상 작동하는지 확인

**작업 내용**:

```bash
# 개발 빌드 테스트
cd packages/core && pnpm build

# Tailwind 클래스 테스트용 임시 컴포넌트 생성 (선택)
# 예: <div className="bg-blue-500 text-white p-4">Test</div>

# 개발 서버 실행
cd ../../ && pnpm dev

# Electron 앱에서 Tailwind 클래스 확인
```

**검증 항목**:

- [ ] 빌드 에러 없음
- [ ] Tailwind 클래스가 정상 작동
- [ ] 기존 Sass 스타일 정상 작동
- [ ] Hot reload 정상 작동

**영향 파일**: 없음 (검증 단계)

**예상 시간**: 20분 **위험도**: 낮음

---

## 💡 Phase 2: 옵션 계획 (점진적 마이그레이션)

### 옵션 1: Storybook 컴포넌트 설치 스크립트 작성

**효과**: shadcn-storybook-registry에서 컴포넌트를 쉽게 가져오기

**작업량**: 1시간 **우선순위**: 높음

**구현 예시**:

```bash
#!/bin/bash
# scripts/install-story.sh

COMPONENT=$1
REGISTRY_URL="http://localhost:3000/v2/r"

if [ -z "$COMPONENT" ]; then
  echo "Usage: ./scripts/install-story.sh <component-name>"
  echo "Example: ./scripts/install-story.sh button"
  exit 1
fi

echo "Installing ${COMPONENT} story from Storybook Registry..."
npx shadcn@latest add "${REGISTRY_URL}/${COMPONENT}-story.json"

echo "Done! Component installed to src/components/ui/"
```

**사용 방법**:

```bash
chmod +x scripts/install-story.sh
./scripts/install-story.sh button
./scripts/install-story.sh input
```

---

### 옵션 2: UI 개선 우선순위 목록 작성

**효과**: 어떤 컴포넌트부터 교체할지 계획 수립

**작업량**: 30분 **우선순위**: 높음

**제안 우선순위**:

1. **Button** (최우선)
   - 가장 많이 사용되는 컴포넌트
   - UI 일관성에 가장 큰 영향
   - 검증하기 쉬움

2. **Input/Form** (우선)
   - 사용자 입력 UX 개선
   - 접근성 향상
   - 데이터 유효성 검증 통합

3. **Card/Badge** (중간)
   - 정보 표시 개선
   - 시각적 일관성 향상
   - 상대적으로 영향 범위 작음

4. **Dialog/Sheet** (추후)
   - 모달 UX 개선
   - 복잡한 상호작용 개선
   - 충분한 테스트 필요

**평가 기준**:

- 사용 빈도
- 기존 코드와의 통합 난이도
- 사용자 경험 개선 효과
- 개발 리스크

---

### 옵션 3: Tailwind 설정 파일 CSS 기반으로 전환

**효과**: Tailwind v4 공식 권장 방식 사용 (CSS-first config)

**작업량**: 45분 **우선순위**: 중간

**현재 설정** (v3 스타일):

```javascript
// packages/core/tailwind.config.js
module.exports = {
  content: ["src/**/*.tsx"],
  darkMode: "class",
  theme: {
    fontFamily: {
      sans: ["Roboto", "Helvetica", "Arial", "sans-serif"],
    },
    extend: {
      colors: {
        textAccent: "var(--textColorAccent)",
        textPrimary: "var(--textColorPrimary)",
        textTertiary: "var(--textColorTertiary)",
        textDimmed: "var(--textColorDimmed)",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
```

**v4 스타일로 전환**:

```css
/* tailwind.css에 통합 */
@import "tailwindcss";

@theme {
  /* 폰트 설정 */
  --font-sans: Roboto, Helvetica, Arial, sans-serif;

  /* 커스텀 색상 (CSS 변수 참조) */
  --color-text-accent: var(--textColorAccent);
  --color-text-primary: var(--textColorPrimary);
  --color-text-tertiary: var(--textColorTertiary);
  --color-text-dimmed: var(--textColorDimmed);
}

/* 다크 모드는 HTML 클래스로 제어 */
@custom-variant dark (&:where(.dark, .dark *));
```

**장점**:

- JavaScript 설정 파일 제거
- CSS-first 설정으로 더 빠른 빌드
- Tailwind v4 공식 권장 방식

**단점**:

- 기존 `tailwind.config.js` 사용 중인 경우 마이그레이션 필요
- 일부 플러그인 호환성 이슈 가능

---

## ❓ 사용자 의사결정 지점

### 🔄 컴포넌트 교체 전략

#### 옵션 A: 완전 교체 방식

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
방법: Storybook 컴포넌트를 그대로 설치하고 기존 컴포넌트 완전 대체

장점:
  - 일관된 디자인 시스템
  - 유지보수 용이
  - 장기적으로 코드베이스 간소화

단점:
  - 초기 통합 작업 필요
  - 기존 코드와 충돌 가능성
  - 대규모 테스트 필요

권장 상황:
  - 새로 만드는 기능
  - 대규모 리팩토링 계획이 있는 영역
  - 레거시 코드 정리 시기
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 옵션 B: 점진적 마이그레이션 방식 ⭐ (권장)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
방법: UI 개선 시마다 해당 컴포넌트만 Storybook에서 가져와 교체

장점:
  - 위험 최소화
  - 기존 기능 영향 없음
  - 자연스러운 전환
  - 점진적 학습 곡선

단점:
  - 일시적으로 스타일 혼재 가능
  - 전환 기간이 길어질 수 있음

권장 상황:
  - 대부분의 경우 (위험 관리 중요)
  - 안정성이 최우선인 프로젝트
  - 팀 학습 기간이 필요한 경우
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 🎯 초기 적용 범위

#### 최소 구현: Phase 1만 실행 ⭐ (권장)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
작업 시간: 1시간 5분

포함 내용:
  1. Tailwind CSS 엔트리 파일 생성
  2. Webpack 설정 분리
  3. Tailwind CSS import 추가
  4. 빌드 테스트 및 검증

효과:
  - Tailwind v4 사용 준비 완료
  - 기존 코드 영향 없음
  - 언제든지 Tailwind 클래스 사용 가능

다음 단계:
  - UI 개선 요구 발생 시 Tailwind + Storybook 사용 시작
  - 실제 필요에 따라 컴포넌트 점진적 교체

권장 이유:
  - 최소 리스크
  - 환경만 먼저 구축하고 실제 사용은 점진적으로
  - 기존 개발 작업에 방해 없음
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 표준 구현: Phase 1 + 첫 번째 컴포넌트 교체

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
작업 시간: 3-4시간

포함 내용:
  1. Phase 1 전체 (1시간)
  2. Button 컴포넌트 교체 (2-3시간)
     - Storybook에서 Button 설치
     - 기존 Button 사용처 확인
     - 통합 테스트
     - 스타일 조정

효과:
  - 실제 작동 확인
  - 마이그레이션 프로세스 검증
  - 팀 학습 기회

다음 단계:
  - 검증된 프로세스로 추가 컴포넌트 점진적 교체
  - UI 개선 계획에 따라 우선순위대로 진행

권장 상황:
  - 빠른 피드백이 필요한 경우
  - 프로세스 검증이 중요한 경우
  - 즉시 사용 가능한 컴포넌트가 필요한 경우
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ 계획 실행 체크리스트

### Phase 1 실행 전 확인사항

```
□ Git 작업 디렉토리 클린 상태 확인
□ packages/core/package.json에 의존성 확인
  - tailwindcss: ^4.1.13
  - @tailwindcss/postcss: ^4.1.13
  - postcss-loader: ^8.2.0
□ 기존 Sass 파일 사용 현황 파악
□ Webpack 설정 백업
□ 개발 환경 테스트 가능 상태
```

### Phase 1 실행 중 확인사항

```
단계 1: Tailwind CSS 파일 생성
  □ packages/core/src/renderer/tailwind.css 생성
  □ @import "tailwindcss" 포함
  □ @theme 블록에 기존 CSS 변수 참조

단계 2: Webpack 설정 수정
  □ tailwindCssWebpackRule() 함수 추가
  □ .css와 .scss 규칙 분리
  □ module.rules에 tailwindCssWebpackRule() 추가

단계 3: Tailwind import 추가
  □ library.ts에 import "./tailwind.css" 추가

단계 4: 빌드 및 검증
  □ pnpm build 성공
  □ 개발 서버 실행 성공
  □ Tailwind 클래스 테스트 성공
  □ 기존 Sass 스타일 정상 작동
```

### Phase 1 완료 후 확인사항

```
□ 모든 빌드 에러 해결
□ Tailwind 클래스가 브라우저에서 정상 작동
□ 기존 Sass 스타일 영향 없음
□ Hot reload 정상 작동
□ Git 커밋 (feat: setup Tailwind v4 + Sass separation)
```

---

## 📋 최종 요약

### 핵심 전략

```
실용적 마이그레이션: Tailwind v4 + Sass 분리 환경 구축
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 현재 상태:
  - Tailwind v4 설치됨, 실제 사용 안 함
  - Sass 환경 구축됨
  - shadcn-storybook-registry 컴포넌트 보유 (46/51)

🎯 목표:
  - Sass와 Tailwind 완전 분리
  - 점진적으로 Storybook 컴포넌트 교체
  - 안정성 유지하며 최신 기술 도입

🚨 Phase 1 필수 작업 (1시간 5분):
  1. tailwind.css 파일 생성 - 10분
  2. Webpack 규칙 분리 - 30분
  3. Tailwind import 추가 - 5분
  4. 빌드 테스트 및 검증 - 20분

💡 Phase 2 옵션 작업:
  1. Storybook 컴포넌트 설치 스크립트 - 1시간
  2. UI 개선 우선순위 목록 - 30분
  3. Tailwind 설정 CSS 전환 - 45분

🎯 권장 접근:
  - Phase 1만 먼저 실행 (환경 구축 우선)
  - UI 개선 요구 발생 시 점진적으로 컴포넌트 교체
  - 검증된 프로세스로 안정적 마이그레이션
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔍 추가 참고 자료

### Tailwind v4 공식 문서

- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Installing Tailwind CSS with PostCSS](https://tailwindcss.com/docs/installation/using-postcss)

### 관련 이슈 및 토론

- [Tailwind v4 + Sass not working in Webpack](https://stackoverflow.com/questions/79551269/tailwindcss-v4-with-sass-not-working-in-webpack)
- [After update to 4.0, setup with webpack no more works](https://github.com/tailwindlabs/tailwindcss/discussions/15790)

### shadcn-storybook-registry 문서

- `/Users/tw.kim/Documents/AGA/test/shadcn-storybook-registry/CLAUDE.md`
- `/Users/tw.kim/Documents/AGA/test/shadcn-storybook-registry/README.md`

---

**문서 버전**: 1.0 **최종 업데이트**: 2025-01-15 **상태**: 승인 대기 중
