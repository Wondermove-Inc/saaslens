// FleetDM API Client
// Reference: https://fleetdm.com/docs/rest-api

import type {
  FleetDMActivitiesResponse,
  FleetDMClientConfig,
  FleetDMError,
  FleetDMHost,
  FleetDMHostSoftwareResponse,
  FleetDMHostsResponse,
  FleetDMSoftware,
  FleetDMTeam,
} from "./types";

export class FleetDMClient {
  private baseUrl: string;
  private apiToken: string;
  private teamId?: number;

  constructor(config: FleetDMClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // trailing slash 제거
    this.apiToken = config.apiToken;
    this.teamId = config.teamId;
  }

  /**
   * API 요청 헬퍼
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1/fleet${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `FleetDM API Error: ${response.status}`;
      try {
        const error = (await response.json()) as FleetDMError;
        errorMessage = error.message || errorMessage;
      } catch {
        // JSON 파싱 실패 시 기본 에러 메시지 사용
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  /**
   * 호스트 목록 조회
   */
  async getHosts(params?: {
    page?: number;
    perPage?: number;
    orderKey?: string;
    orderDirection?: "asc" | "desc";
    query?: string;
    status?: "new" | "online" | "offline" | "missing";
    teamId?: number;
  }): Promise<FleetDMHost[]> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.perPage) searchParams.set("per_page", String(params.perPage));
    if (params?.orderKey) searchParams.set("order_key", params.orderKey);
    if (params?.orderDirection)
      searchParams.set("order_direction", params.orderDirection);
    if (params?.query) searchParams.set("query", params.query);
    if (params?.status) searchParams.set("status", params.status);

    const teamId = params?.teamId ?? this.teamId;
    if (teamId) searchParams.set("team_id", String(teamId));

    const queryString = searchParams.toString();
    const endpoint = `/hosts${queryString ? `?${queryString}` : ""}`;

    const response = await this.request<FleetDMHostsResponse>(endpoint);
    return response.hosts;
  }

  /**
   * 호스트 상세 조회
   */
  async getHost(hostId: number): Promise<FleetDMHost> {
    const response = await this.request<{ host: FleetDMHost }>(
      `/hosts/${hostId}`
    );
    return response.host;
  }

  /**
   * 호스트별 설치된 소프트웨어 조회
   */
  async getHostSoftware(
    hostId: number,
    params?: {
      page?: number;
      perPage?: number;
      query?: string;
    }
  ): Promise<FleetDMSoftware[]> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.perPage) searchParams.set("per_page", String(params.perPage));
    if (params?.query) searchParams.set("query", params.query);

    const queryString = searchParams.toString();
    const endpoint = `/hosts/${hostId}/software${queryString ? `?${queryString}` : ""}`;

    const response = await this.request<FleetDMHostSoftwareResponse>(endpoint);
    return response.software;
  }

  /**
   * 전체 소프트웨어 목록 조회
   */
  async getSoftware(params?: {
    page?: number;
    perPage?: number;
    orderKey?: string;
    orderDirection?: "asc" | "desc";
    query?: string;
    teamId?: number;
    vulnerable?: boolean;
  }): Promise<FleetDMSoftware[]> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.perPage) searchParams.set("per_page", String(params.perPage));
    if (params?.orderKey) searchParams.set("order_key", params.orderKey);
    if (params?.orderDirection)
      searchParams.set("order_direction", params.orderDirection);
    if (params?.query) searchParams.set("query", params.query);
    if (params?.vulnerable !== undefined)
      searchParams.set("vulnerable", String(params.vulnerable));

    const teamId = params?.teamId ?? this.teamId;
    if (teamId) searchParams.set("team_id", String(teamId));

    const queryString = searchParams.toString();
    const endpoint = `/software${queryString ? `?${queryString}` : ""}`;

    const response = await this.request<{ software: FleetDMSoftware[] }>(
      endpoint
    );
    return response.software;
  }

  /**
   * 활동 로그 조회
   */
  async getActivities(params?: {
    page?: number;
    perPage?: number;
  }): Promise<FleetDMActivitiesResponse> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.perPage) searchParams.set("per_page", String(params.perPage));

    const queryString = searchParams.toString();
    const endpoint = `/activities${queryString ? `?${queryString}` : ""}`;

    return this.request<FleetDMActivitiesResponse>(endpoint);
  }

  /**
   * 팀 목록 조회
   */
  async getTeams(): Promise<FleetDMTeam[]> {
    const response = await this.request<{ teams: FleetDMTeam[] }>("/teams");
    return response.teams;
  }

  /**
   * 팀 상세 조회
   */
  async getTeam(teamId: number): Promise<FleetDMTeam> {
    const response = await this.request<{ team: FleetDMTeam }>(
      `/teams/${teamId}`
    );
    return response.team;
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request<unknown>("/me");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 호스트 수 카운트 (통계용)
   */
  async getHostsCount(params?: {
    status?: "new" | "online" | "offline" | "missing";
    teamId?: number;
  }): Promise<number> {
    const searchParams = new URLSearchParams();
    searchParams.set("per_page", "1"); // 최소한만 가져오기

    if (params?.status) searchParams.set("status", params.status);

    const teamId = params?.teamId ?? this.teamId;
    if (teamId) searchParams.set("team_id", String(teamId));

    const queryString = searchParams.toString();
    const endpoint = `/hosts/count?${queryString}`;

    const response = await this.request<{ count: number }>(endpoint);
    return response.count;
  }

  /**
   * 소프트웨어 수 카운트 (통계용)
   */
  async getSoftwareCount(params?: {
    teamId?: number;
    vulnerable?: boolean;
  }): Promise<number> {
    const searchParams = new URLSearchParams();
    searchParams.set("per_page", "1");

    if (params?.vulnerable !== undefined)
      searchParams.set("vulnerable", String(params.vulnerable));

    const teamId = params?.teamId ?? this.teamId;
    if (teamId) searchParams.set("team_id", String(teamId));

    const queryString = searchParams.toString();
    const endpoint = `/software/count?${queryString}`;

    const response = await this.request<{ count: number }>(endpoint);
    return response.count;
  }
}

/**
 * FleetDM 클라이언트 인스턴스 생성 헬퍼
 */
export function createFleetDMClient(
  config: FleetDMClientConfig
): FleetDMClient {
  return new FleetDMClient(config);
}
