import { embed } from "../../embeddings";
import { withRetry } from "../retry";
import { withTimeout } from "../timeout";
import { HarnessContext, HarnessError, StageResult } from "../types";
import { recordStageTiming } from "../trace";

const EMBED_TIMEOUT_MS = 3000;

export async function runEmbedStage(
  ctx: HarnessContext,
  query: string
): Promise<StageResult<number[]>> {
  const start = Date.now();
  let attempts = 0;

  try {
    const vector = await withRetry(
      async (attempt) => {
        attempts = attempt;
        return await withTimeout(
          async (signal) => {
            const embeddings = await embed([query], "query", signal);
            if (!embeddings || embeddings.length === 0 || !embeddings[0]) {
              throw new HarnessError(
                "ValidationError",
                "Embedding API returned empty vector list for query"
              );
            }
            return embeddings[0];
          },
          EMBED_TIMEOUT_MS,
          "Query Embedding"
        );
      },
      {
        attempts: 2,
        backoffMs: [0, 100],
        retryOn: ["UpstreamTimeout", "UpstreamError", 502, 503, 504],
      }
    );

    const latencyMs = Date.now() - start;
    recordStageTiming(ctx, "embed", latencyMs);
    return { ok: true, data: vector, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - start;
    recordStageTiming(ctx, "embed", latencyMs);
    const harnessError =
      error instanceof HarnessError
        ? error
        : new HarnessError("UpstreamError", (error as Error).message, undefined, error);

    return {
      ok: false,
      error: harnessError,
      latencyMs,
      attempts,
    };
  }
}
