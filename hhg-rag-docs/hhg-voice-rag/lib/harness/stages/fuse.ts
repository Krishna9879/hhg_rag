import { QdrantSearchResult } from "../../qdrant";
import { HarnessContext, StageResult } from "../types";
import { recordStageTiming } from "../trace";

const FUSE_TOP_K = 5;
const RRF_K = 60; // Standard reciprocal rank fusion constant

export interface FusedChunk {
  docId: string;
  chunkId: string | number;
  text: string;
  strategy: string;
  rawScore: number;
  rrfScore: number;
  metadata?: Record<string, any>;
}

export interface FusionOutput {
  chunks: FusedChunk[];
  maxSimilarity: number;
}

export async function runFuseStage(
  ctx: HarnessContext,
  resultsByStrategy: Record<string, QdrantSearchResult[]>
): Promise<StageResult<FusionOutput>> {
  const start = Date.now();

  const chunkScores: Map<
    string,
    {
      docId: string;
      chunkId: string | number;
      text: string;
      strategy: string;
      rawScore: number;
      rrfScore: number;
      metadata?: Record<string, any>;
    }
  > = new Map();

  let maxSimilarity = 0;

  for (const [strategy, results] of Object.entries(resultsByStrategy)) {
    results.forEach((item, rank) => {
      const text = item.payload?.text || "";
      if (!text) return;

      const rawScore = item.score ?? 0;
      if (rawScore > maxSimilarity) {
        maxSimilarity = rawScore;
      }

      // Deduplicate key by docId or unique chunk identity
      const key = `${item.payload?.docId || item.id}_${item.payload?.chunkIndex ?? 0}`;
      const rrfIncrement = 1 / (RRF_K + rank + 1);

      if (chunkScores.has(key)) {
        const existing = chunkScores.get(key)!;
        existing.rrfScore += rrfIncrement;
        if (rawScore > existing.rawScore) {
          existing.rawScore = rawScore;
        }
      } else {
        chunkScores.set(key, {
          docId: item.payload?.docId || String(item.id),
          chunkId: item.id,
          text,
          strategy: item.payload?.strategy || strategy,
          rawScore,
          rrfScore: rrfIncrement,
          metadata: item.payload as any,
        });
      }
    });
  }

  // Sort by combined RRF score descending
  const sorted = Array.from(chunkScores.values()).sort(
    (a, b) => b.rrfScore - a.rrfScore
  );

  const topChunks = sorted.slice(0, FUSE_TOP_K);

  const latencyMs = Date.now() - start;
  recordStageTiming(ctx, "fuse", latencyMs);

  return {
    ok: true,
    data: {
      chunks: topChunks,
      maxSimilarity,
    },
    latencyMs,
  };
}
