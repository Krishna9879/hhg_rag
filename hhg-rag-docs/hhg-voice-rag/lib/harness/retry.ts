import { HarnessError } from "./types";

export interface RetryOptions {
  attempts: number; // e.g. 2
  backoffMs?: number[]; // e.g. [0, 150]
  retryOn?: Array<number | string>; // e.g. [502, 503, 504, 'ETIMEDOUT', 'UpstreamTimeout', 'UpstreamError']
  onRetry?: (attempt: number, error: unknown) => void;
}

function isRetryable(error: unknown, retryOn?: Array<number | string>): boolean {
  if (!retryOn || retryOn.length === 0) {
    return true;
  }

  if (error instanceof HarnessError) {
    if (error.statusCode && retryOn.includes(error.statusCode)) return true;
    if (retryOn.includes(error.type)) return true;
  }

  const err = error as any;
  if (err?.code && retryOn.includes(err.code)) return true;
  if (err?.status && retryOn.includes(err.status)) return true;
  if (err?.statusCode && retryOn.includes(err.statusCode)) return true;

  return false;
}

/**
 * Executes a function with automatic retries and structured backoff.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const maxAttempts = Math.max(1, options.attempts);
  const backoff = options.backoffMs || [0, 150];

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !isRetryable(error, options.retryOn)) {
        throw error;
      }

      if (options.onRetry) {
        options.onRetry(attempt, error);
      }

      const delayMs = backoff[attempt - 1] ?? backoff[backoff.length - 1] ?? 100;
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
