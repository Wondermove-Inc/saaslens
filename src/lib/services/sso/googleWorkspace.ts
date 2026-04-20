// src/lib/services/sso/googleWorkspace.ts
/**
 * Google Workspace Admin SDK 서비스
 * 사용자 목록 조회, OAuth 토큰 조회 등 Google Workspace 연동 기능 제공
 */

import type {
  GoogleOAuthToken,
  GoogleOrgUnit,
  GoogleWorkspaceUser,
  ServiceAccountCredentials,
} from "@/types/sso";
import { admin_directory_v1, google } from "googleapis";

export class GoogleWorkspaceService {
  private adminClient: admin_directory_v1.Admin;

  constructor(credentials: ServiceAccountCredentials) {
    // 자격 증명 검증
    if (!credentials.clientEmail) {
      throw new Error("서비스 계정 이메일이 필요합니다");
    }
    if (!credentials.privateKey) {
      throw new Error("서비스 계정 Private Key가 필요합니다");
    }
    if (!credentials.subject) {
      throw new Error("관리자 이메일(subject)이 필요합니다");
    }

    // JWT 인증 클라이언트 생성
    const auth = new google.auth.JWT({
      email: credentials.clientEmail,
      key: credentials.privateKey,
      subject: credentials.subject,
      scopes: [
        "https://www.googleapis.com/auth/admin.directory.user.readonly",
        "https://www.googleapis.com/auth/admin.directory.user.security",
        "https://www.googleapis.com/auth/admin.directory.orgunit.readonly",
      ],
    });

    // Admin SDK 클라이언트 초기화
    this.adminClient = google.admin({ version: "directory_v1", auth });
  }

  /**
   * 모든 사용자 목록 조회 (페이지네이션 처리)
   * @param orgUnitPath 특정 OU 경로로 필터링 (선택)
   */
  async listUsers(orgUnitPath?: string): Promise<GoogleWorkspaceUser[]> {
    const users: GoogleWorkspaceUser[] = [];
    let pageToken: string | undefined;

    do {
      const params: admin_directory_v1.Params$Resource$Users$List = {
        customer: "my_customer",
        maxResults: 500,
        pageToken,
        projection: "full",
      };

      if (orgUnitPath) {
        params.query = `orgUnitPath='${orgUnitPath}'`;
      }

      const response = await this.adminClient.users.list(params);
      const data = response.data;

      if (data.users) {
        users.push(...(data.users as GoogleWorkspaceUser[]));
      }

      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    return users;
  }

  /**
   * 단일 사용자 조회
   * @param userKey 사용자 이메일 또는 ID
   */
  async getUser(userKey: string): Promise<GoogleWorkspaceUser | null> {
    try {
      const response = await this.adminClient.users.get({
        userKey,
        projection: "full",
      });
      return response.data as GoogleWorkspaceUser;
    } catch (error: unknown) {
      // 사용자를 찾을 수 없는 경우 null 반환
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 사용자의 OAuth 토큰 목록 조회 (연결된 앱 발견용)
   * @param userKey 사용자 이메일 또는 ID
   */
  async listTokens(userKey: string): Promise<GoogleOAuthToken[]> {
    try {
      const response = await this.adminClient.tokens.list({ userKey });
      return (response.data.items as GoogleOAuthToken[]) || [];
    } catch {
      throw new Error("OAuth 토큰 조회 실패");
    }
  }

  /**
   * 연결 테스트
   * 자격 증명이 유효한지 확인
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log("[GoogleWorkspace] testConnection 시작...");
      // 사용자 1명만 조회하여 연결 테스트
      const response = await this.adminClient.users.list({
        customer: "my_customer",
        maxResults: 1,
      });
      console.log("[GoogleWorkspace] testConnection 성공:", response.status);
      return true;
    } catch (error: unknown) {
      console.error("[GoogleWorkspace] testConnection 실패:", error);

      // GaxiosError 상세 정보 추출
      const gaxiosError = error as {
        code?: string | number;
        response?: {
          status?: number;
          data?: {
            error?: string;
            error_description?: string;
          };
        };
        message?: string;
      };

      const errorCode = gaxiosError.code || gaxiosError.response?.status;
      const errorData = gaxiosError.response?.data;
      const errorMessage = gaxiosError.message || "알 수 없는 오류";

      console.error("[GoogleWorkspace] 에러 코드:", errorCode);
      console.error("[GoogleWorkspace] 에러 데이터:", errorData);
      console.error("[GoogleWorkspace] 에러 메시지:", errorMessage);

      // 구체적인 에러 메시지 생성
      let detailedMessage = `Google API 오류: ${errorMessage}`;

      if (errorMessage.includes("invalid_grant")) {
        detailedMessage =
          "인증 실패: Domain-Wide Delegation 설정을 확인하세요. " +
          "1) Google Cloud Console에서 서비스 계정의 'Domain-wide delegation' 활성화 " +
          "2) Google Admin Console > Security > API Controls에서 Client ID와 스코프 등록 필요";
      } else if (errorMessage.includes("Not Authorized")) {
        detailedMessage =
          "권한 부족: 관리자 이메일(subject)이 Google Workspace Super Admin 권한을 가지고 있는지 확인하세요.";
      } else if (errorMessage.includes("invalid_client")) {
        detailedMessage =
          "클라이언트 오류: 서비스 계정 이메일이 올바른지 확인하세요.";
      }

      throw new Error(detailedMessage);
    }
  }

  /**
   * 모든 Organizational Unit (OU) 목록 조회
   * @returns GoogleOrgUnit 배열
   */
  async listOrgUnits(): Promise<GoogleOrgUnit[]> {
    try {
      const response = await this.adminClient.orgunits.list({
        customerId: "my_customer",
        type: "ALL",
      });

      const orgUnits = response.data.organizationUnits || [];

      return orgUnits.map((ou) => ({
        orgUnitId: ou.orgUnitId || "",
        name: ou.name || "",
        description: ou.description || undefined,
        orgUnitPath: ou.orgUnitPath || "",
        parentOrgUnitId: ou.parentOrgUnitId || undefined,
        parentOrgUnitPath: ou.parentOrgUnitPath || undefined,
        blockInheritance: ou.blockInheritance || false,
      })) as GoogleOrgUnit[];
    } catch (error: unknown) {
      console.error("OU 목록 조회 실패:", error);
      throw new Error("Organizational Unit 목록 조회에 실패했습니다");
    }
  }

  /**
   * 특정 Organizational Unit (OU) 조회
   * @param orgUnitPath OU 경로 (예: "/Engineering")
   * @returns GoogleOrgUnit 또는 null
   */
  async getOrgUnit(orgUnitPath: string): Promise<GoogleOrgUnit | null> {
    try {
      // OU 경로는 URL 인코딩 필요
      const encodedPath = encodeURIComponent(orgUnitPath);
      const response = await this.adminClient.orgunits.get({
        customerId: "my_customer",
        orgUnitPath: encodedPath,
      });

      const ou = response.data;
      return {
        orgUnitId: ou.orgUnitId || "",
        name: ou.name || "",
        description: ou.description || undefined,
        orgUnitPath: ou.orgUnitPath || "",
        parentOrgUnitId: ou.parentOrgUnitId || undefined,
        parentOrgUnitPath: ou.parentOrgUnitPath || undefined,
        blockInheritance: ou.blockInheritance || false,
      };
    } catch (error: unknown) {
      // OU를 찾을 수 없는 경우 null 반환
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 404
      ) {
        return null;
      }
      throw error;
    }
  }
}

/**
 * 환경 변수에서 Google Workspace 서비스 인스턴스 생성
 */
export function createGoogleWorkspaceServiceFromEnv(): GoogleWorkspaceService {
  const clientEmail = process.env.GOOGLE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  const subject = process.env.GOOGLE_ADMIN_SUBJECT;

  if (!clientEmail || !privateKey || !subject) {
    throw new Error("Google Workspace 환경 변수가 설정되지 않았습니다");
  }

  return new GoogleWorkspaceService({
    clientEmail,
    privateKey,
    subject,
  });
}
