import { search, QdrantSearchResult } from "../../qdrant";
import { getCollectionNames } from "../../env";
import { withRetry } from "../retry";
import { withTimeout } from "../timeout";
import { HarnessContext, HarnessError, StageResult } from "../types";
import { recordStageTiming } from "../trace";

const RETRIEVE_TIMEOUT_PER_COLLECTION_MS = 4000;
const TOP_K_PER_COLLECTION = 5;

export interface RetrievalOutput {
  resultsByStrategy: Record<string, QdrantSearchResult[]>;
  degraded: boolean;
  missingStrategies: string[];
}

export async function runRetrieveStage(
  ctx: HarnessContext,
  queryVector: number[]
): Promise<StageResult<RetrievalOutput>> {
  const start = Date.now();
  const collections = getCollectionNames();

  const strategies: Array<{ name: string; collection: string }> = [
    { name: "fixed", collection: collections.fixed },
    { name: "overlap", collection: collections.overlap },
    { name: "semantic", collection: collections.semantic },
    { name: "structural", collection: collections.structural },
  ];

  const resultsByStrategy: Record<string, QdrantSearchResult[]> = {};
  const missingStrategies: string[] = [];
  const perStrategyMs: Record<string, number> = {};

  // Search each collection concurrently in true parallel (Promise.all)
  const searchPromises = strategies.map(async ({ name, collection }) => {
    const stratStart = Date.now();
    try {
      const results = await withRetry(
        async () => {
          return await withTimeout(
            async (signal) => {
              return await search(collection, queryVector, TOP_K_PER_COLLECTION, undefined, signal);
            },
            RETRIEVE_TIMEOUT_PER_COLLECTION_MS,
            `Qdrant search (${name})`
          );
        },
        {
          attempts: 2,
          backoffMs: [0, 80],
          retryOn: ["UpstreamTimeout", "UpstreamError"],
        }
      );
      perStrategyMs[name] = Date.now() - stratStart;
      resultsByStrategy[name] = results;
    } catch (err) {
      perStrategyMs[name] = Date.now() - stratStart;
      console.warn(`[Harness] Retrieval failed for strategy '${name}':`, (err as Error).message);
      missingStrategies.push(name);
      resultsByStrategy[name] = [];
    }
  });

  await Promise.all(searchPromises);

  const latencyMs = Date.now() - start;
  recordStageTiming(ctx, "retrieval", latencyMs);

  console.log(
    `[Retrieve Stage] Parallel results (${strategies.length - missingStrategies.length}/${strategies.length}): ` +
    `fixed=${perStrategyMs.fixed ?? 0}ms, overlap=${perStrategyMs.overlap ?? 0}ms, ` +
    `semantic=${perStrategyMs.semantic ?? 0}ms, structural=${perStrategyMs.structural ?? 0}ms ` +
    `| Total parallel wall-clock=${latencyMs}ms`
  );

  const successfulStrategiesCount = strategies.length - missingStrategies.length;

  if (successfulStrategiesCount === 0) {
    return {
      ok: false,
      error: new HarnessError(
        "UpstreamError",
        "Total retrieval failure across all 4 vector collections"
      ),
      latencyMs,
      attempts: 1,
    };
  }

  const degraded = missingStrategies.length > 0;

  return {
    ok: true,
    data: {
      resultsByStrategy,
      degraded,
      missingStrategies,
    },
    latencyMs,
  };
}
