# Vercel 배포 가이드

## 개요

SaaS Management Platform을 Vercel에 배포하기 위한 가이드입니다.

---

## 1. 사전 준비

### 1.1 필수 계정

- [Vercel](https://vercel.com) 계정
- [Supabase](https://supabase.com) 프로젝트 (PostgreSQL)
- [Google Cloud Console](https://console.cloud.google.com) 프로젝트 (OAuth)

### 1.2 로컬 환경 확인

```bash
# 빌드 테스트
npm run build

# 품질 검사
npm run quality
```

---

## 2. 환경 변수 설정

### 2.1 필수 환경 변수 (Phase 4 배포)

| 변수명                 | 설명                            | 획득 방법                        |
| ---------------------- | ------------------------------- | -------------------------------- |
| `DATABASE_URL`         | Supabase PostgreSQL 연결 문자열 | Supabase > Settings > Database   |
| `NEXTAUTH_SECRET`      | NextAuth 세션 암호화 키         | `openssl rand -base64 32`        |
| `NEXTAUTH_URL`         | 앱 URL                          | `https://your-domain.vercel.app` |
| `GOOGLE_CLIENT_ID`     | Google OAuth 클라이언트 ID      | Google Cloud Console             |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿  | Google Cloud Console             |

### 2.2 선택 환경 변수 (Sprint 2+)

| 변수명                      | 설명                         | 필요 시점      |
| --------------------------- | ---------------------------- | -------------- |
| `GOOGLE_ADMIN_CLIENT_EMAIL` | Google Workspace 서비스 계정 | SSO 연동 시    |
| `GOOGLE_ADMIN_PRIVATE_KEY`  | 서비스 계정 Private Key      | SSO 연동 시    |
| `GOOGLE_ADMIN_SUBJECT`      | 관리자 이메일                | SSO 연동 시    |
| `UPSTASH_REDIS_REST_URL`    | Redis URL                    | 캐싱 필요 시   |
| `UPSTASH_REDIS_REST_TOKEN`  | Redis 토큰                   | 캐싱 필요 시   |
| `RESEND_API_KEY`            | 이메일 API 키                | 알림 기능 시   |
| `RESEND_FROM_EMAIL`         | 발신 이메일                  | 알림 기능 시   |
| `R2_ACCOUNT_ID`             | Cloudflare R2 계정 ID        | 파일 업로드 시 |
| `R2_ACCESS_KEY_ID`          | R2 Access Key                | 파일 업로드 시 |
| `R2_SECRET_ACCESS_KEY`      | R2 Secret Key                | 파일 업로드 시 |
| `R2_BUCKET_NAME`            | R2 버킷명                    | 파일 업로드 시 |
| `CRON_SECRET`               | Cron Job 인증 키             | Cron 사용 시   |

---

## 3. Supabase 설정

### 3.1 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. **Settings > Database**에서 Connection String 복사
3. `[YOUR-PASSWORD]`를 실제 비밀번호로 교체

### 3.2 DATABASE_URL 형식

```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### 3.3 마이그레이션 적용

```bash
# 로컬에서 Prisma 클라이언트 생성
npm run db:generate

# 프로덕션 DB에 스키마 적용
npm run db:push
```

---

## 4. Google OAuth 설정

### 4.1 Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. **APIs & Services > Credentials** 이동
3. **+ CREATE CREDENTIALS > OAuth client ID** 클릭
4. Application type: **Web application** 선택

### 4.2 OAuth 설정값

**Authorized JavaScript origins:**

```
https://your-domain.vercel.app
```

**Authorized redirect URIs:**

```
https://your-domain.vercel.app/api/auth/callback/google
```

### 4.3 환경 변수 복사

- **Client ID** → `GOOGLE_CLIENT_ID`
- **Client secret** → `GOOGLE_CLIENT_SECRET`

---

## 5. Vercel 배포

### 5.1 GitHub 연결

1. [Vercel Dashboard](https://vercel.com/dashboard)에서 **Add New > Project**
2. GitHub 저장소 선택
3. **Import** 클릭

### 5.2 프로젝트 설정

| 설정             | 값              |
| ---------------- | --------------- |
| Framework Preset | Next.js         |
| Root Directory   | `./`            |
| Build Command    | `npm run build` |
| Install Command  | `npm ci`        |
| Output Directory | `.next`         |

### 5.3 환경 변수 입력

**Environment Variables** 섹션에서 다음 변수 추가:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (자동으로 설정되지만 명시적으로 추가 권장)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 5.4 배포

1. **Deploy** 클릭
2. 빌드 로그 확인
3. 배포 완료 후 URL 확인

---

## 6. 배포 후 확인

### 6.1 기본 동작 테스트

1. 배포된 URL 접속
2. `/login` 리다이렉트 확인
3. Google 로그인 시도
4. `/onboarding`으로 리다이렉트 확인 (첫 로그인)
5. 조직 생성 후 `/dashboard` 접근 확인

### 6.2 문제 발생 시

1. **Vercel > Project > Logs** 확인
2. 환경 변수 설정 재확인
3. Google OAuth Redirect URI 확인

---

## 7. 도메인 설정 (선택)

### 7.1 커스텀 도메인 추가

1. **Vercel > Project > Settings > Domains**
2. 도메인 추가 (예: `smp.yourdomain.com`)
3. DNS 설정 (CNAME 또는 A 레코드)

### 7.2 환경 변수 업데이트

커스텀 도메인 사용 시 다음 변수 업데이트:

- `NEXTAUTH_URL` → `https://smp.yourdomain.com`
- Google OAuth Redirect URI 업데이트

---

## 8. CI/CD 자동화

### 8.1 자동 배포 (기본 설정)

- `main` 브랜치에 push → 자동 프로덕션 배포
- PR 생성 → Preview 배포 자동 생성

### 8.2 Branch Protection 권장 설정

- `main` 브랜치 직접 push 금지
- PR 필수 + 최소 1명 리뷰
- CI 통과 필수 (`npm run quality`)

---

## 체크리스트

### 배포 전

- [ ] `npm run build` 성공
- [ ] `npm run quality` 통과
- [ ] Supabase 프로젝트 생성
- [ ] Google OAuth 자격 증명 생성
- [ ] `NEXTAUTH_SECRET` 생성

### 배포 시

- [ ] Vercel 환경 변수 모두 설정
- [ ] Google OAuth Redirect URI 추가

### 배포 후

- [ ] 로그인 플로우 테스트
- [ ] 조직 생성 테스트
- [ ] 대시보드 접근 테스트

---

## 9. Git Author 설정 (중요)

Vercel 배포가 실패하는 주요 원인 중 하나는 Git 커밋 이메일이 Vercel 계정과 일치하지 않는 경우입니다.

```bash
# 현재 설정 확인
git config user.email

# Vercel 계정 이메일로 설정
git config user.email "your-vercel-account@example.com"
```

자세한 내용은 [12-git-workflow.md](./12-git-workflow.md) 참조.

---

## 관련 문서

- [06-coverage-checklist.md](./06-coverage-checklist.md) - PR 전 품질 검사
- [12-git-workflow.md](./12-git-workflow.md) - Git 워크플로우 및 배포 연동
