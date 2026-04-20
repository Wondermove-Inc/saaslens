/**
 * SMP-204: 서버 측 Pending Action Store
 *
 * AI Write Tool 승인 보안 강화:
 * - 서버 측 저장 (인메모리 Map)
 * - TTL 검증 (5분)
 * - 1회 사용 후 폐기
 * - 변조 감지 (params 해시 비교)
 * - 권한 검증 (organizationId + userId)
 */

import { createHash } from "crypto";

// ==================== Types ====================

interface StoredPendingAction {
  id: string;
  action: string;
  paramsHash: string;
  organizationId: string;
  userId: string;
  createdAt: number;
}

export type ValidateResult =
  | { valid: true }
  | { valid: false; error: string; status: number };

// ==================== Constants ====================

/** TTL: 5분 (밀리초) */
const TTL_MS = 5 * 60 * 1000;

/** 만료 정리 간격: 60초 */
const CLEANUP_INTERVAL_MS = 60 * 1000;

// ==================== Store ====================

const store = new Map<string, StoredPendingAction>();

// 주기적 만료 정리
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, action] of store) {
      if (now - action.createdAt > TTL_MS) {
        store.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Node.js에서 프로세스 종료를 방해하지 않도록
  if (
    cleanupTimer &&
    typeof cleanupTimer === "object" &&
    "unref" in cleanupTimer
  ) {
    cleanupTimer.unref();
  }
}

// ==================== Public API ====================

/**
 * params 객체의 해시를 생성한다.
 * 클라이언트가 전송한 params와 저장된 params를 비교하여 변조를 감지한다.
 */
export function hashParams(params: Record<string, unknown>): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  return createHash("sha256").update(sorted).digest("hex");
}

/**
 * Pending action을 서버 store에 저장한다.
 * POST /api/ai/chat에서 Write Tool이 pending_approval을 반환할 때 호출.
 */
export function storePendingAction(
  id: string,
  action: string,
  params: Record<string, unknown>,
  organizationId: string,
  userId: string
): void {
  startCleanup();

  store.set(id, {
    id,
    action,
    paramsHash: hashParams(params),
    organizationId,
    userId,
    createdAt: Date.now(),
  });
}

/**
 * Pending action을 검증하고, 유효하면 store에서 삭제(1회 소비)한다.
 * PUT /api/ai/write에서 승인 실행 시 호출.
 *
 * 검증 항목:
 * 1. 존재 여부 (만료/미등록)
 * 2. TTL 초과
 * 3. organizationId + userId 일치
 * 4. params 해시 일치 (변조 감지)
 */
export function validateAndConsume(
  id: string,
  params: Record<string, unknown>,
  organizationId: string,
  userId: string
): ValidateResult {
  const stored = store.get(id);

  // 1. 존재 여부
  if (!stored) {
    return {
      valid: false,
      error: "만료되었거나 유효하지 않은 승인 요청입니다. 다시 요청해주세요.",
      status: 400,
    };
  }

  // 2. TTL 초과
  if (Date.now() - stored.createdAt > TTL_MS) {
    store.delete(id);
    return {
      valid: false,
      error: "승인 시간이 초과되었습니다. 다시 요청해주세요.",
      status: 400,
    };
  }

  // 3. 권한 검증
  if (stored.organizationId !== organizationId || stored.userId !== userId) {
    return {
      valid: false,
      error: "승인 권한이 없습니다.",
      status: 403,
    };
  }

  // 4. 변조 감지
  const currentHash = hashParams(params);
  if (stored.paramsHash !== currentHash) {
    store.delete(id);
    return {
      valid: false,
      error: "요청 내용이 변조되었습니다. 다시 요청해주세요.",
      status: 400,
    };
  }

  // 검증 통과 → 1회 소비 (삭제)
  store.delete(id);
  return { valid: true };
}

/**
 * Store 크기 반환 (테스트/디버깅용)
 */
export function getStoreSize(): number {
  return store.size;
}

/**
 * Store 초기화 (테스트용)
 */
export function clearStore(): void {
  store.clear();
}
