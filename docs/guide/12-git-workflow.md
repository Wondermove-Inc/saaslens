# 12. Git 워크플로우 가이드

이 문서는 SaaS Management Platform의 Git 브랜치 전략, 커밋 컨벤션, PR 프로세스를 설명합니다.

## 목차

1. [브랜치 전략](#1-브랜치-전략)
2. [커밋 메시지 컨벤션](#2-커밋-메시지-컨벤션)
3. [Pull Request 프로세스](#3-pull-request-프로세스)
4. [코드 리뷰 가이드](#4-코드-리뷰-가이드)
5. [Vercel 배포 연동](#5-vercel-배포-연동)
6. [체크리스트](#6-체크리스트)

---

## 1. 브랜치 전략

### 1.1 브랜치 구조

```
main (production)
  │
  ├── feature/*     ─ 새 기능 개발
  ├── fix/*         ─ 버그 수정
  ├── refactor/*    ─ 리팩토링
  ├── docs/*        ─ 문서 작업
  └── chore/*       ─ 설정, 의존성 등
```

### 1.2 브랜치 명명 규칙

| 접두사      | 용도               | 예시                                 |
| ----------- | ------------------ | ------------------------------------ |
| `feature/`  | 새로운 기능        | `feature/subscription-renewal-alert` |
| `fix/`      | 버그 수정          | `fix/login-redirect-loop`            |
| `refactor/` | 코드 리팩토링      | `refactor/apps-service-cleanup`      |
| `docs/`     | 문서 작업          | `docs/api-reference`                 |
| `chore/`    | 설정, 빌드, 의존성 | `chore/upgrade-nextjs`               |

### 1.3 브랜치 생성

```bash
# main에서 새 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/my-feature

# 작업 완료 후 푸시
git push -u origin feature/my-feature
```

### 1.4 브랜치 규칙

- **main**: 항상 배포 가능한 상태 유지
- **feature 브랜치**: 작업 완료 후 PR 생성 → 머지 → 삭제
- **직접 main 푸시 금지**: 모든 변경은 PR을 통해 진행

---

## 2. 커밋 메시지 컨벤션

### 2.1 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 Type (필수)

| Type       | 설명                      | 예시                                      |
| ---------- | ------------------------- | ----------------------------------------- |
| `feat`     | 새로운 기능               | `feat(apps): 앱 소유자 지정 기능 추가`    |
| `fix`      | 버그 수정                 | `fix(auth): 세션 만료 시 리다이렉트 수정` |
| `refactor` | 리팩토링 (기능 변경 없음) | `refactor(apps): 서비스 레이어 분리`      |
| `test`     | 테스트 추가/수정          | `test(apps): createApp 단위 테스트 추가`  |
| `docs`     | 문서 작성/수정            | `docs: TDD 가이드 추가`                   |
| `chore`    | 빌드, 설정, 의존성        | `chore: vitest 설정 업데이트`             |
| `style`    | 코드 스타일 (포맷팅 등)   | `style: prettier 적용`                    |
| `perf`     | 성능 개선                 | `perf(db): 앱 목록 쿼리 최적화`           |

### 2.3 Scope (선택)

영향받는 모듈/기능 영역:

```
apps, subscriptions, users, auth, integrations,
dashboard, reports, settings, api, db, ui
```

### 2.4 Subject (필수)

- 한국어 또는 영어
- 50자 이내
- 명령문 형태 (동사로 시작)
- 마침표 생략

### 2.5 예시

```bash
# 좋은 예시
feat(apps): 앱 검색 필터 기능 추가
fix(auth): 로그인 후 리다이렉트 오류 수정
refactor(subscriptions): 구독 서비스 코드 정리
test(apps): createApp Server Action 테스트 추가
docs: 개발 가이드 문서 업데이트
chore: Next.js 15.5 업그레이드

# 나쁜 예시
updated code                    # 너무 모호
fix bug                         # 무엇을 수정했는지 불명확
WIP                             # 임시 커밋
앱 기능 추가                    # type 누락
```

### 2.6 Body (선택)

- 72자에서 줄바꿈
- "무엇을"보다 "왜"를 설명
- 변경 사항의 동기와 맥락 제공

```bash
git commit -m "feat(apps): 앱 소유자 지정 기능 추가

- 앱별로 담당자를 지정하여 책임 소재 명확화
- 소유자는 조직 내 사용자만 가능 (Multi-tenant 검증)
- 관련 감사 로그 생성"
```

---

## 3. Pull Request 프로세스

### 3.1 PR 생성 전 체크리스트

```bash
# 1. 코드 품질 검사
npm run quality  # lint + type-check + test

# 2. 테스트 커버리지 확인
npm run test:coverage

# 3. 변경 사항 확인
git diff main...HEAD
```

### 3.2 PR 템플릿

```markdown
## 변경 사항

- 무엇을 변경했는지 요약

## 변경 이유

- 왜 이 변경이 필요한지

## 테스트

- [ ] 단위 테스트 작성/수정
- [ ] `npm run quality` 통과
- [ ] 로컬에서 수동 테스트 완료

## 스크린샷 (UI 변경 시)

## 관련 이슈

Closes #123
```

### 3.3 PR 크기 가이드

| 크기   | 변경 라인 | 권장        |
| ------ | --------- | ----------- |
| Small  | < 100     | 이상적      |
| Medium | 100 - 300 | 적절        |
| Large  | 300 - 500 | 분할 고려   |
| XL     | > 500     | 반드시 분할 |

### 3.4 PR 생성 명령어

```bash
# GitHub CLI 사용
gh pr create --title "feat(apps): 앱 소유자 지정 기능" --body "설명..."

# 또는 웹에서 직접 생성
```

---

## 4. 코드 리뷰 가이드

### 4.1 리뷰어 체크리스트

#### 기능 검증

- [ ] 요구사항에 맞게 구현되었는가?
- [ ] 엣지 케이스가 처리되었는가?
- [ ] 에러 핸들링이 적절한가?

#### 코드 품질

- [ ] 500줄 제한을 준수하는가?
- [ ] 함수/메서드가 단일 책임을 가지는가?
- [ ] 네이밍이 명확한가?
- [ ] 불필요한 주석이 없는가?

#### 테스트

- [ ] 테스트가 있는가?
- [ ] 테스트가 의미 있는가? (커버리지만을 위한 테스트가 아닌가)
- [ ] 80% 이상 커버리지를 달성하는가?

#### 보안

- [ ] organizationId로 Multi-tenant 격리가 되어 있는가?
- [ ] 민감한 정보가 노출되지 않는가?
- [ ] SQL Injection, XSS 등 취약점이 없는가?

#### 성능

- [ ] N+1 쿼리가 없는가?
- [ ] 불필요한 데이터 로딩이 없는가?

### 4.2 리뷰 코멘트 유형

| 접두사         | 의미             | 필수 대응 |
| -------------- | ---------------- | :-------: |
| `[BLOCKER]`    | 반드시 수정 필요 |    Yes    |
| `[SUGGESTION]` | 개선 제안        |    No     |
| `[QUESTION]`   | 질문/확인 필요   |  Answer   |
| `[NIT]`        | 사소한 개선      |    No     |

### 4.3 리뷰 예시

```markdown
[BLOCKER] organizationId 필터가 누락되었습니다.
다른 조직의 데이터에 접근할 수 있습니다.

[SUGGESTION] 이 로직을 별도 함수로 분리하면
테스트하기 쉬워질 것 같습니다.

[QUESTION] 이 조건문의 의도가 무엇인가요?
edge case 처리인지 확인이 필요합니다.

[NIT] 변수명을 `data` 대신 `appData`로 하면
더 명확할 것 같습니다.
```

---

## 5. Vercel 배포 연동

### 5.1 Git Author 설정

**중요**: Git 커밋 이메일이 Vercel 계정 이메일과 일치해야 합니다.

```bash
# 현재 설정 확인
git config user.email

# Vercel 계정 이메일로 설정
git config user.email "your-email@example.com"

# 전역 설정
git config --global user.email "your-email@example.com"
```

### 5.2 자동 배포

| 브랜치      | 배포 환경  |
| ----------- | ---------- |
| `main`      | Production |
| `feature/*` | Preview    |

### 5.3 Preview 배포 활용

```bash
# PR 생성 시 자동으로 Preview URL 생성
# https://saaslens-<hash>.vercel.app

# Preview에서 테스트 후 main 머지
```

### 5.4 배포 실패 시

1. Vercel 대시보드에서 빌드 로그 확인
2. 로컬에서 빌드 테스트: `npm run build`
3. 환경변수 확인

---

## 6. 체크리스트

### 브랜치 생성 시

- [ ] main에서 최신 상태로 분기
- [ ] 명명 규칙 준수 (feature/, fix/, etc.)

### 커밋 시

- [ ] 커밋 메시지 컨벤션 준수
- [ ] 의미 있는 단위로 커밋 분리
- [ ] WIP 커밋 지양

### PR 생성 전

- [ ] `npm run quality` 통과
- [ ] 테스트 커버리지 80% 이상
- [ ] PR 크기 500줄 이하

### PR 생성 시

- [ ] 명확한 제목과 설명
- [ ] 관련 이슈 링크
- [ ] 테스트 방법 명시

### 코드 리뷰 시

- [ ] Multi-tenant 격리 확인
- [ ] 테스트 존재 여부 확인
- [ ] 코드 품질 규칙 준수 확인

### 머지 후

- [ ] 브랜치 삭제
- [ ] Vercel 배포 확인

---

## 빠른 참조

### 자주 사용하는 명령어

```bash
# 브랜치 생성
git checkout -b feature/new-feature

# 커밋
git add .
git commit -m "feat(scope): 설명"

# 푸시
git push -u origin feature/new-feature

# PR 생성 (GitHub CLI)
gh pr create

# main 최신화 후 리베이스
git checkout main && git pull
git checkout feature/my-feature
git rebase main

# 충돌 해결 후 계속
git add .
git rebase --continue
```

### 커밋 타입 요약

```
feat     새 기능
fix      버그 수정
refactor 리팩토링
test     테스트
docs     문서
chore    설정/의존성
style    코드 스타일
perf     성능 개선
```

---

## 관련 문서

- [01-tdd-quick-start.md](./01-tdd-quick-start.md) - TDD 빠른 시작
- [02-development-principles.md](./02-development-principles.md) - 개발 원칙
- [06-coverage-checklist.md](./06-coverage-checklist.md) - 커버리지 체크리스트
- [07-vercel-deployment.md](./07-vercel-deployment.md) - Vercel 배포
