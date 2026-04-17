# shadcn/ui Storybook Registry 아키텍처 문서

> **Next-Generation UI Component System** - shadcn/ui 컴포넌트를 위한 대화형
> Storybook 레지스트리

shadcn/ui 스토리북 레지스트리는 60개 이상의 UI 컴포넌트와 디자인 토큰을
문서화하고 배포하는 통합 시스템입니다.

## 📚 프로젝트 개요

### 🎯 [시스템 소개](https://github.com/lloydrichards/shadcn-storybook-registry)

**shadcn/ui + Storybook + Registry의 완벽한 통합**

- Storybook 9로 구현된 컴포넌트 문서화 시스템
- shadcn CLI를 통한 스토리 설치 지원
- 95.2% 컴포넌트 커버리지 (60/63)
- Next.js 15 + TypeScript + Tailwind CSS v4

### 사용 방법

```bash
# 개별 컴포넌트 스토리 설치
npx shadcn@latest add @storybook/button-story

# 로컬 테스트
npx shadcn@latest add http://localhost:3000/v2/r/button-story.json
```

## 🏗️ 스토리북 구조

### Atomic Design 기반 디렉토리 구조

```
src/registry/
├── atoms/          # UI 컴포넌트 (60개)
├── tokens/         # 디자인 토큰 (6개)
├── foundation/     # 기반 컴포넌트 (1개)
└── templates/      # 템플릿 예제 (1개)
```

### Registry 시스템

- **registry.json**: 모든 컴포넌트의 메타데이터 관리
- **registryDependencies**: shadcn/ui 컴포넌트 의존성
- **dependencies**: 외부 npm 패키지 의존성
- **자동 빌드**: `npm run registry:build`로 JSON 생성

## 🎨 디자인 토큰

**OKLCH 색상 시스템 기반 Tailwind CSS v4 토큰**

### ⚠️ 중요: 디자인 토큰 사용 원칙

**모든 컴포넌트와 템플릿은 반드시 Storybook에 정의된 디자인 토큰을 사용해야
합니다.**

- ❌ 임의의 값 사용 금지: `text-[28px]`, `h-[400px]`, `max-w-[1625px]` 등
- ✅ 디자인 토큰 사용: `text-2xl`, `text-3xl`, `p-4`, `gap-6` 등
- 일관성과 유지보수성을 위해 하드코딩된 값은 피하고 표준 토큰을 활용하세요.

### Typography 토큰

- **Font Size**: `text-xs` (12px), `text-sm` (14px), `text-base` (16px),
  `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px),
  `text-4xl` (36px), `text-5xl` (48px), `text-6xl` (60px)
- **Font Weight**: `font-thin`, `font-light`, `font-normal`, `font-medium`,
  `font-semibold`, `font-bold`, `font-extrabold`
- **Letter Spacing**: `tracking-tighter`, `tracking-tight`, `tracking-normal`,
  `tracking-wide`, `tracking-wider`

### Spacing 토큰

- Tailwind 표준 시스템 사용 (1 단위 = 4px)
- 예시: `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px),
  `p-8` (32px), `p-12` (48px)

| 토큰명                                                                                   | 설명                               | 소스코드 경로                                                                                      |
| ---------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| **[Color](./src/registry/tokens/color-story/color.stories.tsx)**                         | OKLCH 색상 팔레트 및 테마 시스템   | [`color.stories.tsx`](./src/registry/tokens/color-story/color.stories.tsx)                         |
| **[Typography](./src/registry/tokens/typography-story/typography.stories.tsx)**          | 타이포그래피 스케일 및 폰트 시스템 | [`typography.stories.tsx`](./src/registry/tokens/typography-story/typography.stories.tsx)          |
| **[Spacing](./src/registry/tokens/spacing-story/spacing.stories.tsx)**                   | 간격 및 여백 토큰 시스템           | [`spacing.stories.tsx`](./src/registry/tokens/spacing-story/spacing.stories.tsx)                   |
| **[Shadow](./src/registry/tokens/shadow-story/shadow.stories.tsx)**                      | 그림자 효과 토큰                   | [`shadow.stories.tsx`](./src/registry/tokens/shadow-story/shadow.stories.tsx)                      |
| **[Radius](./src/registry/tokens/radius-story/radius.stories.tsx)**                      | 테두리 반경 토큰                   | [`radius.stories.tsx`](./src/registry/tokens/radius-story/radius.stories.tsx)                      |
| **[Theme Preview](./src/registry/tokens/theme-preview-story/theme-preview.stories.tsx)** | 라이트/다크 테마 프리뷰            | [`theme-preview.stories.tsx`](./src/registry/tokens/theme-preview-story/theme-preview.stories.tsx) |

## 🧩 UI 컴포넌트

### 핵심 컴포넌트 (60개)

#### 레이아웃 & 컨테이너

| 컴포넌트                                                                             | 설명                     | 소스코드                                                                                       | 주요 Props         |
| ------------------------------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------ |
| **[Accordion](./src/registry/atoms/accordion-story/accordion.stories.tsx)**          | 접을 수 있는 콘텐츠 섹션 | [`accordion.stories.tsx`](./src/registry/atoms/accordion-story/accordion.stories.tsx)          | type, collapsible  |
| **[Aspect Ratio](./src/registry/atoms/aspect-ratio-story/aspect-ratio.stories.tsx)** | 반응형 종횡비 컨테이너   | [`aspect-ratio.stories.tsx`](./src/registry/atoms/aspect-ratio-story/aspect-ratio.stories.tsx) | ratio              |
| **[Card](./src/registry/atoms/card-story/card.stories.tsx)**                         | 콘텐츠 카드 컨테이너     | [`card.stories.tsx`](./src/registry/atoms/card-story/card.stories.tsx)                         | className          |
| **[Collapsible](./src/registry/atoms/collapsible-story/collapsible.stories.tsx)**    | 접히는 콘텐츠 영역       | [`collapsible.stories.tsx`](./src/registry/atoms/collapsible-story/collapsible.stories.tsx)    | open, onOpenChange |
| **[Resizable](./src/registry/atoms/resizable-story/resizable.stories.tsx)**          | 크기 조절 가능한 패널    | [`resizable.stories.tsx`](./src/registry/atoms/resizable-story/resizable.stories.tsx)          | direction          |
| **[Scroll Area](./src/registry/atoms/scroll-area-story/scroll-area.stories.tsx)**    | 커스텀 스크롤바 영역     | [`scroll-area.stories.tsx`](./src/registry/atoms/scroll-area-story/scroll-area.stories.tsx)    | type               |
| **[Separator](./src/registry/atoms/separator-story/separator.stories.tsx)**          | 시각적 구분선            | [`separator.stories.tsx`](./src/registry/atoms/separator-story/separator.stories.tsx)          | orientation        |

#### 입력 & 폼

| 컴포넌트                                                                             | 설명                 | 소스코드                                                                                       | 주요 Props               |
| ------------------------------------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------ |
| **[Button](./src/registry/atoms/button-story/button.stories.tsx)**                   | 다양한 스타일의 버튼 | [`button.stories.tsx`](./src/registry/atoms/button-story/button.stories.tsx)                   | variant, size            |
| **[Button Group](./src/registry/atoms/button-group-story/button-group.stories.tsx)** | 버튼 그룹 레이아웃   | [`button-group.stories.tsx`](./src/registry/atoms/button-group-story/button-group.stories.tsx) | orientation              |
| **[Checkbox](./src/registry/atoms/checkbox-story/checkbox.stories.tsx)**             | 체크박스 입력        | [`checkbox.stories.tsx`](./src/registry/atoms/checkbox-story/checkbox.stories.tsx)             | checked, onCheckedChange |
| **[Field](./src/registry/atoms/field-story/field.stories.tsx)**                      | 폼 필드 컨테이너     | [`field.stories.tsx`](./src/registry/atoms/field-story/field.stories.tsx)                      | error, required          |
| **[Form](./src/registry/atoms/form-story/form.stories.tsx)**                         | React Hook Form 통합 | [`form.stories.tsx`](./src/registry/atoms/form-story/form.stories.tsx)                         | schema, onSubmit         |
| **[Input](./src/registry/atoms/input-story/input.stories.tsx)**                      | 텍스트 입력 필드     | [`input.stories.tsx`](./src/registry/atoms/input-story/input.stories.tsx)                      | type, placeholder        |
| **[Input Group](./src/registry/atoms/input-group-story/input-group.stories.tsx)**    | 입력 필드 그룹       | [`input-group.stories.tsx`](./src/registry/atoms/input-group-story/input-group.stories.tsx)    | addon                    |
| **[Input OTP](./src/registry/atoms/input-otp-story/input-otp.stories.tsx)**          | OTP 입력 필드        | [`input-otp.stories.tsx`](./src/registry/atoms/input-otp-story/input-otp.stories.tsx)          | length                   |
| **[Label](./src/registry/atoms/label-story/label.stories.tsx)**                      | 폼 레이블            | [`label.stories.tsx`](./src/registry/atoms/label-story/label.stories.tsx)                      | htmlFor                  |
| **[Radio Group](./src/registry/atoms/radio-group-story/radio-group.stories.tsx)**    | 라디오 버튼 그룹     | [`radio-group.stories.tsx`](./src/registry/atoms/radio-group-story/radio-group.stories.tsx)    | value, onValueChange     |
| **[Select](./src/registry/atoms/select-story/select.stories.tsx)**                   | 선택 드롭다운        | [`select.stories.tsx`](./src/registry/atoms/select-story/select.stories.tsx)                   | value, onValueChange     |
| **[Slider](./src/registry/atoms/slider-story/slider.stories.tsx)**                   | 범위 슬라이더        | [`slider.stories.tsx`](./src/registry/atoms/slider-story/slider.stories.tsx)                   | min, max, step           |
| **[Switch](./src/registry/atoms/switch-story/switch.stories.tsx)**                   | 토글 스위치          | [`switch.stories.tsx`](./src/registry/atoms/switch-story/switch.stories.tsx)                   | checked, onCheckedChange |
| **[Textarea](./src/registry/atoms/textarea-story/textarea.stories.tsx)**             | 여러 줄 텍스트 입력  | [`textarea.stories.tsx`](./src/registry/atoms/textarea-story/textarea.stories.tsx)             | rows                     |
| **[Toggle](./src/registry/atoms/toggle-story/toggle.stories.tsx)**                   | 토글 버튼            | [`toggle.stories.tsx`](./src/registry/atoms/toggle-story/toggle.stories.tsx)                   | pressed, onPressedChange |
| **[Toggle Group](./src/registry/atoms/toggle-group-story/toggle-group.stories.tsx)** | 토글 버튼 그룹       | [`toggle-group.stories.tsx`](./src/registry/atoms/toggle-group-story/toggle-group.stories.tsx) | type, value              |

#### 날짜 & 시간

| 컴포넌트                                                                                                              | 설명                | 소스코드                                                                                                                        | 주요 Props       |
| --------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **[Calendar](./src/registry/atoms/calendar-story/calendar.stories.tsx)**                                              | 날짜 선택 달력      | [`calendar.stories.tsx`](./src/registry/atoms/calendar-story/calendar.stories.tsx)                                              | mode, selected   |
| **[Calendar Form](./src/registry/atoms/calendar-form-story/calendar-form.stories.tsx)**                               | 폼 통합 달력        | [`calendar-form.stories.tsx`](./src/registry/atoms/calendar-form-story/calendar-form.stories.tsx)                               | validation       |
| **[Date of Birth Picker](./src/registry/atoms/date-of-birth-picker-story/date-of-birth-picker.stories.tsx)**          | 생년월일 선택기     | [`date-of-birth-picker.stories.tsx`](./src/registry/atoms/date-of-birth-picker-story/date-of-birth-picker.stories.tsx)          | minYear, maxYear |
| **[Date Picker](./src/registry/atoms/date-picker-story/date-picker.stories.tsx)**                                     | 날짜 선택기         | [`date-picker.stories.tsx`](./src/registry/atoms/date-picker-story/date-picker.stories.tsx)                                     | placeholder      |
| **[Date Time Picker](./src/registry/atoms/date-time-picker-story/date-time-picker.stories.tsx)**                      | 날짜/시간 선택기    | [`date-time-picker.stories.tsx`](./src/registry/atoms/date-time-picker-story/date-time-picker.stories.tsx)                      | granularity      |
| **[Month Year Selector](./src/registry/atoms/month-year-selector-story/month-year-selector.stories.tsx)**             | 월/년도 선택기      | [`month-year-selector.stories.tsx`](./src/registry/atoms/month-year-selector-story/month-year-selector.stories.tsx)             | defaultValue     |
| **[Natural Language Picker](./src/registry/atoms/natural-language-picker-story/natural-language-picker.stories.tsx)** | 자연어 날짜 입력    | [`natural-language-picker.stories.tsx`](./src/registry/atoms/natural-language-picker-story/natural-language-picker.stories.tsx) | placeholder      |
| **[Range Calendar](./src/registry/atoms/range-calendar-story/range-calendar.stories.tsx)**                            | 날짜 범위 선택 달력 | [`range-calendar.stories.tsx`](./src/registry/atoms/range-calendar-story/range-calendar.stories.tsx)                            | from, to         |

#### 네비게이션 & 메뉴

| 컴포넌트                                                                                      | 설명              | 소스코드                                                                                                | 주요 Props   |
| --------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| **[Breadcrumb](./src/registry/atoms/breadcrumb-story/breadcrumb.stories.tsx)**                | 경로 탐색 표시    | [`breadcrumb.stories.tsx`](./src/registry/atoms/breadcrumb-story/breadcrumb.stories.tsx)                | separator    |
| **[Command](./src/registry/atoms/command-story/command.stories.tsx)**                         | 명령 팔레트       | [`command.stories.tsx`](./src/registry/atoms/command-story/command.stories.tsx)                         | open         |
| **[Context Menu](./src/registry/atoms/context-menu-story/context-menu.stories.tsx)**          | 우클릭 메뉴       | [`context-menu.stories.tsx`](./src/registry/atoms/context-menu-story/context-menu.stories.tsx)          | onOpenChange |
| **[Dropdown Menu](./src/registry/atoms/dropdown-menu-story/dropdown-menu.stories.tsx)**       | 드롭다운 메뉴     | [`dropdown-menu.stories.tsx`](./src/registry/atoms/dropdown-menu-story/dropdown-menu.stories.tsx)       | align        |
| **[Menubar](./src/registry/atoms/menubar-story/menubar.stories.tsx)**                         | 메뉴바            | [`menubar.stories.tsx`](./src/registry/atoms/menubar-story/menubar.stories.tsx)                         | value        |
| **[Navigation Menu](./src/registry/atoms/navigation-menu-story/navigation-menu.stories.tsx)** | 네비게이션 메뉴   | [`navigation-menu.stories.tsx`](./src/registry/atoms/navigation-menu-story/navigation-menu.stories.tsx) | orientation  |
| **[Pagination](./src/registry/atoms/pagination-story/pagination.stories.tsx)**                | 페이지네이션      | [`pagination.stories.tsx`](./src/registry/atoms/pagination-story/pagination.stories.tsx)                | page, total  |
| **[Sidebar](./src/registry/atoms/sidebar-story/sidebar.stories.tsx)**                         | 사이드바 레이아웃 | [`sidebar.stories.tsx`](./src/registry/atoms/sidebar-story/sidebar.stories.tsx)                         | collapsible  |
| **[Tabs](./src/registry/atoms/tabs-story/tabs.stories.tsx)**                                  | 탭 네비게이션     | [`tabs.stories.tsx`](./src/registry/atoms/tabs-story/tabs.stories.tsx)                                  | defaultValue |

#### 피드백 & 오버레이

| 컴포넌트                                                                             | 설명               | 소스코드                                                                                       | 주요 Props         |
| ------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------- | ------------------ |
| **[Alert](./src/registry/atoms/alert-story/alert.stories.tsx)**                      | 알림 메시지        | [`alert.stories.tsx`](./src/registry/atoms/alert-story/alert.stories.tsx)                      | variant            |
| **[Alert Dialog](./src/registry/atoms/alert-dialog-story/alert-dialog.stories.tsx)** | 확인 대화 상자     | [`alert-dialog.stories.tsx`](./src/registry/atoms/alert-dialog-story/alert-dialog.stories.tsx) | open               |
| **[Badge](./src/registry/atoms/badge-story/badge.stories.tsx)**                      | 상태 표시 뱃지     | [`badge.stories.tsx`](./src/registry/atoms/badge-story/badge.stories.tsx)                      | variant            |
| **[Dialog](./src/registry/atoms/dialog-story/dialog.stories.tsx)**                   | 모달 대화 상자     | [`dialog.stories.tsx`](./src/registry/atoms/dialog-story/dialog.stories.tsx)                   | open, onOpenChange |
| **[Drawer](./src/registry/atoms/drawer-story/drawer.stories.tsx)**                   | 슬라이드 패널      | [`drawer.stories.tsx`](./src/registry/atoms/drawer-story/drawer.stories.tsx)                   | position           |
| **[Empty](./src/registry/atoms/empty-story/empty.stories.tsx)**                      | 빈 상태 표시       | [`empty.stories.tsx`](./src/registry/atoms/empty-story/empty.stories.tsx)                      | icon, title        |
| **[Hover Card](./src/registry/atoms/hover-card-story/hover-card.stories.tsx)**       | 호버 정보 카드     | [`hover-card.stories.tsx`](./src/registry/atoms/hover-card-story/hover-card.stories.tsx)       | openDelay          |
| **[Popover](./src/registry/atoms/popover-story/popover.stories.tsx)**                | 팝오버             | [`popover.stories.tsx`](./src/registry/atoms/popover-story/popover.stories.tsx)                | align, side        |
| **[Progress](./src/registry/atoms/progress-story/progress.stories.tsx)**             | 진행률 표시        | [`progress.stories.tsx`](./src/registry/atoms/progress-story/progress.stories.tsx)             | value              |
| **[Sheet](./src/registry/atoms/sheet-story/sheet.stories.tsx)**                      | 슬라이드 오버 패널 | [`sheet.stories.tsx`](./src/registry/atoms/sheet-story/sheet.stories.tsx)                      | side               |
| **[Skeleton](./src/registry/atoms/skeleton-story/skeleton.stories.tsx)**             | 로딩 스켈레톤      | [`skeleton.stories.tsx`](./src/registry/atoms/skeleton-story/skeleton.stories.tsx)             | className          |
| **[Sonner](./src/registry/atoms/sonner-story/sonner.stories.tsx)**                   | 토스트 알림        | [`sonner.stories.tsx`](./src/registry/atoms/sonner-story/sonner.stories.tsx)                   | position           |
| **[Spinner](./src/registry/atoms/spinner-story/spinner.stories.tsx)**                | 로딩 스피너        | [`spinner.stories.tsx`](./src/registry/atoms/spinner-story/spinner.stories.tsx)                | size               |
| **[Tooltip](./src/registry/atoms/tooltip-story/tooltip.stories.tsx)**                | 툴팁               | [`tooltip.stories.tsx`](./src/registry/atoms/tooltip-story/tooltip.stories.tsx)                | delayDuration      |

#### 데이터 & 기타

| 컴포넌트                                                                       | 설명                   | 소스코드                                                                                 | 주요 Props    |
| ------------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| **[Avatar](./src/registry/atoms/avatar-story/avatar.stories.tsx)**             | 사용자 아바타          | [`avatar.stories.tsx`](./src/registry/atoms/avatar-story/avatar.stories.tsx)             | fallback      |
| **[Carousel](./src/registry/atoms/carousel-story/carousel.stories.tsx)**       | 이미지 캐러셀          | [`carousel.stories.tsx`](./src/registry/atoms/carousel-story/carousel.stories.tsx)       | orientation   |
| **[Combobox](./src/registry/atoms/combobox-story/combobox.stories.tsx)**       | 자동완성 선택기        | [`combobox.stories.tsx`](./src/registry/atoms/combobox-story/combobox.stories.tsx)       | placeholder   |
| **[Data Table](./src/registry/atoms/data-table-story/data-table.stories.tsx)** | 고급 데이터 테이블     | [`data-table.stories.tsx`](./src/registry/atoms/data-table-story/data-table.stories.tsx) | columns, data |
| **[Item](./src/registry/atoms/item-story/item.stories.tsx)**                   | 다목적 아이템 컴포넌트 | [`item.stories.tsx`](./src/registry/atoms/item-story/item.stories.tsx)                   | variant, size |
| **[Kbd](./src/registry/atoms/kbd-story/kbd.stories.tsx)**                      | 키보드 단축키 표시     | [`kbd.stories.tsx`](./src/registry/atoms/kbd-story/kbd.stories.tsx)                      | keys          |
| **[Table](./src/registry/atoms/table-story/table.stories.tsx)**                | 기본 테이블            | [`table.stories.tsx`](./src/registry/atoms/table-story/table.stories.tsx)                | className     |

## 📊 차트 컴포넌트

**Recharts 기반 대화형 차트 컴포넌트 (5개)**

| 차트 타입                                                                          | 설명        | 소스코드                                                                                      | 주요 변형                      |
| ---------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- | ------------------------------ |
| **[Area Chart](./src/registry/atoms/area-chart-story/area-charts.stories.tsx)**    | 영역 차트   | [`area-charts.stories.tsx`](./src/registry/atoms/area-chart-story/area-charts.stories.tsx)    | stacked, gradient, interactive |
| **[Bar Chart](./src/registry/atoms/bar-chart-story/bar-charts.stories.tsx)**       | 막대 차트   | [`bar-charts.stories.tsx`](./src/registry/atoms/bar-chart-story/bar-charts.stories.tsx)       | horizontal, stacked, mixed     |
| **[Line Chart](./src/registry/atoms/line-chart-story/line-charts.stories.tsx)**    | 선 차트     | [`line-charts.stories.tsx`](./src/registry/atoms/line-chart-story/line-charts.stories.tsx)    | dots, multiple, step           |
| **[Pie Chart](./src/registry/atoms/pie-chart-story/pie-charts.stories.tsx)**       | 파이 차트   | [`pie-charts.stories.tsx`](./src/registry/atoms/pie-chart-story/pie-charts.stories.tsx)       | donut, label, interactive      |
| **[Radar Chart](./src/registry/atoms/radar-chart-story/radar-charts.stories.tsx)** | 레이더 차트 | [`radar-charts.stories.tsx`](./src/registry/atoms/radar-chart-story/radar-charts.stories.tsx) | grid styles, legend            |

## 🏛️ 파운데이션 컴포넌트

| 컴포넌트                                                                                                  | 설명                                                | 소스코드                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **[Typography Components](./src/registry/foundation/typography-components-story/typography.stories.tsx)** | 일관된 텍스트 스타일링을 위한 타이포그래피 컴포넌트 | [`typography.stories.tsx`](./src/registry/foundation/typography-components-story/typography.stories.tsx) |

## 📋 템플릿

| 템플릿                                                                                               | 설명                                                      | 소스코드                                                                                                       | 포함 컴포넌트                                     |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **[Dashboard Template](./src/registry/templates/dashboard-template/dashboard-template.stories.tsx)** | 다양한 shadcn/ui 컴포넌트를 활용한 완전한 대시보드 템플릿 | [`dashboard-template.stories.tsx`](./src/registry/templates/dashboard-template/dashboard-template.stories.tsx) | card, select, button, input, avatar, table, badge |

## 🔧 기술 스택

### 프레임워크 & 라이브러리

- **Next.js 15**: React 프레임워크 (Turbopack 지원)
- **React 19**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Storybook 9**: 컴포넌트 문서화 (Vite 빌더)
- **Tailwind CSS v4**: 유틸리티 중심 CSS (디자인 토큰 지원)

### 테스팅 & 품질

- **Vitest**: 이중 프로젝트 설정 (유닛 + Storybook 브라우저 테스트)
- **Playwright**: Storybook 통합 테스트
- **ESLint & Prettier**: 코드 품질 및 포맷팅
- **Semantic Release**: 자동화된 버전 관리

### 주요 의존성

- **Radix UI**: 접근성 준수 헤드리스 컴포넌트
- **Recharts**: 차트 라이브러리
- **React Hook Form + Zod**: 폼 관리 및 검증
- **lucide-react**: 아이콘 라이브러리
- **date-fns**: 날짜 유틸리티

## 📈 프로젝트 현황

### 구현 통계

- **전체 레지스트리 항목**: 75개
- **UI 컴포넌트**: 60개 (95.2% 커버리지)
- **디자인 토큰**: 6개
- **차트 컴포넌트**: 5개
- **파운데이션**: 1개
- **템플릿**: 1개
- **유틸리티**: 1개 (all-stories)

### 카테고리별 분포

```
atoms (UI)     ████████████████████ 60
tokens         ██ 6
charts         ██ 5
foundation     ▌ 1
templates      ▌ 1
utility        ▌ 1
```

### 최근 추가 컴포넌트

- Button Group - 버튼 그룹 레이아웃
- Empty - 빈 상태 표시
- Field - 폼 필드 컨테이너
- Input Group - 입력 필드 그룹
- Item - 다목적 아이템 컴포넌트
- Kbd - 키보드 단축키 표시
- Spinner - 로딩 스피너

## 🔗 관련 문서

- **[프로젝트 가이드](../CLAUDE.md)** - 개발 규칙 및 코딩 표준
- **[기여 가이드](../CONTRIBUTING.md)** - 기여 방법 (예정)
- **[API 문서](../api/)** - 컴포넌트 API 참조 (예정)
- **[마이그레이션 가이드](../migration/)** - 버전 업그레이드 가이드 (예정)

## 📝 빠른 참조

### 개발 명령어

```bash
# 개발 서버
npm run dev          # Next.js (Turbopack)
npm run storybook    # Storybook (포트 6006)

# 빌드
npm run build        # 전체 빌드
npm run registry:build # 레지스트리 JSON 생성

# 테스트
npm run test         # 모든 테스트
npm run test:unit    # 유닛 테스트
npm run test:storybook # Storybook 테스트
```

### 컴포넌트 추가 워크플로우

1. `src/registry/atoms/[component-name]/` 디렉토리 생성
2. `[component].stories.tsx` 파일 작성
3. `registry.json`에 메타데이터 추가
4. `npm run registry:build` 실행
5. 로컬 테스트 후 커밋

---

_이 문서는 shadcn/ui Storybook Registry의 포괄적인 아키텍처 가이드입니다. 각
컴포넌트 링크를 통해 소스코드를 직접 확인할 수 있으며, LLM이 프로젝트 구조를
빠르게 이해하고 탐색할 수 있도록 설계되었습니다._

**📅 최종 업데이트**: 2025년 1월 15일  
**📝 문서 버전**: v1.0  
**🔄 다음 업데이트**: 신규 컴포넌트 추가 시
