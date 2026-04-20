<p align="center">
  <a href="https://github.com/Wondermove-Inc/saaslens"><img src="docs/screenshots/hero-banner.svg" alt="saaslens" /></a>
</p>
<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">中文</a>
</p>
<p align="center">
  <strong>오픈소스 SaaS 비용 인텔리전스 플랫폼.</strong><br/>
  미사용 구독을 발견하고, 결제를 앱에 매칭하고, 좌석과 비용을 관리하세요 — 모두 셀프 호스팅으로.
</p>
<p align="center">
  <a href="https://github.com/Wondermove-Inc/saaslens/actions/workflows/ci.yml"><img src="https://github.com/Wondermove-Inc/saaslens/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/Wondermove-Inc/saaslens/stargazers"><img src="https://img.shields.io/github/stars/Wondermove-Inc/saaslens" alt="GitHub Stars" /></a>
  <a href="https://github.com/Wondermove-Inc/saaslens/graphs/contributors"><img src="https://img.shields.io/github/contributors/Wondermove-Inc/saaslens" alt="Contributors" /></a>
</p>
<p align="center"><a href="#빠른-시작">빠른 시작</a> · <a href="#주요-기능">주요 기능</a> · <a href="docs/guide/">문서</a> · <a href="#로드맵">로드맵</a> · <a href="CONTRIBUTING.md">기여하기</a></p>

---

<p align="center"><sub>saaslens가 유용하다면 <a href="https://github.com/Wondermove-Inc/saaslens">star</a>를 눌러주세요. 더 많은 사람들이 프로젝트를 발견할 수 있습니다.</sub></p>

https://github.com/user-attachments/assets/47632ce2-cef5-4e8d-90a1-d4c6627099b3

## 왜 saaslens인가

중소규모 팀은 수십 개의 SaaS 도구를 사용하지만, 다음 세 가지 질문에 동시에 답할 수 있는 곳이 없습니다:

- **어떤 앱에 비용을 지불하고 있는가?**
- **어떤 좌석이 아직 사용 중이고, 어떤 좌석이 미사용인가?**
- **법인카드 결제 내역이 실제로 해당 앱과 매칭되는가?**

Zylo, Productiv, Cleanspend 같은 상용 SaaS 관리 도구가 이 문제를 해결하지만, 데이터를 외부에 맡기고 좌석당 요금을 부과합니다.

**saaslens**는 오픈소스 대안입니다. 결제 피드를 SaaS 앱과 매칭하고, 좌석 활용도를 추적하며, 미사용 좌석과 이상 지출을 발견합니다 — 모두 **셀프 호스팅**으로, **데이터가 여러분의 인프라에 머무릅니다**.

## 주요 기능

<table>
<tr><td width="50%">

### 구독 및 앱 인벤토리

조직에서 사용하는 모든 SaaS 앱의 단일 진실 공급원. 결제 피드, SSO, 브라우저 확장 프로그램으로 앱을 자동 발견합니다.

</td><td width="50%">

### 결제-앱 매칭

법인카드 및 ERP 결제 내역을 알려진 SaaS 앱에 자동 매칭. 가맹점 기술자를 정규화하고 지역별 프리셋(예: 한국 카드사)을 지원합니다.

</td></tr>
<tr><td width="50%">

### 좌석 및 사용량 추적

누가 무엇에 접근 권한이 있는지 추적. 퇴사자의 미사용 좌석을 식별하고, 다음 청구 주기 전에 라이선스를 회수합니다.

</td><td width="50%">

### 부서별 비용 분석

부서, 팀, 비용 센터별로 SaaS 지출을 분석. 트렌드를 파악하고 이상 지출을 알리며 재무 검토용 리포트를 생성합니다.

</td></tr>
<tr><td width="50%">

### 브라우저 확장 프로그램

SaaS 로그인 활동을 캡처하는 선택적 Chrome 확장. 개인 카드로 결제되어 중앙에서 추적되지 않는 섀도우 IT를 발견합니다.

</td><td width="50%">

### AI 기반 인사이트

SaaS 포트폴리오를 분석하고 최적화를 추천하는 내장 AI 에이전트: 중복 도구 통합, 계약 재협상, 미사용 좌석 회수.

</td></tr>
</table>

<p align="center"><img src="docs/screenshots/subscriptions.png" alt="saaslens 구독 관리" width="800" /><br/><sub>결제 매칭 및 좌석 추적이 포함된 구독 관리</sub></p>
<p align="center"><img src="docs/screenshots/cost-analytics.png" alt="saaslens 비용 분석" width="800" /><br/><sub>이상 감지 및 비용 분포 분석</sub></p>

## 작동 방식

<p align="center"><img src="docs/screenshots/architecture.svg" alt="saaslens 아키텍처" width="800" /></p>

1. **결제 수집** — CSV/ERP 가져오기 또는 은행/카드 커넥터를 통해 결제를 수집합니다.
2. **사용량 캡처** — Google Workspace SSO, Chrome 확장 프로그램, 또는 수동 입력으로 캡처합니다.
3. **조정** — 결제, 좌석, 부서를 하나의 정규 모델로 조정합니다 — 처음부터 멀티테넌트.
4. **실행** — 대시보드에서 앱을 미사용으로 표시하고, 좌석을 회수하고, AI 에이전트에게 추천을 요청합니다.

## 경쟁 비교

| 기능          | saaslens | Zylo | Productiv | Cleanspend |
| ------------- | :------: | :--: | :-------: | :--------: |
| 오픈소스      | **Yes**  |  No  |    No     |     No     |
| 셀프 호스팅   | **Yes**  |  No  |    No     |     No     |
| 데이터 소유권 | **100%** | 벤더 |   벤더    |    벤더    |
| 결제 매칭     | **Yes**  | Yes  |  제한적   |    Yes     |
| 좌석 추적     | **Yes**  | Yes  |    Yes    |     No     |
| AI 추천       | **Yes**  | Yes  |    Yes    |     No     |
| 좌석당 가격   | **무료** | $$$  |    $$$    |     $$     |

## 기술 스택

| 레이어     | 기술                                            |
| ---------- | ----------------------------------------------- |
| 프론트엔드 | Next.js 15 (App Router) + React 19 + TypeScript |
| UI         | Shadcn/ui + Radix + Tailwind CSS 4              |
| 데이터     | Refine 5 + TanStack React Query/Table           |
| 인증       | NextAuth 5 + Prisma Adapter                     |
| ORM        | Prisma 6 / PostgreSQL                           |
| AI         | Anthropic AI SDK + Vercel AI SDK                |
| 캐시       | Upstash Redis                                   |

## 빠른 시작

### 옵션 A: Docker (권장)

```bash
git clone https://github.com/Wondermove-Inc/saaslens.git && cd saaslens
docker compose up -d
# → http://localhost:3000
```

### 옵션 B: 로컬 (Node.js 20+, PostgreSQL 14+)

```bash
git clone https://github.com/Wondermove-Inc/saaslens.git && cd saaslens
npm install --legacy-peer-deps  # React 19 peer dep 호환성. 기능 영향 없음.
cp .env.example .env.local      # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL 설정
npx prisma migrate deploy && npx prisma generate
npm run dev                     # → http://localhost:3000
```

## 로드맵

- [ ] **v0.1** — 최초 공개 릴리스 (2026년 Q2)
- [ ] **v0.2** — 결제 통합 플러그인 시스템 (2026년 Q3)
- [ ] **v0.3** — 셀프 호스팅 Docker Compose 퀵스타트 (2026년 Q3)
- [ ] **v1.0** — 안정 API, 다국어 지원 확장 (2026년 Q4)

아이디어가 있으신가요? [Discussion을 열어주세요](../../discussions).

## 커뮤니티

- [GitHub Discussions](../../discussions) — 질문하고 아이디어 공유
- [GitHub Issues](../../issues) — 버그 리포트 및 기능 요청
- [CONTRIBUTING.md](CONTRIBUTING.md) — 기여 방법

## 라이선스

MIT © 2026 Wondermove-Inc. [LICENSE](LICENSE) 참조.
