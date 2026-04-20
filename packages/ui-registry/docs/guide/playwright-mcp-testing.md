# Playwright MCP 테스트 가이드

## 개요

이 문서는 Playwright MCP(멀티-에이전트 제어 프로토콜)를 활용하여 로컬 혹은 원격
개발 서버 페이지를 점검하는 절차를 정리한 것입니다.
`@executeautomation/playwright-mcp-server`가 설치돼 있다는 가정 하에, 브라우저
준비부터 페이지 네비게이션, 스크린샷 캡처까지의 흐름을 다룹니다.

## Claude Code 통합 설정 (권장)

### 🚀 빠른 시작 - Claude Code 사용자

Claude Code를 사용하는 경우, MCP 서버를 설정 파일에 추가하면 자동으로
관리됩니다.

#### 1. 설정 파일 위치 확인

```bash
~/.claude/settings.json
```

#### 2. MCP 서버 설정 추가

기존 설정 파일에 `mcpServers` 섹션을 추가합니다:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"],
      "disabled": false
    }
  }
}
```

**주의**: 기존 설정을 유지하면서 `mcpServers` 섹션만 추가하세요.

#### 3. Claude Code 재시작

MCP 서버가 로드되도록 Claude Code를 재시작합니다:

- **방법 1**: Claude Code 애플리케이션 완전 종료 후 재시작
- **방법 2**: Command Palette (Cmd+Shift+P) → "Reload Window"

#### 4. 연결 확인

재시작 후 다음 방법으로 MCP 연결을 확인할 수 있습니다:

- Claude에게 "playwright MCP가 연결되었는지 확인해줘"라고 요청
- `ListMcpResourcesTool`로 "playwright" 서버 확인

#### 5. 브라우저 설치

Chromium 브라우저가 없다면 설치합니다:

```bash
npx playwright install chromium
```

시스템 기본 경로(`~/Library/Caches/ms-playwright`)에 자동으로 설치됩니다.

### 🔧 수동 설정 (고급 사용자)

Claude Code를 사용하지 않거나 수동으로 MCP 서버를 관리하려는 경우, 아래 "필수
실행 순서" 섹션을 참조하세요.

## 필수 실행 순서 (Playwright MCP 호출이 2분 이상 응답하지 않을 때)

1. **목표 서비스 상태 확인**: 점검하려는 웹 애플리케이션이 기동되어 있는지
   재확인합니다. 필요한 경우 로컬 개발 서버나 미리보기 서버를 재시작하고,
   브라우저로 직접 접속해 응답을 확인합니다.
2. **MCP 서버 재기동**: `npx -y @executeautomation/playwright-mcp-server`로 MCP
   서버를 다시 실행해 세션을 초기화합니다. 이미 실행 중이었다면 종료 후
   재시작합니다.
3. **Playwright 브라우저 재설치**: MCP가 참조하는 `PLAYWRIGHT_BROWSERS_PATH`
   환경 변수를 지정한 뒤 `npx playwright install chromium`을 실행해 최신
   바이너리를 받습니다. 경로는 MCP 서버의
   `node_modules/playwright-core/.local-browsers` 등을 사용하면 됩니다.
4. **버전 디렉터리 동기화**: MCP가 특정 폴더명(예: `chromium-1179`)을
   기대한다면, 새로 설치된 버전 경로와 일치하도록 심볼릭 링크를 갱신하거나 설정
   파일을 수정합니다.
5. **명령 재실행 및 모니터링**: 위 단계를 모두 끝낸 뒤 Playwright MCP 명령을
   다시 실행합니다. 여전히 지연된다면 네트워크 방화벽, 프록시, 인증 정보 등 환경
   변수를 추가로 점검합니다.

이 다섯 단계는 다른 프로젝트에서도 동일하게 적용됩니다. 특히 2분 이상 응답이
없는 경우에는 반드시 위 순서를 차례대로 수행한 뒤 문제를 보고해야 합니다.

## 일반 준비 단계

### 방법 1: 시스템 기본 경로 사용 (권장)

가장 간단한 방법입니다. Playwright가 시스템 기본 경로를 자동으로 사용합니다.

1. **브라우저 바이너리 설치**

   ```bash
   npx playwright install chromium
   ```

   자동으로 다음 경로에 설치됩니다:
   - **macOS**: `~/Library/Caches/ms-playwright/`
   - **Linux**: `~/.cache/ms-playwright/`
   - **Windows**: `%USERPROFILE%\AppData\Local\ms-playwright\`

### 방법 2: 커스텀 경로 지정 (고급)

특정 경로에 브라우저를 설치하려면 `PLAYWRIGHT_BROWSERS_PATH` 환경변수를
사용합니다.

1. **브라우저 바이너리 설치 (커스텀 경로)**

   ```bash
   PLAYWRIGHT_BROWSERS_PATH=<mcp-install-path>/node_modules/playwright-core/.local-browsers \
     npx playwright install chromium
   ```

2. **버전 폴더 맞춤 (필요 시)**

   MCP 서버가 특정 버전을 기대하는 경우 심볼릭 링크를 생성합니다:

   ```bash
   ln -sfn <브라우저-실제-경로>/chromium-<설치버전> <브라우저-기대-경로>/chromium-<기존버전>
   ```

**참고**: 대부분의 경우 방법 1 (시스템 기본 경로)로 충분합니다.

## 테스트 절차

1. **페이지 접속**  
   `playwright_navigate` 도구를 사용해 검사 대상 URL로 이동합니다.
   ```json
   { "url": "http://<host>:<port>/<path>", "timeout": 120000 }
   ```
2. **버튼 클릭 / 입력 상호작용**
   - 버튼 클릭: `playwright_click`
     ```json
     { "selector": "button.primary" }
     ```
   - 텍스트 입력: `playwright_fill`
     ```json
     {
       "selector": "input[name=\"httpUrl\"]",
       "value": "http://<api-host>:<port>"
     }
     ```
   - 선택 상자 변경: `playwright_select`
     ```json
     { "selector": "select[name=\"authType\"]", "value": "<option-value>" }
     ```

3. **스크린샷 캡처**  
   전체 페이지 스크린샷은 `playwright_screenshot`으로 저장합니다.
   ```json
   { "name": "playwright-capture", "fullPage": true }
   ```
4. **텍스트 확인(선택)**  
   `playwright_get_visible_text`를 호출하면 현재 화면의 주요 텍스트를 확인할 수
   있습니다.
   ```json
   {}
   ```
5. **콘솔 로그 확인(필요 시)**  
   브라우저 콘솔 메시지가 필요할 경우 `playwright_console_logs`를 활용합니다.

## 참고

- MCP 서버는 `npx -y @executeautomation/playwright-mcp-server`로 실행됩니다.
- 모든 Playwright 명령은 MCP 연결을 통해 실행되므로, 별도의 Playwright 테스트
  파일을 작성할 필요가 없습니다.
- 브라우저 초기화 오류가 발생하면 `npx playwright install` 또는 기본 경로의
  심볼릭 링크를 확인하세요.

### 예시 1: shadcn-storybook-registry 프로젝트 (현재 프로젝트)

#### 환경 정보

- **Playwright 버전**: 1.56.0
- **MCP 서버**: @executeautomation/playwright-mcp-server@1.0.6
- **Chromium 버전**: 141.0.7390.37 (build v1194)
- **브라우저 설치 경로**: `~/Library/Caches/ms-playwright/chromium-1194`
- **개발 서버**: Storybook (http://localhost:6006)

#### 설정 방법

1. **브라우저 설치** (시스템 기본 경로 사용 - 권장)

   ```bash
   npx playwright install chromium
   ```

   자동으로 `~/Library/Caches/ms-playwright/chromium-1194`에 설치됩니다.

2. **Claude Code 설정**

   ```json
   {
     "mcpServers": {
       "playwright": {
         "command": "npx",
         "args": ["-y", "@executeautomation/playwright-mcp-server"],
         "disabled": false
       }
     }
   }
   ```

3. **Storybook 서버 실행**
   ```bash
   npm run storybook
   ```

#### 테스트 예시

**Color Story 페이지 테스트**:

```json
{
  "url": "http://localhost:6006/?path=/story/foundation-color--primary",
  "timeout": 120000
}
```

**스크린샷 캡처**:

```json
{ "name": "color-story-screenshot", "fullPage": true }
```

**특정 스토리로 이동**:

```json
{
  "url": "http://localhost:6006/?path=/story/ui-button--default",
  "timeout": 60000
}
```

### 예시 2: neo-flow-viz 프로젝트

#### 환경 정보

- **개발 서버**: Vite Preview (http://127.0.0.1:4173)
- **브라우저 설치**: 커스텀 경로 사용

#### 설정 방법

- 브라우저 설치 경로 예시 (커스텀 경로 지정)

  ```bash
  PLAYWRIGHT_BROWSERS_PATH=/Users/tw.kim/.nvm/versions/node/v22.14.0/lib/node_modules/@executeautomation/playwright-mcp-server/node_modules/playwright-core/.local-browsers \
    npx playwright install chromium
  ```

- MCP가 `chromium-1179` 경로를 기대할 때 심볼릭 링크 예시
  ```bash
  ln -sfn /Users/tw.kim/.nvm/.../.local-browsers/chromium-1193 \
         /Users/tw.kim/.nvm/.../.local-browsers/chromium-1179
  ```

#### 테스트 예시

- 자주 사용하는 Playwright MCP 호출 예시
  ```json
  { "url": "http://127.0.0.1:4173/test-6", "timeout": 120000 }
  ```
- 샘플 입력/선택자 예시
  ```json
  { "selector": "input[name=\"httpUrl\"]", "value": "http://localhost:7474" }
  ```
  ```json
  { "selector": "select[name=\"authType\"]", "value": "bearer" }
  ```
