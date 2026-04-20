# i18n 번역 미완료 파일 정리

## 현재 상태

### 완료된 영역

- ✅ AppHeader/AppSidebar
- ✅ 대시보드 (헤더/카드/필터/차트/보안/내보내기)
- ✅ 인증/온보딩 페이지
- ✅ 설정 화면
- ✅ 디바이스 화면
- ✅ 구독 (Subscriptions)
- ✅ 앱 인벤토리 (Apps)
- ✅ 연동 (Integrations)
- ✅ 리포트 (Reports)
- ✅ 결제 (Payments)
- ✅ 사용자 (Users)
- ✅ 팀 (Teams)
- ✅ 작업 관리 (Tasks)
- ✅ 칸반 보드 (Kanban)
- ✅ 카드 관리 (Cards)
- ✅ CSV 일괄 등록 (Import)
- ✅ 팀 멤버 관리 (Team Members)

### 미완료 영역

계획 문서(`docs/plan/active/2026-01-16-i18n-replacement.md`)에 따르면 다음 영역들이 아직 번역이 적용되지 않았습니다:

#### 1. ✅ 구독 (Subscriptions) - 20개 파일 (완료)

주요 파일:

- ✅ `src/components/subscriptions/subscription-list.tsx` - 구독 목록 (상태 라벨, 필터, 컬럼 헤더 등)
- ✅ `src/components/subscriptions/subscription-form.tsx` - 구독 폼
- ✅ `src/components/subscriptions/subscription-detail.tsx` - 구독 상세
- ✅ `src/components/subscriptions/subscription-page-client.tsx` - 구독 페이지 클라이언트
- ✅ `src/components/subscriptions/renewal-calendar.tsx` - 갱신 캘린더
- ✅ `src/components/subscriptions/notification-settings.tsx` - 알림 설정
- ✅ `src/components/subscriptions/subscription-detail-app-card.tsx` - 앱 카드
- ✅ `src/components/subscriptions/renewal-day-detail.tsx` - 갱신일 상세
- ✅ `src/components/subscriptions/subscription-form.constants.ts` - 폼 상수
- ✅ `src/components/subscriptions/subscription-detail.constants.ts` - 상세 상수
- 기타 관련 컴포넌트 및 테스트 파일들

하드코딩된 텍스트 예시:

- ~~"앱", "상태", "결제 주기", "금액", "라이선스", "갱신일", "자동 갱신"~~ ✅
- ~~"활성", "만료", "취소됨", "대기 중"~~ ✅
- ~~"월간", "분기", "연간", "일회성"~~ ✅
- ~~"구독 삭제", "수정", "삭제" 등~~ ✅

#### 2. ✅ 앱 인벤토리 (Apps) - 14개 파일 (완료)

주요 파일:

- ✅ `src/components/apps/app-list.tsx` - 앱 목록
- ✅ `src/components/apps/app-form.tsx` - 앱 폼
- ✅ `src/components/apps/app-detail.tsx` - 앱 상세
- ✅ `src/components/apps/apps-page-client.tsx` - 앱 페이지 클라이언트
- ✅ `src/components/apps/app-edit-form.tsx` - 앱 수정 폼
- ✅ `src/components/apps/app-form-fields.tsx` - 앱 폼 필드
- ✅ `src/components/apps/app-detail-client.tsx` - 앱 상세 클라이언트
- ✅ `src/lib/app-status.ts` - 앱 상태 관련 함수
- 기타 관련 컴포넌트 및 테스트 파일들

하드코딩된 텍스트 예시:

- ~~"앱 이름", "카테고리", "상태", "구독", "사용자", "등록일"~~ ✅
- ~~"등록된 앱이 없습니다", "첫 번째 앱 등록하기"~~ ✅
- ~~"앱을 삭제하시겠습니까?" 등~~ ✅

#### 3. ✅ 연동 (Integrations) - 18개 파일 (완료)

주요 파일:

- ✅ `src/components/integrations/integrations-list.tsx` - 연동 목록
- ✅ `src/components/integrations/integration-create-form.tsx` - 연동 생성 폼
- ✅ `src/components/integrations/integration-create-dialog.tsx` - 연동 생성 다이얼로그
- ✅ `src/components/integrations/integration-detail-client.tsx` - 연동 상세
- ✅ `src/components/integrations/integration-detail-card.tsx` - 연동 상세 카드
- ✅ `src/components/integrations/integrations-page-client.tsx` - 연동 페이지 클라이언트
- ✅ `src/components/integrations/integration-settings-form.tsx` - 연동 설정 폼
- ✅ `src/components/integrations/integration-status-form.tsx` - 연동 상태 폼
- ✅ `src/components/integrations/integration-edit-client.tsx` - 연동 수정 클라이언트
- ✅ `src/components/integrations/sync-logs-table.tsx` - 동기화 로그 테이블
- 기타 관련 컴포넌트 및 테스트 파일들

하드코딩된 텍스트 예시:

- ~~"연동 유형", "상태", "마지막 동기화", "생성일"~~ ✅
- ~~"활성", "대기", "오류", "연결 끊김"~~ ✅
- ~~"연동된 서비스가 없습니다", "설정", "동기화", "삭제" 등~~ ✅

#### 4. ✅ 리포트 (Reports) - 8개 파일 (완료)

주요 파일:

- ✅ `src/components/reports/reports-page-client.tsx` - 리포트 페이지 클라이언트
- ✅ `src/components/reports/usage/usage-stats-cards.tsx` - 사용 현황 통계 카드
- ✅ `src/components/reports/usage/unused-apps-table.tsx` - 미사용 앱 테이블
- ✅ `src/components/reports/usage/active-users-chart.tsx` - 활성 사용자 추이 차트
- ✅ `src/components/reports/usage/app-usage-chart.tsx` - 앱별 사용률 차트
- ✅ `src/components/reports/audit/audit-log-table.tsx` - 감사 로그 테이블
- ✅ `src/components/reports/audit/audit-log-detail-dialog.tsx` - 감사 로그 상세 다이얼로그
- ✅ `src/app/(dashboard)/reports/audit/page.client.tsx` - 감사 로그 페이지 클라이언트
- 기타 리포트 관련 컴포넌트들

하드코딩된 텍스트 예시:

- ~~"리포트", "데이터 연동 준비 중", "준비 중인 리포트"~~ ✅
- ~~"개 리포트 사용 가능" 등~~ ✅

#### ✅ 5. 결제 (Payments) - 4개 파일

주요 파일:

- ✅ `src/components/payments/payment-records-table.tsx` - 결제 내역 테이블
- ✅ `src/components/payments/payment-csv-upload.tsx` - CSV 업로드
- ✅ `src/components/payments/payment-table-columns.tsx` - 결제 테이블 컬럼
- ✅ `src/components/payments/payment-table.constants.ts` - 결제 테이블 상수
- ✅ `src/app/(dashboard)/payments/page.tsx` - 결제 페이지

하드코딩된 텍스트 예시:

- ~~"가맹점명 검색...", "매칭 상태:", "전체", "대기", "자동 매칭", "수동 매칭", "확인됨", "미매칭"~~ ✅
- ~~"선택 확인", "결제 내역이 없습니다" 등~~ ✅

#### ✅ 6. 사용자 (Users) - 5개 파일

주요 파일:

- ✅ `src/components/users/user-list.tsx` - 사용자 목록
- ✅ `src/components/users/user-detail-client.tsx` - 사용자 상세
- ✅ `src/components/users/user-page-client.tsx` - 사용자 페이지 클라이언트
- ✅ `src/components/users/terminated-users-list.tsx` - 퇴사자 목록
- ✅ `src/components/users/terminated-users-page-client.tsx` - 퇴사자 페이지 클라이언트

하드코딩된 텍스트 예시:

- ~~"사용자", "역할", "상태", "부서", "앱 접근", "마지막 로그인"~~ ✅
- ~~"활성", "비활성", "퇴사"~~ ✅
- ~~"관리자", "멤버", "뷰어"~~ ✅
- ~~"등록된 사용자가 없습니다" 등~~ ✅

#### ✅ 7. 팀 (Teams) - 4개 파일

주요 파일:

- ✅ `src/components/teams/teams-page-client.tsx` - 팀 페이지 클라이언트
- ✅ `src/components/teams/create-team-dialog.tsx` - 팀 생성 다이얼로그
- ✅ `src/components/teams/edit-team-dialog.tsx` - 팀 수정 다이얼로그
- ✅ `src/components/teams/delete-team-dialog.tsx` - 팀 삭제 다이얼로그
- ✅ `src/app/(dashboard)/teams/page.tsx` - 팀 페이지

하드코딩된 텍스트 예시:

- ~~"전체 팀", "멤버 있는 팀", "평균 멤버 수", "최대 깊이"~~ ✅
- ~~"팀 구조", "팀 추가", "모두 펼치기", "모두 접기"~~ ✅
- ~~"팀 검색...", "검색 결과가 없습니다" 등~~ ✅

#### 8. 작업 관리 (Tasks) - 2개 파일

주요 파일:

- `src/components/tasks/tasks-page-client.tsx` - 작업 페이지 클라이언트
- `src/components/tasks/task-table.tsx` - 작업 테이블

하드코딩된 텍스트 예시:

- "작업 관리", "작업 추가", "전체 작업", "할 일", "진행 중", "긴급"
- "상태", "우선순위", "필터 초기화", "개 작업"
- "등록된 작업이 없습니다", "개 선택됨"
- "제목", "상태", "우선순위", "담당자", "마감일"
- "메뉴 열기", "수정", "삭제"
- "모든 상태", "할 일", "진행 중", "검토 중", "완료", "취소됨"
- "모든 우선순위", "긴급", "높음", "보통", "낮음"

#### ✅ 9. 칸반 보드 (Kanban) - 4개 파일 (완료)

주요 파일:

- ✅ `src/components/kanban/kanban-page-client.tsx` - 칸반 페이지 클라이언트
- ✅ `src/components/kanban/kanban-column.tsx` - 칸반 컬럼
- ✅ `src/components/kanban/kanban-card.tsx` - 칸반 카드
- ✅ `src/components/kanban/kanban-board.tsx` - 칸반 보드
- ✅ `src/app/(dashboard)/kanban/page.tsx` - 칸반 페이지

하드코딩된 텍스트 예시:

- ~~"Kanban Board", "담당자 추가", "보드", "목록", "테이블"~~ ✅
- ~~"작업 검색...", "필터", "보드 추가"~~ ✅
- ~~"기한 미정", "작업이 없습니다"~~ ✅

#### ✅ 10. 카드 관리 (Cards) - 4개 파일 (완료)

주요 파일:

- ✅ `src/components/cards/card-register-form.tsx` - 카드 등록 폼
- ✅ `src/components/cards/card-list.tsx` - 카드 목록
- ✅ `src/components/cards/sync-dialog.tsx` - 동기화 다이얼로그
- ✅ `src/components/cards/card-transactions-table.tsx` - 거래 내역 테이블
- ✅ `src/app/(dashboard)/payments/cards/page.tsx` - 카드 페이지
- ✅ `src/app/(dashboard)/payments/cards/page.client.tsx` - 카드 페이지 클라이언트
- ✅ `src/app/(dashboard)/payments/cards/[id]/page.tsx` - 카드 상세 페이지

하드코딩된 텍스트 예시:

- ~~"카드 등록", "법인카드 등록", "카드사", "카드번호", "카드 별명"~~ ✅
- ~~"사업자번호", "카드 배정", "미배정", "팀 공용", "개인 전용"~~ ✅
- ~~"인증 방식", "ID 로그인", "공동인증서"~~ ✅
- ~~"등록된 카드", "등록된 카드가 없습니다"~~ ✅
- ~~"카드사", "별명", "배정", "동기화", "SaaS 분류", "마지막 동기화", "액션"~~ ✅
- ~~"카드 동기화", "동기화 기간", "시작일", "종료일"~~ ✅
- ~~"첫 동기화는 최근 6개월 데이터를 가져옵니다"~~ ✅
- ~~"동기화 시작", "취소"~~ ✅
- ~~"거래일시", "사용처", "금액", "유형", "매칭 앱", "작업"~~ ✅
- ~~"사용처 검색...", "거래내역이 없습니다"~~ ✅
- ~~"미분류", "전체", "승인", "매입", "앱 선택", "미매칭", "매칭 해제"~~ ✅

#### ✅ 11. CSV 일괄 등록 (Import) - 1개 파일 (완료)

주요 파일:

- ✅ `src/components/import/csv-upload-form.tsx` - CSV 업로드 폼
- ✅ `src/app/(dashboard)/settings/import/page.tsx` - Import 페이지

하드코딩된 텍스트 예시:

- ~~"CSV 일괄 등록", "등록 유형", "앱 등록", "구독 등록", "사용자 등록"~~ ✅
- ~~"템플릿 다운로드", "CSV 파일을 여기에 드래그하거나 클릭하여 선택하세요"~~ ✅
- ~~".csv 파일만 지원됩니다", "처리 중...", "업로드 및 등록"~~ ✅
- ~~"성공", "오류", "개 항목이 등록되었습니다"~~ ✅
- ~~"유효성 검증 오류", "앱 필드", "구독 필드", "사용자 필드"~~ ✅
- ~~필드 설명 텍스트들~~ ✅

#### ✅ 12. 팀 멤버 관리 (Team Members) - 4개 파일 (완료)

주요 파일:

- ✅ `src/components/team/member-card.tsx` - 멤버 카드
- ✅ `src/components/team/invite-member-form.tsx` - 멤버 초대 폼
- ✅ `src/components/team/invitation-list.tsx` - 초대 목록
- ✅ `src/app/(dashboard)/settings/team/page.tsx` - 팀 페이지

하드코딩된 텍스트 예시:

- ~~"관리자", "멤버", "뷰어", "활성", "비활성", "퇴사"~~ ✅
- ~~"님을 팀에서 제거하시겠습니까?", "(나)", "역할 변경", "(현재)", "팀에서 제거"~~ ✅
- ~~"팀원 초대", "새로운 팀원을 이메일로 초대합니다"~~ ✅
- ~~"이메일", "역할", "역할 선택"~~ ✅
- ~~"모든 기능에 접근할 수 있습니다", "대부분의 기능에 접근할 수 있습니다", "읽기 전용 접근만 가능합니다"~~ ✅
- ~~"초대 생성에 실패했습니다", "취소", "초대 중...", "초대 보내기"~~ ✅
- ~~"대기 중", "수락됨", "만료됨", "취소됨", "재발송", "취소"~~ ✅
- ~~"대기 중인 초대가 없습니다", "이메일", "역할", "상태", "초대자", "초대일"~~ ✅

## 작업 우선순위 제안

1. ~~**구독 (Subscriptions)** - 핵심 기능, 사용 빈도 높음~~ ✅ 완료
2. ~~**앱 인벤토리 (Apps)** - 핵심 기능, 사용 빈도 높음~~ ✅ 완료
3. ~~**연동 (Integrations)** - 설정 관련, 중요도 높음~~ ✅ 완료
4. ~~**리포트 (Reports)** - 분석 기능~~ ✅ 완료
5. ~~**결제 (Payments)** - 비용 관리 핵심~~ ✅ 완료
6. ~~**사용자 (Users)** - 사용자 관리~~ ✅ 완료
7. ~~**팀 (Teams)** - 조직 관리~~ ✅ 완료
8. ~~**작업 관리 (Tasks)** - 작업 추적 기능~~ ✅ 완료
9. ~~**칸반 보드 (Kanban)** - 작업 시각화~~ ✅ 완료
10. ~~**카드 관리 (Cards)** - 결제 카드 관리~~ ✅ 완료
11. ~~**CSV 일괄 등록 (Import)** - 데이터 일괄 등록~~ ✅ 완료
12. ~~**팀 멤버 관리 (Team Members)** - 팀 멤버 초대 및 관리~~ ✅ 완료

## 작업 방법

각 카테고리별로:

1. 하드코딩된 한국어 텍스트를 `useTranslations()` 훅으로 교체
2. `src/i18n/messages/ko.json`과 `src/i18n/messages/en.json`에 번역 키 추가
3. 테스트 파일의 Provider 보강 (필요시)

## 참고 파일

- 번역 메시지 파일: `src/i18n/messages/ko.json`, `src/i18n/messages/en.json`
- i18n 설정: `src/i18n/config.ts`
- 작업 로그: `docs/plan/active/2026-01-16-i18n-replacement.md`
