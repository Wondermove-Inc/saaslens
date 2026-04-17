# Google Workspace 연동 가이드

> **문서 목적**: Google Workspace Admin SDK 연동 설정 및 트러블슈팅 가이드
> **작성일**: 2025-12-11
> **상태**: ✅ 구현 완료

---

## 1. 개요

### 1.1 기능 설명

Google Workspace 연동을 통해 다음 기능을 사용할 수 있습니다:

| 기능                 | 설명                                                |
| -------------------- | --------------------------------------------------- |
| **사용자 동기화**    | Google Workspace 사용자를 자동으로 가져와 DB에 저장 |
| **팀(OU) 동기화**    | Organizational Unit 구조를 Team 모델로 변환         |
| **OAuth 토큰 조회**  | 사용자별 연결된 앱 발견 (SaaS Discovery)            |
| **관리자 권한 확인** | Google Workspace Super Admin 여부 동기화            |

### 1.2 아키텍처

```
Google Workspace Admin API
         ↓
┌────────────────────────────────────────┐
│     GoogleWorkspaceService             │
│  (src/lib/services/sso/googleWorkspace.ts)
├────────────────────────────────────────┤
│ - listUsers()      사용자 목록 조회    │
│ - listOrgUnits()   OU 목록 조회        │
│ - listTokens()     OAuth 토큰 조회     │
│ - testConnection() 연결 테스트         │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│     fullGoogleWorkspaceSync            │
│  (src/lib/services/sso/googleSync.ts)  │
├────────────────────────────────────────┤
│ 1. Team 동기화 (OU → Team)             │
│ 2. User 동기화 (확장 필드 포함)        │
│ 3. Manager 관계 설정 (2-pass)          │
└────────────────────────────────────────┘
         ↓
    PostgreSQL (Prisma)
```

---

## 2. 사전 설정 (Google Cloud Console)

### 2.1 서비스 계정 생성

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. **IAM & Admin** → **Service Accounts** → **Create Service Account**
3. 서비스 계정 이름 입력 (예: `smp-workspace-directory-sync`)
4. **Create and Continue** → 역할은 선택하지 않아도 됨 → **Done**

### 2.2 JSON 키 발급

1. 생성된 서비스 계정 클릭
2. **Keys** 탭 → **Add Key** → **Create new key**
3. **JSON** 선택 → **Create**
4. 다운로드된 JSON 파일 안전하게 보관

JSON 파일 구조:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "smp-workspace@your-project.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  ...
}
```

### 2.3 Domain-Wide Delegation 활성화

1. 서비스 계정 상세 페이지 → **Advanced settings** 확장
2. **Domain-wide Delegation** 섹션
3. **Enable Google Workspace Domain-wide Delegation** 체크 (이미 활성화되어 있으면 생략)
4. **Client ID** 복사 (숫자 형태, 예: `110467399430507439402`)

---

## 3. 사전 설정 (Google Admin Console)

### 3.1 API 스코프 승인

1. [Google Admin Console](https://admin.google.com) 접속 (Super Admin 계정으로)
2. **Security** → **Access and data control** → **API controls**
3. **Domain-wide delegation** → **MANAGE DOMAIN WIDE DELEGATION**
4. **Add new** 클릭

### 3.2 Client ID 및 스코프 등록

| 필드             | 값                                        |
| ---------------- | ----------------------------------------- |
| **Client ID**    | Google Cloud Console에서 복사한 Client ID |
| **OAuth scopes** | 아래 3개 스코프 (쉼표로 구분)             |

```
https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.user.security,https://www.googleapis.com/auth/admin.directory.orgunit.readonly
```

5. **Authorize** 클릭

**참고**: 설정 적용까지 1-2분 소요될 수 있습니다.

---

## 4. 앱에서 연동 추가

### 4.1 필요한 정보

| 필드                   | 설명                                | 예시                                  |
| ---------------------- | ----------------------------------- | ------------------------------------- |
| **관리자 이메일**      | Google Workspace Super Admin 이메일 | `admin@company.com`                   |
| **서비스 계정 이메일** | JSON 파일의 `client_email` 값       | `smp@project.iam.gserviceaccount.com` |
| **Private Key**        | JSON 파일의 `private_key` 값        | `-----BEGIN PRIVATE KEY-----...`      |

### 4.2 연동 추가 절차

1. `/integrations` 페이지 접속
2. **연동 추가** 버튼 클릭
3. 연동 유형: **Google Workspace** 선택
4. 필수 정보 입력
5. **연동 추가** 클릭

### 4.3 Private Key 입력 방법

JSON 파일에서 `private_key` 값을 복사할 때:

```json
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----\n"
```

- **따옴표 포함 복사 가능**: 시스템이 자동으로 제거
- **\n 이스케이프 문자 그대로 복사 가능**: 시스템이 자동으로 실제 줄바꿈으로 변환

---

## 5. 트러블슈팅

### 5.1 오류: `unauthorized_client`

```
Client is unauthorized to retrieve access tokens using this method,
or client not authorized for any of the scopes requested.
```

**원인**: Google Admin Console에서 API 스코프가 승인되지 않음

**해결**:

1. Google Admin Console → Security → API controls → Domain-wide delegation
2. Client ID와 스코프가 올바르게 등록되어 있는지 확인
3. 스코프가 정확히 3개 모두 포함되어 있는지 확인
4. 설정 후 1-2분 대기 후 재시도

### 5.2 오류: `invalid_grant: Invalid signature for token`

```
java.security.SignatureException: Invalid signature for token
```

**원인**: Private Key가 서비스 계정과 불일치

**해결**:

1. Google Cloud Console에서 새 키 생성
2. 기존 키 삭제 후 새 키로 재시도
3. Private Key가 손상되지 않았는지 확인 (복사/붙여넣기 과정에서 변형 가능)

### 5.3 오류: `ERR_OSSL_UNSUPPORTED`

```
error:1E08010C:DECODER routines::unsupported
```

**원인**: Private Key 형식 오류 (따옴표 포함 등)

**해결**:

- 시스템이 자동으로 처리하도록 업데이트됨
- 여전히 발생 시 Private Key를 텍스트 에디터에서 열어 형식 확인

### 5.4 오류: `Not Authorized`

**원인**: 관리자 이메일(subject)이 Super Admin 권한이 없음

**해결**:

- Google Admin Console에서 해당 계정이 Super Admin인지 확인
- 다른 Super Admin 계정으로 시도

---

## 6. 관련 코드

### 6.1 주요 파일

| 파일                                                        | 설명                        |
| ----------------------------------------------------------- | --------------------------- |
| `src/lib/services/sso/googleWorkspace.ts`                   | Google Admin SDK 클라이언트 |
| `src/lib/services/sso/googleSync.ts`                        | 통합 동기화 서비스          |
| `src/lib/services/sso/userSync.ts`                          | 사용자 동기화 로직          |
| `src/lib/services/sso/teamSync.ts`                          | 팀(OU) 동기화 로직          |
| `src/actions/integrations.ts`                               | Integration Server Actions  |
| `src/components/integrations/integration-create-dialog.tsx` | 연동 추가 다이얼로그        |

### 6.2 Private Key 정규화 로직

`src/actions/integrations.ts`에서 처리:

```typescript
// Private Key 정규화:
// 1. 앞뒤 공백 제거
// 2. 앞뒤 따옴표 제거 (JSON에서 복사 시 포함될 수 있음)
// 3. \n 문자열을 실제 줄바꿈으로 변환
let normalizedPrivateKey = creds.privateKey?.trim();
if (normalizedPrivateKey) {
  // 앞뒤 따옴표 제거 (", ')
  normalizedPrivateKey = normalizedPrivateKey.replace(/^["']|["']$/g, "");
  // \n 이스케이프 문자열을 실제 줄바꿈으로 변환
  normalizedPrivateKey = normalizedPrivateKey.replace(/\\n/g, "\n");
}
```

### 6.3 API 스코프

```typescript
scopes: [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.user.security",
  "https://www.googleapis.com/auth/admin.directory.orgunit.readonly",
];
```

---

## 7. 향후 개선 사항

### 7.1 Google Workspace Marketplace 앱 등록

현재는 사용자가 직접 Service Account를 생성하고 Domain-Wide Delegation을 설정해야 합니다.

**개선 계획**:

- Google Workspace Marketplace에 앱 등록
- OAuth 동의 화면만으로 간편 연동 가능하도록 개선
- 참고: https://developers.google.com/workspace/marketplace

### 7.2 추가 연동 지원

| IdP                |  상태   | 우선순위 |
| ------------------ | :-----: | :------: |
| Google Workspace   | ✅ 완료 |    -     |
| Okta               | 🔜 예정 |    P1    |
| Microsoft Entra ID | 🔜 예정 |    P1    |

---

## 8. 참고 문서

- [Google Admin SDK Directory API](https://developers.google.com/admin-sdk/directory)
- [Domain-Wide Delegation 가이드](https://developers.google.com/admin-sdk/directory/v1/guides/delegation)
- [Google Workspace Team Sync 구현 보고서](../plan/complete/google-workspace-team-sync-plan.md)
