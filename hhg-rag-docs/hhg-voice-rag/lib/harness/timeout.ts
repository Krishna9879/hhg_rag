import { HarnessError } from "./types";

/**
 * Executes an async operation with a hard timeout budget.
 * Passes an AbortSignal to the operation so network requests can be cancelled cleanly.
 *
 * @param fn Function that performs the work and accepts an AbortSignal
 * @param timeoutMs Hard timeout in milliseconds
 * @param label Human-readable label for error reporting
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string = "Operation"
): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new HarnessError(
          "UpstreamTimeout",
          `${label} exceeded hard timeout budget of ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(controller.signal), timeoutPromise]);
    return result;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
