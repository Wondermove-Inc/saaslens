# Repository Guidelines

> **보고/설명 언어 지침**: 작업 내용을 설명하거나 보고할 때는 반드시 한국어를 사용하고, 주니어 개발자에게 설명하듯 쉽게 풀어서 전달합니다.

## Product Direction & Scope (PRD v0.1)

- **MVP 목표**: 비용 5% 절감 기회(Top 10 지출 기준) 식별, 30일 내 갱신 리스크 100% 표출, 미승인/검토 필요 앱 100% 식별, 알림 열람/확인율 70%+, 핵심 페이지 로드 < 2s.
- **IA/중복 정리**: 연동 메뉴는 단일 진입점(`/integrations`)으로 통합하고 설정 내 섹션은 링크만 유지. 대시보드는 요약 중심, 상세 분석은 리포트에 위치. Tasks/Kanban은 하나의 "작업 관리"로만 유지(보드/테이블 토글)하며 V2 전까지 데모/비공개 처리. 결제수단/구독/갱신 흐름은 연결하여 관리.
- **범위(포함)**: 대시보드 요약, 인벤토리(앱/사용자), 구독+갱신 캘린더, 연동(Google/Okta/Entra 읽기), 비용·갱신·감사 리포트, 알림 설정(이메일), 온보딩·OAuth, Shadow IT/AI 탐지(Level 1 카드 데이터), FleetDM 기반 사용 모니터링, LLM Confirm 플로우.
- **범위(제외/후순위)**: 다중 테마/브랜딩, 워크플로우 자동화·예산 관리·Custom Integration, Tasks/Kanban 고도화, Slack/Teams 알림, Storybook 정리 등 V2 이후로 분리.
- **리스트/필터 정책**: 앱/구독/연동 테이블 필터는 검색+상태(+카테고리/주기 등 핵심) 위주로 단순화, 나머지 복합 필터/컬럼 토글은 V2로 이관.
- **핵심 기능 지침**:
  - 카드 결제 기반 SaaS 탐지 시 4-Layer 매칭(정확 패턴 → 부분 → 퍼지 유사도 ≥80% → LLM) 적용, known_saas/known_non_saas 우선, 미매칭 건만 LLM 호출. Confirm 결과는 리스트에 누적 학습.
  - LLM 신뢰도 80점 이상은 자동 SaaS 편입, 50~80점은 Confirm UI + 이메일 알림 필수, 50점 미만은 Non-SaaS 캐시에 저장.
  - 반복 결제 패턴: 동일 가맹점 2회 이상, 간격 표준편차 < 5일이면 반복으로 간주, 평균 간격으로 주기(월 < 25일, 연 > 300일)와 다음 결제일 예측.
  - FleetDM: 초대 멤버 대상 에이전트 설치 안내 및 미설치 리마인더(주 1회), 3시간 주기로 앱/사용 데이터 수집, 대시보드에 설치율·미설치 목록 노출.
  - 퇴사자 미회수 탐지: UserAppAccess 기반 회수 필요 앱 스캔 후 알림/대시보드 반영.
  - Shadow AI(Level 1): 카드 데이터에서 AI 키워드 DB 매칭(예: ChatGPT, Claude, Copilot 등)으로 미승인 AI 도구를 표시하고 검토/차단/승인 전환 액션 제공.
  - 알림 정책: MVP는 이메일만, 갱신 30/60/90일 전·보안/비용/퇴사자 알림 카테고리 on/off 지원.
  - 권한 매트릭스: Admin=전체 CRUD/동기화/알림 수정, Member=조회+생성(일부)·본인 알림 수정, Viewer=조회만. `useCan`/AccessControl로 UI/액션 제한 유지.

## Project Structure & Module Organization

- **`src/`** holds the Next.js app (`app/` route groups), reusable UI in `components/`, and domain-specific modules (dashboards, forms, tables, charts).
- **`packages/ui-registry/`** contains shared shadcn-based primitives (sidebar, inputs, hooks) and Storybook configs. Treat it as the source of truth for UI atoms.
- **`docs/`** stores plans, specs, and checklists; keep process updates here.
- **Testing assets** live alongside components (e.g., `src/components/layouts/app-sidebar.test.tsx`); HTML coverage exports land in `/html/`.

## Build, Test, and Development Commands

- `npm run dev`: launch the Next.js app with Turbopack.
- `npm run build` / `npm run start`: create and serve a production build.
- `npm run test`: execute Vitest specs (unit + component); `npm run test:watch` / `npm run test:coverage` / `npm run test:ui` 활용해 TDD 사이클 유지.
- `npm run quality`: lint, type-check, and run tests sequentially; required before pushing.
- `npm run storybook` (inside `packages/ui-registry`): preview shared UI components.
- DB/배포 관련: `npm run db:generate` / `npm run db:push` / `npm run db:migrate`, `npm run storybook:build`, `npm run quality:full` (coverage 포함) 참고.

## Coding Style & Naming Conventions

- Language: TypeScript + React 19, Next.js app router. Prefer functional components and `use client` only when needed.
- Formatting: enforced by Prettier (`.prettierrc`) and Tailwind plugin; lint with `eslint.config.mjs`. Run `npm run format` or `npm run lint:fix` before committing.
- Naming: PascalCase for components (`AppSidebar`), camelCase for hooks/utilities, kebab-case route folders, and descriptive file names (`app-sidebar.test.tsx`). Co-locate tests with implementation.
- 파일 길이 제한: 단일 소스 파일 500줄 초과 금지(400줄 접근 시 분리 계획). 상수/타입/하위 컴포넌트로 분리.
- UI 컴포넌트: shadcn/ui를 필수로 사용하고 기본 버튼/인풋 등을 재생성하지 말 것. 도메인 컴포넌트는 shadcn/ui 합성으로 구현.

## Testing Guidelines

- Framework: Vitest + Testing Library; HTML reports stored in `/html`.
- TDD 원칙: 테스트 먼저 작성(RED-GREEN-REFACTOR), 모든 소스 파일 옆에 `.test.ts(x)` 생성. `.skip` 방치는 이슈 링크 없이는 금지.
- Coverage 목표: 전체 80% 이상, 디렉토리별 `src/actions`/`src/lib/services` 90%, `src/lib/utils` 95%, `src/hooks`/`src/stores` 85%, `src/components` 80% 이상. 커버리지 부족 시 추가 테스트 필수.
- Minimum expectation: cover new components with interaction tests; target ≥80% coverage for shared layouts and critical flows.
- Name tests `{component}.test.tsx` or `{hook}.test.ts`; keep assertions focused and mock Next APIs (`next/navigation`) explicitly.
- Run `npm run test` locally; use `npm run quality` (또는 `npm run quality:full`) before merging complex features.

## Commit & Pull Request Guidelines

- Compose conventional, action-oriented commit messages (`feat: add dashboard sidebar`, `fix: handle sidebar cookie`).
- PR checklist: describe intent, list key changes, attach screenshots for UI updates, reference related issues/docs (e.g., `docs/plan/...`). Ensure `npm run quality` passes and link any Storybook demos if UI primitives changed.
- Avoid mixing feature work with formatting-only changes; split commits when introducing new packages or migrating shared UI to `ui-registry`.

## Planning & Documentation Rules

- 계획/체크리스트 항목은 `[ ]` 체크박스 형식을 사용하고 진행 상황을 실시간으로 업데이트(RED/GREEN/REFACTOR 단계 기록 포함). 모든 보고/설명은 한국어로, 주니어 개발자에게 설명하듯 쉽게 작성.
- 새 작업 시작 시 docs/plan/에 진행 로그를 남기고, 테스트·품질 실행 여부를 명시. PRD 범위(포함/제외·IA 정리·핵심 기능 지침) 대비 작업 방향을 먼저 기록.

## Security & Configuration Tips

- Keep environment variables in `.env` (copy from `.env.example`) and never commit secrets.
- When updating sidebar or header behavior, ensure cookie usage (`sidebar_state`) complies with privacy requirements and remains scoped to same-site pages.
- Vercel 배포 시 Git 커밋 이메일이 Vercel 계정과 일치해야 하며, 배포 전 `npm run build`와 `npm run quality` 통과 상태를 확인. 필수 환경 변수(`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`)를 설정할 것.

## Prohibited Actions

- 테스트 없이 기능 코드 작성, `.skip` 테스트 방치, any 남용, 커버리지 80% 미만 상태 유지, 500줄 초과 파일 방치, shadcn/ui 기본 컴포넌트 재생성, `npm run quality` 미통과 상태로 커밋, Vercel 계정과 다른 이메일로 커밋.
- PRD에서 V2/후순위로 분류된 기능을 가드 없이 기본 UI에 노출하거나 MVP 범위와 혼합 구현.
