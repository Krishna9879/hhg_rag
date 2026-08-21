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

  // Search each collection concurrently with timeout and retry per collection
  const searchPromises = strategies.map(async ({ name, collection }) => {
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
      resultsByStrategy[name] = results;
    } catch (err) {
      console.warn(`[Harness] Retrieval failed for strategy '${name}':`, (err as Error).message);
      missingStrategies.push(name);
      resultsByStrategy[name] = [];
    }
  });

  await Promise.all(searchPromises);

  const latencyMs = Date.now() - start;
  recordStageTiming(ctx, "retrieval", latencyMs);

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
