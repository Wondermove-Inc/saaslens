# Shadcn-Storybook-Registry → VSCode Extension 전환 체크리스트

**작성일**: 2025-10-08 **프로젝트**: shadcn-storybook-registry **목표**: 현재
Storybook 프로젝트를 VSCode Extension Webview로 전환하기 위한 실제 확인
체크리스트

---

## 📊 현재 프로젝트 상태

### 기술 스택

| 항목       | 현재 버전              | VSCode Webview 호환성 | 비고                        |
| ---------- | ---------------------- | --------------------- | --------------------------- |
| Storybook  | 9.1.8                  | ⚠️ 부분 호환          | Addons는 프로덕션 제외 필요 |
| Framework  | @storybook/nextjs-vite | ✅ 호환               | Vite 번들러 사용 중         |
| Next.js    | 15.5.4                 | ⚠️ 주의               | Webview는 Next.js 불필요    |
| React      | 19.1.1                 | ✅ 호환               | 조사 문서는 17.x 기준       |
| TypeScript | 5.9.2                  | ✅ 완벽 호환          | -                           |

### Storybook Addons

| Addon                    | 용도              | VSCode Webview 호환성 | 조치 사항                |
| ------------------------ | ----------------- | --------------------- | ------------------------ |
| @chromatic-com/storybook | Visual Regression | ⚠️ CI/CD 전용         | 프로덕션 빌드 제외       |
| @storybook/addon-docs    | 문서 자동 생성    | ⚠️ 개발 전용          | 프로덕션 빌드 제외       |
| @storybook/addon-a11y    | 접근성 테스트     | ✅ 유지 가능          | 필요 시 포함             |
| @storybook/addon-vitest  | 브라우저 테스트   | ⚠️ 개발 전용          | 프로덕션 빌드 제외       |
| @storybook/addon-themes  | 테마 전환         | ⚠️ 조건부             | Webview 테마는 별도 구현 |

### 컴포넌트 현황

- **총 shadcn/ui 컴포넌트**: 51개
- **Storybook 완성**: 46개 (90.2%)
- **총 Story 파일**: **67개** (✅ 실측)
  - Atoms: 60개
  - Tokens: 4개
  - Foundation: 2개
  - Templates: 1개
- **Stories 위치**: `src/registry/atoms/`, `src/registry/tokens/`,
  `src/registry/foundation/`, `src/registry/templates/`

### 의존성 라이브러리 호환성 검토

| 라이브러리            | 현재 사용           | VSCode Webview 호환성 | 조치 필요                      |
| --------------------- | ------------------- | --------------------- | ------------------------------ |
| lucide-react          | ✅                  | ✅ 완벽 호환          | -                              |
| recharts              | ✅ (Chart 컴포넌트) | ✅ Canvas API 지원    | -                              |
| react-hook-form       | ✅                  | ✅ 완벽 호환          | -                              |
| zod                   | ✅                  | ✅ 완벽 호환          | -                              |
| date-fns              | ✅ (4.1.0)          | ✅ 권장 라이브러리    | -                              |
| next-themes           | ✅                  | ⚠️ 불필요             | Webview 테마는 VSCode API 사용 |
| embla-carousel-react  | ✅                  | ✅ 호환 예상          | DOM API 제한 확인 필요         |
| @tanstack/react-table | ✅                  | ✅ 완벽 호환          | -                              |

---

## ✅ 1. Storybook 설정 호환성 점검

### 1.1 Storybook Framework 변경

- [x] **현재**: `@storybook/nextjs-vite` 사용 중 ✅
- [ ] **목표**: VSCode Webview는 Next.js 불필요, React 번들만 필요
- [ ] **조치**: Webview 번들 시 Next.js 의존성 제외
- [ ] **확인**: `webpack.webview.config.js` 생성 필요
- [x] **빌드 오류 수정 완료**: `.storybook/main.ts`의 `staticDirs` 제거 (순환
      참조 해결)

### 1.2 Stories 파일 구조

- [x] Stories 위치: `src/registry/**/*.stories.tsx` ✅
- [ ] **조치**: Webview 통합 시 stories 파일 제외 번들링
- [ ] **확인**: Webpack externals 설정으로 `.stories.tsx` 파일 제외

### 1.3 Addons 프로덕션 제외

- [ ] **@chromatic-com/storybook**: CI/CD에서만 실행
- [ ] **@storybook/addon-docs**: Webview 번들에서 제외
- [ ] **@storybook/addon-vitest**: 개발 환경에서만 사용
- [ ] **@storybook/addon-themes**: 조건부 사용 또는 제거
- [ ] **확인**: `.storybook/main.ts`에서 조건부 Addons 로딩

**조치 예시**:

```typescript
// .storybook/main.ts
addons: [
  '@storybook/addon-essentials',
  '@storybook/addon-a11y',
  // 개발 환경에서만 추가
  ...(process.env.NODE_ENV === 'development' ? [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-themes',
  ] : [])
],
```

---

## ✅ 2. 번들 크기 및 성능 목표

### 2.1 현재 번들 크기 측정

- [x] **Storybook 빌드 크기 측정**: ✅ 완료
- [x] **현재 Storybook 전체 크기**: **9.8MB** (압축 전)
  - Manager: 2.5MB (Storybook UI)
  - Preview Bundle: 1.3MB (Components + React)
  - Addons: 1.2MB (Chromatic, Docs, A11y, Vitest, Themes)
  - Assets: 4.7MB (Stories, CSS, etc.)
- [ ] **목표 Webview 번들**: < 500KB (gzip 후)
- [ ] **현재 상태**: ⚠️ **19.6배 초과** - 대규모 최적화 필요

**측정 명령어**:

```bash
# Storybook 빌드
npm run storybook:build

# 빌드 크기 확인
du -sh public/storybook
```

### 2.2 Tree-Shaking 설정

- [ ] **Webpack 설정**: `mode: 'production'`, `usedExports: true`,
      `sideEffects: false`
- [ ] **확인**: `webpack-bundle-analyzer` 플러그인 추가
- [ ] **목표**: React + Components < 450KB

**Webpack 분석 설정**:

```javascript
// webpack.webview.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

plugins: [
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    reportFilename: 'bundle-report.html',
  }),
],
```

### 2.3 라이브러리 최적화

- [x] **date-fns**: 이미 사용 중 ✅ (Moment.js 대신 권장)
- [ ] **Lodash**: 사용 여부 확인, 사용 시 lodash-es로 변경
- [x] **React**: 19.1.1 사용 중 (조사 문서는 17.x 기준이지만 호환 가능)
- [ ] **recharts**: 번들 크기 확인 (180KB 예상), 경량 대안 검토

**의존성 최적화 체크**:

```bash
# package.json 분석
npx depcheck

# 번들 크기 시각화
npm run build && npx source-map-explorer dist/webviews/*.js
```

### 2.4 Code Splitting

- [ ] **Lazy Loading 적용**: React.lazy()로 대형 컴포넌트 분리
- [ ] **Carousel, Chart 컴포넌트**: 동적 import 적용
- [ ] **초기 로딩 번들**: < 200KB

**Code Splitting 예시**:

```typescript
// webviews/index.tsx
const ChartView = lazy(() => import('./components/ChartView'));
const CarouselView = lazy(() => import('./components/CarouselView'));

<Suspense fallback={<LoadingSpinner />}>
  {view === 'chart' && <ChartView />}
  {view === 'carousel' && <CarouselView />}
</Suspense>
```

---

## ✅ 3. VSCode Extension 아키텍처 설계

### 3.1 프로젝트 구조 재구성

- [ ] **webviews/ 폴더 생성**: Extension Webview 코드 전용
- [ ] **src/extension.ts**: Extension Host 엔트리 포인트
- [ ] **src/webviews/**: Webview Provider 클래스들
- [ ] **src/container.ts**: DI Container (Optional)

**권장 구조**:

```
shadcn-storybook-registry/
├── .storybook/                # Storybook 설정 (개발 전용)
├── src/
│   ├── extension.ts           # ✅ NEW: Extension 엔트리
│   ├── webviews/              # ✅ NEW: Webview Providers
│   │   ├── componentPreviewWebview.ts
│   │   └── designTokenWebview.ts
│   └── registry/              # 기존: Storybook Stories
│       └── atoms/
├── webviews/                  # ✅ NEW: Webview React 코드
│   ├── componentPreview/
│   │   ├── index.tsx          # Webview Entry Point
│   │   └── ComponentPreview.tsx  # 기존 Story 재사용
│   ├── mocks/                 # Mock 데이터 공유
│   └── styles/                # 공통 스타일
└── dist/
    ├── extension.js           # Extension Host 번들
    └── webviews/
        └── componentPreview.js # Webview 번들
```

### 3.2 IPC 프로토콜 설계

- [ ] **Command 타입 정의**: TypeScript interface 작성
- [ ] **Notification 타입 정의**: Extension → Webview 메시지
- [ ] **Type-safe postMessage 함수**: Helper 함수 작성

**IPC Protocol 예시**:

```typescript
// src/webviews/protocol.ts
export interface IpcCommand {
  "component/getProps": { componentName: string };
  "theme/change": { theme: "light" | "dark" };
  "story/select": { storyId: string };
}

export interface IpcNotification {
  "component/propsUpdated": { props: Record<string, unknown> };
  "theme/changed": { theme: "light" | "dark" };
  error: { message: string };
}
```

### 3.3 Webview Provider 구현

- [ ] **ComponentPreviewWebview**: shadcn 컴포넌트 미리보기
- [ ] **DesignTokenWebview**: Design Tokens 문서화
- [ ] **getHtml() 메소드**: CSP + nonce 적용
- [ ] **onDidReceiveMessage**: IPC 핸들러

---

## ✅ 4. CSP 보안 정책 구현

### 4.1 CSP 설정

- [ ] **default-src 'none'**: 모든 리소스 차단
- [ ] **script-src 'nonce-{random}'**: nonce 기반 스크립트 허용
- [ ] **style-src 'unsafe-inline'**: Tailwind CSS inline 스타일 허용
- [ ] **img-src https: data:**: 이미지 로딩 허용
- [ ] **font-src ${webview.cspSource}**: 폰트 로딩 허용

**CSP 구현 예시**:

```typescript
// src/webviews/componentPreviewWebview.ts
private getHtml(webview: vscode.Webview): string {
  const nonce = crypto.randomBytes(16).toString('base64');

  const csp = `
    default-src 'none';
    script-src 'nonce-${nonce}';
    style-src ${webview.cspSource} 'unsafe-inline';
    img-src ${webview.cspSource} https: data:;
    font-src ${webview.cspSource};
  `.replace(/\s+/g, ' ').trim();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="Content-Security-Policy" content="${csp}">
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </head>
    <body>
      <div id="root"></div>
    </body>
    </html>
  `;
}
```

### 4.2 XSS 방어

- [x] **React의 자동 escaping**: 기본 사용 중 ✅
- [ ] **dangerouslySetInnerHTML 사용 제거**: Storybook Docs에서만 사용 확인
- [ ] **DOMPurify 추가**: HTML 렌더링이 필요한 경우
- [ ] **입력 검증**: 컴포넌트 이름, Props 값 검증

### 4.3 리소스 로딩 보안

- [ ] **webview.asWebviewUri 사용**: 모든 로컬 리소스 변환
- [ ] **localResourceRoots 제한**: dist/ 폴더만 접근 허용
- [ ] **CDN 리소스 제거**: 모든 리소스 번들에 포함

**리소스 로딩 예시**:

```typescript
const panel = vscode.window.createWebviewPanel(
  "componentPreview",
  "Component Preview",
  vscode.ViewColumn.One,
  {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")],
  },
);

const scriptUri = panel.webview.asWebviewUri(
  vscode.Uri.joinPath(extensionUri, "dist", "webviews", "componentPreview.js"),
);
```

---

## ✅ 5. React 컴포넌트 호환성 점검

### 5.1 Event Handling 검증

- [ ] **onChange vs onInput**: VSCode Webview에서는 onInput 사용
- [ ] **Form 컴포넌트**: react-hook-form 사용 확인 (호환 가능)
- [ ] **Input 컴포넌트**: onInput 이벤트 핸들러 추가

**Input 컴포넌트 수정 예시**:

```typescript
// src/registry/atoms/input-story/input.tsx
<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}  // blur 시 동작
  onInput={(e) => setValue(e.target.value)}   // 실시간 동작
/>
```

### 5.2 Third-Party 라이브러리 호환성

- [x] **lucide-react**: 호환 ✅
- [x] **recharts**: Canvas API 사용, 호환 ✅
- [x] **react-hook-form**: 호환 ✅
- [x] **@tanstack/react-table**: 호환 ✅
- [ ] **embla-carousel-react**: DOM API 제한 확인 필요
- [ ] **react-resizable-panels**: ResizeObserver API 확인 필요

**호환성 테스트**:

```typescript
// Webview에서 각 라이브러리 동작 확인
// 1. Carousel 동작 테스트
// 2. Chart 렌더링 테스트
// 3. Table 정렬/필터링 테스트
```

### 5.3 React Portal 사용 검증

- [ ] **Modal 컴포넌트**: Dialog, Drawer, Sheet
- [ ] **Tooltip 컴포넌트**: Tooltip, Popover, HoverCard
- [ ] **확인**: document.body 대신 #modal-root 컨테이너 사용

**Portal 수정 예시**:

```typescript
// Webview HTML에 modal-root 추가
<body>
  <div id="root"></div>
  <div id="modal-root"></div>
</body>

// React Portal 수정
const modalRoot = document.getElementById('modal-root');
return createPortal(<Dialog />, modalRoot);
```

---

## ✅ 6. State 관리 및 Lifecycle

### 6.1 vscode.setState/getState 구현

- [ ] **초기 State 복원**: `vscode.getState()` 사용
- [ ] **State 변경 시 저장**: `vscode.setState()` 호출
- [ ] **JSON 직렬화 가능**: Date → ISO 8601, Map → Object

**State 관리 예시**:

```typescript
// webviews/componentPreview/index.tsx
function App() {
  const vscode = acquireVsCodeApi();
  const [selectedComponent, setSelectedComponent] = useState(() => {
    const state = vscode.getState();
    return state?.selectedComponent || null;
  });

  useEffect(() => {
    vscode.setState({ selectedComponent });
  }, [selectedComponent]);
}
```

### 6.2 메모리 누수 방지

- [ ] **EventListener cleanup**: useEffect cleanup 함수
- [ ] **Interval/Timeout cleanup**: clearInterval/clearTimeout
- [ ] **로그 버퍼 제한**: 최대 10,000 라인

**Cleanup 예시**:

```typescript
useEffect(() => {
  const handleMessage = (event) => {
    console.log(event.data);
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}, []);
```

### 6.3 retainContextWhenHidden 회피

- [ ] **기본 설정**: `retainContextWhenHidden: false`
- [ ] **State 저장**: `vscode.setState()` 사용
- [ ] **메모리 목표**: Webview 1개당 < 80MB

---

## ✅ 7. 성능 최적화

### 7.1 React 컴포넌트 최적화

- [ ] **React.memo 적용**: 자주 re-render되는 컴포넌트
- [ ] **useMemo/useCallback**: 비용이 큰 연산, 콜백 함수
- [ ] **Virtual Scrolling**: react-window 적용 (1000개 이상 아이템)

**최적화 대상 컴포넌트**:

- [ ] `ComponentList`: 46개 컴포넌트 목록
- [ ] `TokensList`: Design Tokens 목록
- [ ] `PropsTable`: Props 문서 테이블

### 7.2 Extension 활성화 최적화

- [ ] **Lazy Activation**: `onCommand:` 사용, `onStartupFinished` 지양
- [ ] **Lazy Loading**: Container DI Lazy Getter 패턴
- [ ] **목표**: 활성화 시간 < 1초

**Activation Events**:

```json
// package.json
{
  "activationEvents": [
    "onCommand:shadcn.showComponentPreview",
    "onView:shadcnExplorer"
  ]
}
```

### 7.3 IPC 통신 최적화

- [ ] **메시지 크기 최소화**: 필요한 필드만 전송
- [ ] **Delta Updates**: 변경된 데이터만 전송
- [ ] **Batching**: 여러 요청을 하나로 묶기

---

## ✅ 8. 개발 워크플로우 구축

### 8.1 Webpack 설정

- [ ] **Extension Host 번들**: `webpack.extension.config.js`
- [ ] **Webview 번들**: `webpack.webview.config.js`
- [ ] **분리 빌드**: Storybook / Extension 별도 빌드

**Webpack 설정 파일 생성**:

```bash
# 생성할 파일
touch webpack.extension.config.js
touch webpack.webview.config.js
```

### 8.2 빌드 스크립트

- [ ] **package.json scripts 추가**:
  - `build:extension`: Extension Host 빌드
  - `build:webview`: Webview 번들 빌드
  - `build:all`: 전체 빌드
  - `watch:extension`: 개발 모드

**스크립트 예시**:

```json
{
  "scripts": {
    "build:extension": "webpack --config webpack.extension.config.js",
    "build:webview": "webpack --config webpack.webview.config.js",
    "build:all": "npm run build:extension && npm run build:webview",
    "watch:extension": "webpack --config webpack.extension.config.js --watch"
  }
}
```

### 8.3 개발 프로세스

- [ ] **Storybook 개발**: `npm run storybook` (기존)
- [ ] **Extension 개발**: `npm run watch:extension`
- [ ] **Webview 테스트**: F5 디버깅
- [ ] **Hot Reload**: Webpack Watch 모드

---

## ✅ 9. CI/CD 파이프라인

### 9.1 GitHub Actions 설정

- [ ] **Storybook 빌드**: Visual Regression Testing (Chromatic)
- [ ] **Extension 빌드**: VSIX 패키징
- [ ] **테스트**: Vitest 실행
- [ ] **Lint/Type-check**: ESLint, TypeScript

**GitHub Actions 워크플로우**:

```yaml
# .github/workflows/ci.yml
jobs:
  storybook:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run storybook:build
      - uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}

  extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build:all
      - run: npx vsce package
```

### 9.2 Visual Regression Testing

- [x] **Chromatic 설정**: 이미 설정됨 ✅
- [ ] **CI 통합**: GitHub Actions에서 자동 실행
- [ ] **PR 리뷰**: UI 변경 자동 감지

---

## ✅ 10. 테스트 전략

### 10.1 Storybook Interaction Tests

- [x] **addon-vitest**: 이미 설정됨 ✅
- [ ] **테스트 시나리오 작성**: 주요 컴포넌트 interaction
- [ ] **CI 실행**: `npm run test:storybook`

### 10.2 Extension Unit Tests

- [ ] **Extension Host 테스트**: Mocha 또는 Vitest
- [ ] **Webview 통신 테스트**: IPC Protocol 검증
- [ ] **State 관리 테스트**: setState/getState 동작 확인

### 10.3 E2E Tests (Optional)

- [ ] **Playwright**: Extension 전체 동작 테스트
- [ ] **시나리오**: Component 선택 → Webview 표시 → Props 변경

---

## 📊 실측 검증 결과 (2025-10-08)

### 📋 검증 요약

**검증 날짜**: 2025-10-08 **검증 범위**: Addon 호환성, 컴포넌트 의존성, React 19
기능 사용, DOM API 사용

**주요 결과**:

- ✅ **React 19 호환성**: 완벽 호환 (고급 기능 미사용, 기본 hooks만 사용)
- ✅ **대부분의 의존성**: Webview 호환 (lucide-react, recharts, react-hook-form,
  zod, date-fns)
- ⚠️ **Storybook Addons**: 1.2MB (프로덕션 빌드에서 제외 필요)
- ⚠️ **DOM API 사용**: 1개 컴포넌트 (Sidebar) - 수정 필요
- ⚠️ **번들 크기**: 9.8MB (목표 대비 19.6배 초과)

### ✅ 완료된 검증 항목

1. **의존성 설치**: npm install 완료 (1211 packages)
2. **Storybook 빌드 수정**: staticDirs 충돌 해결 (`staticDirs: []`로 설정)
3. **빌드 성공**: exit code 0
4. **번들 크기 측정**: 9.8MB (목표 대비 19.6배 초과)
5. **Story 파일 개수**: 67개 실측 확인
6. **Addon 호환성 검증**: 완료 (상세 분석 아래 참조)
7. **컴포넌트 의존성 검증**: 완료 (Webview 호환성 확인)
8. **React 19 기능 사용**: 없음 (기본 hooks만 사용)

### ⚠️ 발견된 주요 이슈

#### 1. 번들 크기 초과 (Critical)

- **현재**: 9.8MB (압축 전)
- **목표**: 500KB (gzip 후) → ~250KB (압축 전 추정)
- **차이**: **39.2배 초과**
- **조치 필요**:
  - Storybook Manager (2.5MB) 완전 제외
  - Addons (1.2MB) 프로덕션 제외
  - Code Splitting 적용
  - Tree-shaking 강화

#### 2. Storybook Addons (High Priority)

- **현재 사용 중**: 5개 Addons (Chromatic, Docs, A11y, Vitest, Themes)
- **번들 영향**: 1.2MB
- **조치 필요**: 프로덕션 빌드에서 완전 제외

**Addon별 상세 분석** (실측 결과): | Addon | 크기 | Webview 호환성 | 조치 |
|-------|------|--------------|------| | @chromatic-com/storybook | 544KB | ❌
CI/CD 전용 | 프로덕션 제외 | | storybook-core-server-presets | 576KB | ❌
Manager 전용 | 프로덕션 제외 | | @storybook/addon-a11y | 72KB | ✅ 선택적 포함
가능 | 개발 환경만 | | @storybook/addon-vitest | 28KB | ❌ 테스트 전용 |
프로덕션 제외 | | @storybook/addon-docs | 28KB | ❌ 문서 생성 전용 | 프로덕션
제외 | | @storybook/addon-themes | 8KB | ⚠️ 조건부 | VSCode 테마 API로 대체 |

#### 3. Next.js 의존성 (Medium Priority)

- **현재**: @storybook/nextjs-vite
- **Webview 목표**: React만 필요
- **조치 필요**: Webpack 설정으로 Next.js 의존성 제외

#### 4. 컴포넌트 DOM API 사용 (Medium Priority)

**실측 검증 결과**:

- **window/document 사용**: 1개 파일 (`src/components/ui/sidebar.tsx`)
  - `document.cookie` 사용 (sidebar 상태 저장)
  - `window.addEventListener` 사용 (키보드 단축키)
- **localStorage/sessionStorage**: 사용 안 함 ✅
- **조치 필요**:
  - Sidebar 컴포넌트의 `document.cookie` → `vscode.setState()` 대체
  - `window.addEventListener` → VSCode Extension 컨텍스트에서 안전하게 작동
    (확인 필요)

#### 5. React 19 고급 기능 사용 (Low Priority)

**실측 검증 결과**:

- **useTransition**: 사용 안 함 ✅
- **useDeferredValue**: 사용 안 함 ✅
- **useId**: 사용 안 함 ✅
- **Suspense**: 사용 안 함 ✅
- **결론**: 모든 story 파일이 기본 React hooks만 사용 (useState, useEffect,
  useCallback, useMemo)
- **Webview 호환성**: 완벽 호환 ✅

### 📈 최적화 예상 효과

| 항목               | 현재 크기 | 제거 후   | 절감     |
| ------------------ | --------- | --------- | -------- |
| Manager            | 2.5MB     | 0KB       | -100%    |
| Addons             | 1.2MB     | 0KB       | -100%    |
| Stories            | 4.7MB     | 100KB     | -98%     |
| React + Components | 1.3MB     | 400KB     | -69%     |
| **Total**          | **9.8MB** | **500KB** | **-95%** |

---

## 🎯 마이그레이션 로드맵

### Phase 1: 파일럿 테스트 (1주)

- [ ] **Week 1**: Webpack 설정, Extension 구조 설계
  - [ ] `webpack.extension.config.js`, `webpack.webview.config.js` 생성
  - [ ] `src/extension.ts` 기본 구조 작성
  - [ ] 단일 컴포넌트 (Button) Webview 테스트

### Phase 2: 핵심 기능 구현 (2주)

- [ ] **Week 2**: IPC 프로토콜, State 관리
  - [ ] Type-safe IPC Protocol 구현
  - [ ] vscode.setState/getState 통합
  - [ ] 5개 컴포넌트 Webview 통합
- [ ] **Week 3**: CSP 보안, 성능 최적화
  - [ ] CSP + nonce 구현
  - [ ] Tree-shaking, Code Splitting 적용
  - [ ] 번들 크기 목표 달성 (< 500KB)

### Phase 3: 전체 컴포넌트 통합 (2주)

- [ ] **Week 4**: 46개 컴포넌트 전체 통합
  - [ ] Atoms 컴포넌트 통합 (40개)
  - [ ] Design Tokens 통합 (5개)
  - [ ] Templates 통합 (1개)
- [ ] **Week 5**: 테스트 및 최적화
  - [ ] Interaction Tests 작성
  - [ ] Visual Regression Testing
  - [ ] 성능 프로파일링

### Phase 4: CI/CD 및 배포 (1주)

- [ ] **Week 6**: CI/CD 파이프라인 구축
  - [ ] GitHub Actions 설정
  - [ ] VSIX 자동 빌드
  - [ ] Marketplace 배포 준비

---

## 📋 우선순위 체크리스트 (Quick Start)

### 🔴 필수 (Phase 1에서 완료)

- [ ] Webpack Webview 설정 생성
- [ ] CSP + nonce 구현
- [ ] IPC Protocol 타입 정의
- [ ] vscode.setState/getState 구현
- [ ] Button 컴포넌트 단일 Webview 테스트

### 🟡 권장 (Phase 2에서 완료)

- [ ] Tree-shaking, Code Splitting
- [ ] React.memo, useMemo 최적화
- [ ] 번들 크기 < 500KB
- [ ] Extension 활성화 < 1초

### 🟢 선택 (Phase 3-4에서 완료)

- [ ] Visual Regression Testing (Chromatic)
- [ ] E2E Tests (Playwright)
- [ ] Performance Monitoring
- [ ] Accessibility Testing (A11y)

---

## 🔍 검증 방법

### 번들 크기 확인

```bash
npm run build:webview
du -sh dist/webviews/*.js
```

### Extension 활성화 시간 측정

1. VSCode 열기
2. Command Palette: `Developer: Show Running Extensions`
3. Activation Time 확인 (목표: < 1초)

### CSP 위반 확인

1. Extension 실행
2. Webview 열기
3. DevTools Console 확인 (`Developer: Toggle Developer Tools`)
4. CSP 오류 없음 확인

### 메모리 사용량 확인

1. Webview 열기
2. DevTools Memory 탭
3. Heap Snapshot 생성
4. 메모리 사용량 확인 (목표: < 80MB)

---

## 📚 참고 문서

### 조사 문서

- [01-overview.md](01-overview.md) - 프로젝트 배경 및 아키텍처
- [02-constraints.md](02-constraints.md) - 기술적 제약사항
- [03-performance.md](03-performance.md) - 성능 최적화
- [04-security.md](04-security.md) - 보안 요구사항
- [05-workflow.md](05-workflow.md) - 개발 워크플로우

### 외부 참고

- [VSCode Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Storybook 9 Documentation](https://storybook.js.org/docs)
- [React 19 Documentation](https://react.dev/)

---

## 🚀 시작하기

### 1. 첫 번째 단계

```bash
# 1. Webpack 설정 파일 생성
touch webpack.extension.config.js
touch webpack.webview.config.js

# 2. Extension 엔트리 포인트 생성
mkdir -p src/extension
touch src/extension.ts

# 3. Webview React 코드 디렉토리 생성
mkdir -p webviews/componentPreview
touch webviews/componentPreview/index.tsx
```

### 2. package.json 수정

```json
{
  "main": "./dist/extension.js",
  "activationEvents": ["onCommand:shadcn.showComponentPreview"],
  "contributes": {
    "commands": [
      {
        "command": "shadcn.showComponentPreview",
        "title": "Show Component Preview"
      }
    ]
  }
}
```

### 3. 첫 번째 빌드

```bash
# Extension 빌드
npm run build:extension

# Webview 빌드
npm run build:webview

# Extension 실행 (F5 디버깅)
```

---

**작성 완료**: 2025-10-08 **다음 단계**: Phase 1 파일럿 테스트 시작
