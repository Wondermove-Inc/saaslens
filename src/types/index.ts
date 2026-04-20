/**
 * SaaS Management Platform 공통 타입 정의
 */

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 페이지네이션 타입
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 필터 타입
export interface FilterParams {
  search?: string;
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Server Action 상태 타입
export interface ActionState<T = null> {
  success: boolean;
  message?: string;
  error?: string; // 단일 에러 메시지
  data?: T;
  errors?: Record<string, string[]>; // 필드별 에러 메시지
}

// 사용자 세션 타입
export interface UserSession {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  organizationId: string;
}
