# Storybook + VSCode Extension: 기술적 제약사항 및 한계점

**작성일**: 2025-10-08 **문서 버전**: 1.0 **이전 문서**:
[01-overview.md](01-overview.md) **다음 문서**:
[03-performance.md](03-performance.md)

---

## 📋 목차

1. [VSCode Webview 플랫폼 제약사항](#vscode-webview-플랫폼-제약사항)
2. [React 컴포넌트 제약사항](#react-컴포넌트-제약사항)
3. [Storybook 통합 시 제약사항](#storybook-통합-시-제약사항)
4. [State 관리 제약사항](#state-관리-제약사항)
5. [리소스 로딩 제약사항](#리소스-로딩-제약사항)
6. [이벤트 처리 제약사항](#이벤트-처리-제약사항)
7. [해결 불가능한 제약사항](#해결-불가능한-제약사항)
8. [제약사항 요약 및 대응 전략](#제약사항-요약-및-대응-전략)

---

## 🚫 VSCode Webview 플랫폼 제약사항

### 1.1 Sandboxed Iframe 환경

**제약사항**: Webview는 완전히 격리된 Iframe에서 실행됩니다.

#### 사용 불가능한 Web API

```typescript
// ❌ 사용 불가
window.open("https://example.com"); // 새 창 열기 불가
localStorage.setItem("key", "value"); // localStorage 접근 불가
sessionStorage.setItem("key", "value"); // sessionStorage 접근 불가
document.cookie = "name=value"; // Cookie 설정 불가
navigator.geolocation.getCurrentPosition(); // Geolocation API 불가
navigator.mediaDevices.getUserMedia(); // 카메라/마이크 접근 불가
window.history.pushState(); // History API 제한적
```

#### 대체 방법

```typescript
// ✅ Extension Host를 통한 우회
const vscode = acquireVsCodeApi();

// 외부 링크 열기
vscode.postMessage({
  command: 'openExternal',
  url: 'https://example.com'
});

// Extension Host에서 처리
panel.webview.onDidReceiveMessage(message => {
  if (message.command === 'openExternal') {
    vscode.env.openExternal(vscode.Uri.parse(message.url));
  }
});

// State 저장 (localStorage 대체)
vscode.setState({ pods: [...] });
const state = vscode.getState();
```

#### 영향받는 Storybook Addons

| Addon                          | 영향                             | 대체 방안                      |
| ------------------------------ | -------------------------------- | ------------------------------ |
| `@storybook/addon-links`       | Story 간 링크 클릭 시 동작 안 함 | VSCode Webview에서는 사용 불가 |
| `@storybook/addon-storysource` | 소스 코드 표시 안 됨             | 프로덕션 빌드에서 제외         |
| `@storybook/addon-viewport`    | 뷰포트 크기 조정 제한적          | Webview 크기는 VSCode가 관리   |
| `@chromatic/addon`             | Visual Regression Testing 불가   | CI/CD에서만 실행               |

**권장사항**:

- Storybook Addons은 **개발 단계에서만 사용**
- 프로덕션 빌드 시 Addons 제외 (`--test` 플래그 사용)
- Extension에서 필요한 기능은 IPC로 Extension Host에 요청

---

### 1.2 DOM API 제한

**제약사항**: 일부 DOM 조작 API가 제한되거나 작동하지 않습니다.

#### 제한되는 API

```typescript
// ❌ 작동하지 않거나 제한적
document.querySelector("body").requestFullscreen(); // Fullscreen API 불가
document.execCommand("copy"); // Clipboard API 제한적
window.print(); // 인쇄 다이얼로그 불가
document.designMode = "on"; // ContentEditable 제한적
```

#### React 컴포넌트에서 흔히 발생하는 문제

```typescript
// ❌ 문제 사례: React Portal을 document.body에 마운트
import { createPortal } from 'react-dom';

function Modal({ children }) {
  // Webview에서는 document.body 접근이 제한적
  return createPortal(
    <div className="modal">{children}</div>,
    document.body  // ⚠️ Webview에서 예상과 다르게 동작 가능
  );
}

// ✅ 해결 방법: Webview 내부의 특정 컨테이너 사용
function Modal({ children }) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div className="modal">{children}</div>,
    modalRoot
  );
}

// HTML에 modal-root 추가 필요
// <body>
//   <div id="root"></div>
//   <div id="modal-root"></div>
// </body>
```

**권장사항**:

- Modal, Tooltip 등은 React Portal 대신 relative positioning 사용
- Clipboard API는 `vscode.env.clipboard` 사용
- Fullscreen은 VSCode Command로 구현

---

### 1.3 Network 요청 제한

**제약사항**: CORS 정책과 CSP로 인해 외부 리소스 로딩이 제한됩니다.

#### 허용되지 않는 요청

```typescript
// ❌ 직접 fetch 불가 (CSP 위반)
fetch('https://api.example.com/data')
  .then(res => res.json())
  .then(data => console.log(data));  // CSP에 의해 차단

// ❌ 외부 CDN 리소스 로딩 불가
<script src="https://cdn.jsdelivr.net/npm/react@17/umd/react.production.min.js"></script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto">
```

#### 올바른 방법

```typescript
// ✅ Extension Host를 통한 API 호출
const vscode = acquireVsCodeApi();

vscode.postMessage({
  command: "fetchData",
  url: "https://api.example.com/data",
});

window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "dataFetched") {
    console.log(message.data);
  }
});

// Extension Host에서
panel.webview.onDidReceiveMessage(async (message) => {
  if (message.command === "fetchData") {
    const response = await fetch(message.url);
    const data = await response.json();
    panel.webview.postMessage({ type: "dataFetched", data });
  }
});
```

**권장사항**:

- 모든 외부 API 호출은 Extension Host에서 수행
- Storybook에서 사용하는 Mock 데이터는 번들에 포함
- 폰트/아이콘은 번들에 포함하거나 Data URI 사용

---

### 1.4 Lifecycle 제약

**제약사항**: Webview는 탭이 숨겨지면 파괴되고, 다시 보이면 재생성됩니다.

#### 문제 상황

```typescript
// ❌ 문제: Webview가 destroy되면 State가 사라짐
function PodDetailsView() {
  const [pods, setPods] = useState([]);

  useEffect(() => {
    // 10초마다 Pod 목록 갱신
    const interval = setInterval(() => {
      fetchPods().then(setPods);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // 🚨 문제: 사용자가 다른 탭으로 이동했다가 돌아오면
  //    Webview가 destroy/recreate되어 pods 상태가 사라짐
}
```

#### 해결 방법

```typescript
// ✅ 해결 1: vscode.setState/getState 사용
function PodDetailsView() {
  const vscode = acquireVsCodeApi();
  const [pods, setPods] = useState(() => {
    const state = vscode.getState();
    return state?.pods || [];
  });

  useEffect(() => {
    // State가 변경될 때마다 저장
    vscode.setState({ pods });
  }, [pods]);
}

// ✅ 해결 2: retainContextWhenHidden 사용 (권장하지 않음)
const panel = vscode.window.createWebviewPanel(
  "podDetails",
  "Pod Details",
  vscode.ViewColumn.One,
  {
    retainContextWhenHidden: true, // ⚠️ 메모리 사용량 증가
  },
);
```

**retainContextWhenHidden의 메모리 오버헤드**:

| Webview 개수         | 일반 모드 | retainContextWhenHidden |
| -------------------- | --------- | ----------------------- |
| 1개                  | ~50MB     | ~50MB                   |
| 5개 (1개만 visible)  | ~80MB     | ~250MB                  |
| 10개 (1개만 visible) | ~120MB    | ~500MB                  |

**권장사항**:

- **기본**: `vscode.setState/getState` 사용
- **retainContextWhenHidden**: 절대 피해야 할 상황에서만 사용
- State 크기 최소화 (JSON 직렬화 가능한 데이터만)

---

## ⚛️ React 컴포넌트 제약사항

### 2.1 Event Handling 차이점

**제약사항**: VSCode Webview의 이벤트 처리가 표준 React와 다릅니다.

#### onChange vs onInput 차이

```typescript
// ❌ 표준 React 동작 (SyntheticEvent)
<input
  onChange={(e) => setValue(e.target.value)}  // 매 키입력마다 호출
/>

// ✅ VSCode Webview에서의 실제 동작
<input
  onChange={(e) => setValue(e.target.value)}  // ⚠️ blur 시에만 호출 (focus 해제)
  onInput={(e) => setValue(e.target.value)}   // ✅ 매 키입력마다 호출
/>
```

#### VSCodeTextField 사용 시 주의사항

```typescript
import { VSCodeTextField } from '@vscode/webview-ui-toolkit/react';

// ❌ 잘못된 사용
function MyComponent() {
  const [value, setValue] = useState('');

  return (
    <VSCodeTextField
      value={value}
      onChange={(e) => setValue(e.target.value)}  // ⚠️ blur 시에만 동작
    />
  );
}

// ✅ 올바른 사용
function MyComponent() {
  const [value, setValue] = useState('');

  return (
    <VSCodeTextField
      value={value}
      onInput={(e) => setValue(e.target.value)}  // ✅ 실시간 입력 반영
    />
  );
}
```

**Storybook에서의 영향**:

- Storybook에서는 표준 React 동작으로 테스트됨
- Webview에서는 다르게 동작할 수 있음
- **해결책**: Controls Addon에서 `onInput` 이벤트도 함께 테스트

---

### 2.2 Third-Party 라이브러리 호환성

**제약사항**: Electron/Browser 전용 API를 사용하는 라이브러리는 작동하지
않습니다.

#### 호환성 확인 필요한 라이브러리

| 라이브러리        | 호환성    | 비고                                 |
| ----------------- | --------- | ------------------------------------ |
| `react-router`    | ⚠️ 제한적 | History API 제한으로 HashRouter 사용 |
| `react-dnd`       | ✅ 가능   | HTML5 Backend 사용 가능              |
| `react-window`    | ✅ 가능   | Virtual Scrolling 정상 작동          |
| `react-query`     | ✅ 가능   | IPC 통신과 함께 사용                 |
| `react-chartjs-2` | ✅ 가능   | Canvas API 정상 작동                 |
| `react-pdf`       | ❌ 불가   | File System 접근 필요                |
| `monaco-editor`   | ✅ 가능   | VSCode에서 공식 지원                 |
| `xterm.js`        | ✅ 가능   | Terminal 컴포넌트                    |

#### React Router 사용 시

```typescript
// ❌ BrowserRouter 사용 불가
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>  {/* ⚠️ History API 제한으로 오작동 */}
      <Routes>...</Routes>
    </BrowserRouter>
  );
}

// ✅ HashRouter 또는 MemoryRouter 사용
import { HashRouter } from 'react-router-dom';

function App() {
  return (
    <HashRouter>  {/* ✅ URL Fragment 기반, Webview에서 정상 작동 */}
      <Routes>...</Routes>
    </HashRouter>
  );
}
```

**권장사항**:

- 라이브러리 선택 전 VSCode Webview 호환성 확인
- Browser API 의존성 확인
- Storybook에서 실제 동작 테스트

---

### 2.3 Context API 제약

**제약사항**: React Context는 Webview 내부에서만 작동합니다.

#### Extension Host와 State 공유 불가

```typescript
// ❌ 불가능: Extension Host의 Context를 Webview에서 사용
// Extension Host (Node.js 환경)
const ExtensionContext = createContext();

// Webview (Browser 환경)
// ExtensionContext를 Webview에서 접근 불가 (완전히 다른 프로세스)
```

#### 올바른 패턴

```typescript
// ✅ Webview 내부 Context
// webview/src/contexts/PodContext.tsx
export const PodContext = createContext<PodContextType>(null);

export function PodProvider({ children }) {
  const [pods, setPods] = useState([]);

  useEffect(() => {
    // Extension Host로부터 초기 데이터 수신
    window.addEventListener('message', (event) => {
      if (event.data.type === 'pods/update') {
        setPods(event.data.pods);
      }
    });
  }, []);

  return (
    <PodContext.Provider value={{ pods, setPods }}>
      {children}
    </PodContext.Provider>
  );
}

// ✅ Extension Host에서 데이터 전송
panel.webview.postMessage({
  type: 'pods/update',
  pods: await kubernetesApi.getPods()
});
```

**권장사항**:

- Context는 Webview 내부 State 관리용으로만 사용
- Extension Host ↔ Webview 통신은 IPC 메시지 사용
- State 동기화는 명시적 메시지 패싱으로 구현

---

## 📖 Storybook 통합 시 제약사항

### 3.1 Storybook Addons 제한

**제약사항**: Storybook의 많은 Addons이 프로덕션 빌드에 포함되면 안 됩니다.

#### 프로덕션 빌드에서 제외해야 할 Addons

| Addon                          | 이유                         | 번들 크기 영향 |
| ------------------------------ | ---------------------------- | -------------- |
| `@storybook/addon-actions`     | 개발 전용                    | +120KB         |
| `@storybook/addon-controls`    | 개발 전용                    | +180KB         |
| `@storybook/addon-toolbars`    | 개발 전용                    | +60KB          |
| `@storybook/addon-viewport`    | Webview 크기는 VSCode가 제어 | +90KB          |
| `@storybook/addon-backgrounds` | 개발 전용                    | +40KB          |
| `@chromatic/addon`             | CI/CD 전용                   | +200KB         |

#### 프로덕션 빌드 설정

```typescript
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],

  addons: [
    // ✅ 프로덕션 포함 가능
    "@storybook/addon-essentials", // Docs만 사용
    "@storybook/addon-a11y", // 접근성 검증

    // ❌ 개발 전용 (--dev 플래그 시에만)
    ...(process.env.NODE_ENV === "development"
      ? ["@storybook/addon-interactions", "@storybook/addon-links"]
      : []),
  ],

  // ✅ 테스트 빌드 (빠른 빌드, Addons 제외)
  build: {
    test: {
      disableDocs: true,
      disableSourcemaps: true,
    },
  },
};
```

#### 빌드 스크립트

```json
{
  "scripts": {
    "storybook:dev": "storybook dev -p 6006",
    "storybook:build": "storybook build",
    "storybook:build:test": "storybook build --test",

    "webview:build": "webpack --mode production --config webpack.webview.config.js"
  }
}
```

**번들 크기 비교**:

| 빌드 방식             | 번들 크기 | 빌드 시간 |
| --------------------- | --------- | --------- |
| 전체 Storybook 빌드   | 2.5MB     | 45초      |
| `--test` 플래그       | 1.2MB     | 18초      |
| Webview 프로덕션 빌드 | 450KB     | 8초       |

**권장사항**:

- Storybook은 **개발 환경에서만** 전체 기능 사용
- Webview 번들은 **컴포넌트 코드만** 포함
- CI/CD에서는 `--test` 빌드로 Visual Regression Testing

---

### 3.2 Storybook Decorators 제약

**제약사항**: Storybook Decorators가 Webview에서 작동하지 않을 수 있습니다.

#### 문제가 되는 Decorator 패턴

```typescript
// ❌ Storybook 전용 Decorator (Webview에서 작동 안 함)
import { action } from '@storybook/addon-actions';

export const decorators = [
  (Story) => (
    <div onClick={action('background-click')}>  {/* addon-actions 필요 */}
      <Story />
    </div>
  ),
];

// ❌ Storybook Context 의존
import { useParameter } from '@storybook/preview-api';

function ThemeDecorator(Story) {
  const theme = useParameter('theme', 'light');  // Webview에서 undefined
  return <div data-theme={theme}><Story /></div>;
}
```

#### Webview 호환 Decorator

```typescript
// ✅ Webview에서도 작동하는 Decorator
export const decorators = [
  (Story) => (
    <div className="story-container">  {/* Pure React, no Storybook API */}
      <Story />
    </div>
  ),
];

// ✅ Theme Decorator (Webview 호환)
function ThemeDecorator(Story, context) {
  // Storybook에서는 context.parameters.theme 사용
  // Webview에서는 context가 없으므로 기본값 사용
  const theme = context?.parameters?.theme || 'dark';

  return (
    <div data-theme={theme} className="theme-wrapper">
      <Story />
    </div>
  );
}
```

**권장사항**:

- Decorator는 Pure React 컴포넌트로 작성
- Storybook API (`action`, `useParameter` 등) 사용 지양
- Conditional Decorator (Storybook에서만 적용)

```typescript
// ✅ 조건부 Decorator
export const decorators = [
  typeof window !== "undefined" && window.IS_STORYBOOK
    ? StorybookOnlyDecorator
    : WebviewDecorator,
];
```

---

### 3.3 Mock Data 관리

**제약사항**: Storybook의 Mock 데이터를 Webview에서 재사용하기 어렵습니다.

#### 문제 상황

```typescript
// Storybook Story
export const Default: Story = {
  args: {
    pods: [
      { name: "nginx-1", status: "Running" },
      { name: "nginx-2", status: "Pending" },
    ],
  },
};

// ❌ Webview에서 위 Mock 데이터 접근 불가
// Story args는 Storybook 런타임에서만 존재
```

#### 해결 방법: Shared Mock Data

```typescript
// src/mocks/pods.mock.ts (공유 Mock 데이터)
export const mockPods = [
  { name: "nginx-1", status: "Running", namespace: "default" },
  { name: "nginx-2", status: "Pending", namespace: "default" },
];

// Storybook Story에서 사용
import { mockPods } from "../mocks/pods.mock";

export const Default: Story = {
  args: { pods: mockPods },
};

// Webview 개발/테스트에서 사용
import { mockPods } from "./mocks/pods.mock";

function PodList() {
  const [pods, setPods] = useState(mockPods); // ✅ 동일한 Mock 사용
  // ...
}

// Extension Host에서도 사용 (테스트)
import { mockPods } from "../src/mocks/pods.mock";

suite("PodDetailsWebview", () => {
  test("renders pod list", () => {
    const webview = new PodDetailsWebview();
    webview.update(mockPods); // ✅ 일관된 테스트 데이터
  });
});
```

**Mock 데이터 구조 권장사항**:

```
src/
├── mocks/
│   ├── pods.mock.ts          # Pod Mock 데이터
│   ├── deployments.mock.ts   # Deployment Mock 데이터
│   └── index.ts              # 통합 Export
├── components/
│   └── PodList.tsx
└── stories/
    └── PodList.stories.tsx
```

---

## 🔄 State 관리 제약사항

### 4.1 Redux/MobX 통합 제약

**제약사항**: Extension Host의 Store를 Webview에서 직접 사용할 수 없습니다.

#### MobX Observable 제약

```typescript
// ❌ Extension Host의 MobX Store를 Webview에서 사용 불가
// Extension Host
import { observable } from "mobx";

export class PodStore {
  @observable pods = [];
  // ...
}

// Webview
// PodStore를 import할 수 없음 (다른 프로세스)
```

#### 해결 방법: State 동기화 패턴

```typescript
// ✅ Extension Host: MobX Store
import { observable, reaction } from 'mobx';

export class PodStore {
  @observable pods = [];

  constructor(private webview: vscode.Webview) {
    // Store 변경 시 Webview로 전송
    reaction(
      () => this.pods,
      (pods) => {
        this.webview.postMessage({
          type: 'pods/update',
          pods: pods.map(p => p.toJSON())  // Serializable로 변환
        });
      }
    );
  }
}

// ✅ Webview: Local State
function PodList() {
  const [pods, setPods] = useState([]);

  useEffect(() => {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'pods/update') {
        setPods(event.data.pods);  // Extension Host → Webview
      }
    });
  }, []);

  return <div>{pods.map(renderPod)}</div>;
}
```

**권장사항**:

- Extension Host: MobX/Redux Store 유지
- Webview: Local useState/useReducer 사용
- Sync 패턴: Store → postMessage → setState

---

### 4.2 State 직렬화 제약

**제약사항**: `vscode.setState`와 IPC 메시지는 JSON 직렬화 가능한 데이터만
지원합니다.

#### 직렬화 불가능한 데이터

```typescript
// ❌ 직렬화 불가능
const state = {
  pods: [...],
  fetchPods: () => {},           // Function
  circularRef: obj,              // 순환 참조
  date: new Date(),              // Date 객체 (문자열로 변환됨)
  map: new Map(),                // Map
  set: new Set(),                // Set
  buffer: new ArrayBuffer(10),   // Binary 데이터
};

vscode.setState(state);  // ⚠️ Error 또는 데이터 손실
```

#### 직렬화 가능한 패턴

```typescript
// ✅ Serialized Type 정의
export type Serialized<T> = {
  [K in keyof T]: T[K] extends Function
    ? never
    : T[K] extends object
      ? Serialized<T[K]>
      : T[K];
};

// ✅ Pod 객체 → JSON
interface Pod {
  name: string;
  status: string;
  createdAt: Date; // ⚠️ Date 객체
  metadata: Map<string, string>; // ⚠️ Map
}

type SerializedPod = {
  name: string;
  status: string;
  createdAt: string; // ISO 8601 문자열
  metadata: Record<string, string>; // Plain object
};

function serializePod(pod: Pod): SerializedPod {
  return {
    name: pod.name,
    status: pod.status,
    createdAt: pod.createdAt.toISOString(),
    metadata: Object.fromEntries(pod.metadata),
  };
}

function deserializePod(data: SerializedPod): Pod {
  return {
    name: data.name,
    status: data.status,
    createdAt: new Date(data.createdAt),
    metadata: new Map(Object.entries(data.metadata)),
  };
}
```

**권장사항**:

- State는 Plain Object, Array, Primitive만 사용
- Date → ISO 8601 문자열
- Map/Set → Plain Object/Array
- Function은 State에 포함하지 않음

---

## 📂 리소스 로딩 제약사항

### 5.1 절대 경로 리소스 로딩 불가

**제약사항**: Create React App 등에서 생성되는 절대 경로 리소스를 로딩할 수
없습니다.

#### 문제 상황

```typescript
// ❌ CRA 기본 빌드 결과
// index.html
<script src="/static/js/main.abc123.js"></script>
<link href="/static/css/main.def456.css" rel="stylesheet">
<img src="/static/media/logo.svg" alt="Logo">

// Webview에서는 /static/... 경로를 찾을 수 없음
// VSCode는 vscode-webview:// 프로토콜 사용
```

#### 해결 방법

```bash
# ✅ CRA에서 상대 경로 빌드
# package.json
{
  "homepage": ".",  # 절대 경로 대신 상대 경로 사용
  "scripts": {
    "build": "PUBLIC_URL=. react-scripts build"
  }
}

# 빌드 결과
<script src="./static/js/main.abc123.js"></script>  # ✅ 상대 경로
```

```typescript
// ✅ Webpack 설정
// webpack.config.js
module.exports = {
  output: {
    publicPath: "", // 절대 경로 제거
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: "asset/inline", // Data URI로 인라인화
      },
    ],
  },
};
```

**권장사항**:

- 모든 리소스는 상대 경로로 빌드
- 이미지/폰트는 Data URI로 인라인화
- `PUBLIC_URL=.` 환경변수 설정

---

### 5.2 외부 CDN 리소스 제약

**제약사항**: CDN에서 로딩하는 리소스는 CSP에 의해 차단됩니다.

#### 차단되는 리소스

```html
<!-- ❌ CSP 위반 -->
<script src="https://cdn.jsdelivr.net/npm/react@17/umd/react.production.min.js"></script>
<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />
<link href="https://cdn.example.com/styles.css" rel="stylesheet" />
```

#### 해결 방법

```bash
# ✅ 로컬 번들에 포함
npm install react react-dom

# Webpack에서 번들링
# webpack.config.js
module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: 'webview.js',  // React 포함된 단일 번들
  },
};
```

```typescript
// ✅ 폰트는 Data URI 또는 로컬 파일
// fonts.css
@font-face {
  font-family: 'Roboto';
  src: url(data:font/woff2;base64,d09GMgABA...);  // Base64 인코딩
}

// 또는
import './fonts/Roboto.woff2';  // Webpack으로 번들링
```

**권장사항**:

- 모든 Dependencies를 번들에 포함
- 폰트는 로컬 파일 또는 Data URI 사용
- CSS는 번들에 포함 (inline 또는 별도 파일)

---

## 🖱️ 이벤트 처리 제약사항

### 6.1 Drag & Drop 제약

**제약사항**: 파일 Drag & Drop이 제한적으로 작동합니다.

#### 문제 상황

```typescript
// ❌ 파일 시스템 접근 불가
function FileDropZone() {
  const handleDrop = (e: DragEvent) => {
    const files = e.dataTransfer.files;
    const file = files[0];

    // ⚠️ Webview는 파일 경로에 직접 접근 불가
    console.log(file.path);  // undefined 또는 제한된 경로
  };

  return <div onDrop={handleDrop}>Drop files here</div>;
}
```

#### 해결 방법

```typescript
// ✅ Extension Host를 통한 파일 처리
function FileDropZone() {
  const vscode = acquireVsCodeApi();

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();

    // 파일 처리를 Extension Host에 위임
    const fileList = Array.from(e.dataTransfer.files);
    const fileNames = fileList.map(f => f.name);

    vscode.postMessage({
      command: 'files/dropped',
      files: fileNames
    });
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      Drop YAML files here
    </div>
  );
}

// Extension Host에서 처리
panel.webview.onDidReceiveMessage(async (message) => {
  if (message.command === 'files/dropped') {
    const uris = await vscode.window.showOpenDialog({
      filters: { 'YAML': ['yaml', 'yml'] }
    });

    if (uris) {
      const content = await vscode.workspace.fs.readFile(uris[0]);
      panel.webview.postMessage({
        type: 'file/content',
        content: content.toString()
      });
    }
  }
});
```

**권장사항**:

- Drag & Drop UI는 Webview에서 구현
- 실제 파일 처리는 Extension Host에서 수행
- `vscode.window.showOpenDialog` 사용 권장

---

### 6.2 Keyboard Shortcuts 충돌

**제약사항**: Webview의 키보드 이벤트가 VSCode 단축키와 충돌할 수 있습니다.

#### 충돌 예시

```typescript
// ❌ VSCode 단축키와 충돌
function CodeEditor() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        // Ctrl+S
        e.preventDefault();
        saveCode(); // ⚠️ VSCode의 "Save File"과 충돌
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
```

#### 해결 방법

```typescript
// ✅ VSCode Command로 등록
// Extension Host
vscode.commands.registerCommand("kubernetes.saveCode", () => {
  // Webview에 save 명령 전달
  panel.webview.postMessage({ command: "editor/save" });
});

// Webview
useEffect(() => {
  window.addEventListener("message", (event) => {
    if (event.data.command === "editor/save") {
      saveCode();
    }
  });
}, []);
```

**package.json에 단축키 등록**:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "kubernetes.saveCode",
        "title": "Save Kubernetes YAML"
      }
    ],
    "keybindings": [
      {
        "command": "kubernetes.saveCode",
        "key": "ctrl+s",
        "when": "webviewId == 'kubernetesEditor'"
      }
    ]
  }
}
```

**권장사항**:

- 중요한 단축키는 VSCode Command로 등록
- `when` 절로 Webview 활성화 시에만 작동하도록 제한
- Webview 내부에서는 단축키 사용 최소화

---

## ❌ 해결 불가능한 제약사항

### 7.1 완전히 불가능한 기능

아래 기능들은 **기술적으로 해결 방법이 없습니다**. 설계 시 반드시 고려해야
합니다.

#### 1. Webview 간 직접 통신

```typescript
// ❌ 불가능
// Webview A에서 Webview B로 직접 메시지 전송
webviewB.postMessage({ from: 'webviewA', data: ... });  // 불가능
```

**대안**: Extension Host를 중계 서버로 사용

```typescript
// ✅ Extension Host 중계
// Webview A
vscode.postMessage({ target: 'webviewB', data: ... });

// Extension Host
const webviewA = ...;
const webviewB = ...;

webviewA.onDidReceiveMessage((msg) => {
  if (msg.target === 'webviewB') {
    webviewB.postMessage({ from: 'webviewA', data: msg.data });
  }
});
```

---

#### 2. Real-time Collaboration (Operational Transform)

```typescript
// ❌ 불가능
// CRDTs, Yjs, Automerge 등 실시간 협업 라이브러리 사용 불가
// WebSocket 연결 제한으로 인해 동기화 불가능
```

**대안**: Extension Host에서 WebSocket 연결 관리

```typescript
// ✅ Extension Host에서 WebSocket
// Extension Host
const ws = new WebSocket("wss://collab-server.com");
ws.on("message", (data) => {
  webview.postMessage({ type: "collab/update", data });
});

// Webview
window.addEventListener("message", (event) => {
  if (event.data.type === "collab/update") {
    applyUpdate(event.data.data);
  }
});
```

---

#### 3. Service Workers

```typescript
// ❌ 불가능
// Service Worker 등록 불가
navigator.serviceWorker.register("/sw.js"); // 작동하지 않음
```

**영향**:

- Offline 기능 불가
- Background Sync 불가
- Push Notifications 불가

**대안**: Extension Host에서 백그라운드 작업 수행

---

#### 4. WebRTC (P2P 통신)

```typescript
// ❌ 불가능
// WebRTC PeerConnection 생성 불가
const pc = new RTCPeerConnection(); // 제한적 또는 불가능
```

**영향**:

- 비디오/오디오 채팅 불가
- P2P 데이터 전송 불가

**대안**: Extension Host를 통한 서버 중계 방식

---

### 7.2 성능상 비현실적인 기능

아래 기능들은 기술적으로 가능하지만, **성능 문제로 권장하지 않습니다**.

#### 1. 대량의 DOM 엘리먼트 렌더링

```typescript
// ⚠️ 비권장: 10,000개 이상의 DOM 노드
function HugeList() {
  const items = Array.from({ length: 100000 });  // 100,000개

  return (
    <div>
      {items.map((_, i) => (
        <div key={i}>Item {i}</div>  // ⚠️ 메모리 과다 사용
      ))}
    </div>
  );
}
```

**대안**: Virtual Scrolling

```typescript
// ✅ react-window 사용
import { FixedSizeList } from 'react-window';

function VirtualizedList() {
  return (
    <FixedSizeList
      height={600}
      itemCount={100000}
      itemSize={35}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>Item {index}</div>
      )}
    </FixedSizeList>
  );
}
```

---

#### 2. 고해상도 Canvas Rendering

```typescript
// ⚠️ 비권장: 4K 해상도 Canvas
const canvas = document.createElement("canvas");
canvas.width = 3840; // 4K width
canvas.height = 2160; // 4K height
// ⚠️ Webview 메모리 한계 초과 가능
```

**권장**:

- Canvas 크기를 Webview 크기에 맞춤
- OffscreenCanvas 사용 (Web Worker)
- 이미지는 적절한 해상도로 다운샘플링

---

## 📊 제약사항 요약 및 대응 전략

### 제약사항 매트릭스

| 제약사항                       | 심각도  | 대응 가능성 | 대응 방법            |
| ------------------------------ | ------- | ----------- | -------------------- |
| Sandboxed Iframe               | 🔴 높음 | ✅ 가능     | Extension Host IPC   |
| CSP 정책                       | 🔴 높음 | ✅ 가능     | nonce, 외부 스크립트 |
| Event Handling 차이            | 🟡 중간 | ✅ 가능     | onInput 사용         |
| State 직렬화                   | 🟡 중간 | ✅ 가능     | Serialized Type      |
| Lifecycle (destroy)            | 🟡 중간 | ✅ 가능     | vscode.setState      |
| retainContextWhenHidden 메모리 | 🟡 중간 | ⚠️ 회피     | setState 사용        |
| 절대 경로 리소스               | 🟢 낮음 | ✅ 가능     | 상대 경로 빌드       |
| Webview 간 통신                | 🔴 높음 | ⚠️ 우회     | Extension Host 중계  |
| Service Workers                | 🔴 높음 | ❌ 불가     | Extension Host 대체  |
| WebRTC                         | 🟡 중간 | ❌ 불가     | 서버 중계            |

### 대응 전략 우선순위

**1. 설계 단계 (필수)**

- [ ] CSP 정책 준수 설계
- [ ] IPC Protocol 정의
- [ ] State 직렬화 전략 수립
- [ ] 리소스 번들링 전략 수립

**2. 개발 단계**

- [ ] Storybook Addons 분리 (dev vs prod)
- [ ] Event Handler `onInput` 사용
- [ ] Mock Data 공유 구조
- [ ] Virtual Scrolling 적용

**3. 최적화 단계**

- [ ] 번들 크기 최소화 (Tree-shaking)
- [ ] vscode.setState 사용 (retainContextWhenHidden 지양)
- [ ] Lazy Loading 적용
- [ ] 메모리 사용량 모니터링

---

**다음 문서**: [03-performance.md](03-performance.md) - 성능 최적화 및 메모리
관리 전략
