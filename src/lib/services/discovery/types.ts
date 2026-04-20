// src/lib/services/discovery/types.ts
/**
 * 앱 활성 감지 시스템 — 타입 정의
 * 향후 IdP API 연동(Okta, Azure AD 등)을 위한 인터페이스
 */

/**
 * IdP에서 발견된 앱 접근 정보
 */
export interface IdPAppAccess {
  /** IdP에서 사용하는 앱 식별자 */
  externalAppId: string;
  /** IdP에서의 앱 이름 */
  appName: string;
  /** 앱에 접근한 사용자 이메일 */
  userEmail: string;
  /** 마지막 사용 시각 */
  lastUsedAt: Date;
  /** 접근 상태 (active/revoked) */
  status: "active" | "revoked";
}

/**
 * IdP 프로바이더 어댑터 인터페이스
 *
 * 향후 구현 예정:
 * - OktaAdapter: AccessSource.IDP_OKTA
 * - AzureADAdapter: AccessSource.IDP_AZURE_AD
 * - OneLoginAdapter: AccessSource.IDP_ONELOGIN
 *
 * AccessSource enum 확장값 (향후 추가):
 * - IDP_OKTA
 * - IDP_AZURE_AD
 * - IDP_ONELOGIN
 */
export interface IdPProviderAdapter {
  /** 프로바이더 이름 (예: "okta", "azure_ad") */
  readonly providerName: string;

  /**
   * IdP에서 조직의 앱 접근 목록을 가져옴
   * @param credentials - IdP API 인증 정보
   * @param organizationId - 조직 ID
   * @returns 앱 접근 정보 배열
   */
  fetchAppAccesses(
    credentials: Record<string, string>,
    organizationId: string
  ): Promise<IdPAppAccess[]>;

  /**
   * IdP 연결 상태 확인
   * @param credentials - IdP API 인증 정보
   * @returns 연결 가능 여부
   */
  testConnection(credentials: Record<string, string>): Promise<boolean>;
}
