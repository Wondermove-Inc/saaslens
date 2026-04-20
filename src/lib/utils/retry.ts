// src/lib/utils/retry.ts
/**
 * 지수 백오프 재시도 유틸리티
 * Cron jobs 및 외부 API 호출에서 일시적 오류 처리용
 */

export interface RetryOptions {
  /** 최대 재시도 횟수 (기본값: 3) */
  maxRetries?: number;
  /** 초기 대기 시간 (ms, 기본값: 1000) */
  initialDelay?: number;
  /** 대기 시간 배수 (기본값: 2) */
  backoffMultiplier?: number;
  /** 최대 대기 시간 (ms, 기본값: 30000) */
  maxDelay?: number;
  /** 재시도할 에러 타입 확인 함수 */
  shouldRetry?: (error: Error) => boolean;
  /** 재시도 시 콜백 */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "shouldRetry" | "onRetry">> =
  {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
  };

/**
 * 기본 재시도 가능 에러 확인
 * 네트워크 오류, 타임아웃, 5xx 에러 등
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // 네트워크 관련 에러
  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("socket hang up")
  ) {
    return true;
  }

  // Rate limiting
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return true;
  }

  // 서버 에러 (5xx)
  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  ) {
    return true;
  }

  return false;
}

/**
 * 지수 백오프로 재시도하는 함수
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 마지막 시도면 에러 던지기
      if (attempt === opts.maxRetries) {
        throw lastError;
      }

      // 재시도 불가능한 에러면 즉시 던지기
      const shouldRetryFn = opts.shouldRetry || isRetryableError;
      if (!shouldRetryFn(lastError)) {
        throw lastError;
      }

      // 지수 백오프 대기 시간 계산
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );

      // 재시도 콜백
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt + 1, delay);
      }

      console.warn(
        `Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms:`,
        lastError.message
      );

      // 대기
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // 이론적으로 여기에 도달하면 안됨
  throw lastError || new Error("Unexpected retry failure");
}

/**
 * 배치 작업을 청크로 나눠서 처리 (타임아웃 방지)
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
  options: {
    /** 배치 간 대기 시간 (ms) */
    delayBetweenBatches?: number;
    /** 배치 처리 시작 콜백 */
    onBatchStart?: (batchIndex: number, totalBatches: number) => void;
    /** 실패한 항목 계속 처리할지 */
    continueOnError?: boolean;
  } = {}
): Promise<{ results: R[]; errors: { item: T; error: Error }[] }> {
  const results: R[] = [];
  const errors: { item: T; error: Error }[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < items.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize);
    const batch = items.slice(i, i + batchSize);

    if (options.onBatchStart) {
      options.onBatchStart(batchIndex, totalBatches);
    }

    // 배치 내 병렬 처리
    const batchResults = await Promise.allSettled(batch.map(processor));

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        const error =
          result.reason instanceof Error
            ? result.reason
            : new Error(String(result.reason));
        errors.push({ item: batch[j], error });

        if (!options.continueOnError) {
          throw error;
        }
      }
    }

    // 배치 간 대기 (rate limit 방지)
    if (options.delayBetweenBatches && i + batchSize < items.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.delayBetweenBatches)
      );
    }
  }

  return { results, errors };
}
