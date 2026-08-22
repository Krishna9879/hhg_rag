import { QdrantClient } from "@qdrant/js-client-rest";
import { getEnv } from "./env";
import { HarnessError } from "./harness/types";

export interface QdrantPointPayload {
  [key: string]: unknown;
  docId: string;
  strategy: "fixed" | "overlap" | "semantic" | "structural";
  chunkIndex: number;
  text: string;
  tokenCount: number;
  queryType: "definition" | "comparison" | "howto" | "factoid" | "other";
  isSelected: boolean;
  sourceDataset: string;
  createdAt: string;
  overlapWith?: string[];
  breakpointScore?: number;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: QdrantPointPayload;
}

let _client: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (!_client) {
    const env = getEnv();
    if (!env.QDRANT_URL) {
      throw new HarnessError(
        "ValidationError",
        "QDRANT_URL is not configured in env variables."
      );
    }
    _client = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY || undefined,
      checkCompatibility: false,
    });
  }
  return _client;
}

// In-memory query vector cache (1-hour TTL)
interface SearchCacheEntry {
  results: QdrantSearchResult[];
  expiresAt: number;
}

const searchCache = new Map<string, SearchCacheEntry>();
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getVectorKey(collectionName: string, vector: number[], topK: number): string {
  // Use first 8 + last 8 float values as a lightweight fingerprint
  const head = vector.slice(0, 8).map((v) => v.toFixed(3)).join(",");
  const tail = vector.slice(-8).map((v) => v.toFixed(3)).join(",");
  return `${collectionName}:${topK}:${vector.length}:${head}:${tail}`;
}

/**
 * Searches a collection in Qdrant with a query vector.
 * Includes in-memory caching and optimized HNSW search parameters (hnsw_ef: 32).
 */
export async function search(
  collectionName: string,
  vector: number[],
  topK: number = 5,
  filters?: any,
  signal?: AbortSignal
): Promise<QdrantSearchResult[]> {
  const cacheKey = getVectorKey(collectionName, vector, topK);
  const now = Date.now();
  const cached = searchCache.get(cacheKey);

  if (cached && now < cached.expiresAt) {
    return cached.results;
  }

  const client = getClient();
  const searchParams = {
    hnsw_ef: 32,
    exact: false,
  };

  try {
    let points: any[] = [];
    
    // Check if client supports the newer .query method (REST client >= 2.0.0)
    if (typeof (client as any).query === "function") {
      const response = await (client as any).query(collectionName, {
        query: vector,
        limit: topK,
        filter: filters,
        params: searchParams,
        with_payload: true,
      }, { signal });
      points = response.points || [];
    } else {
      // Fallback for older client version
      points = await (client as any).search(collectionName, {
        vector: vector,
        limit: topK,
        filter: filters,
        params: searchParams,
        with_payload: true,
      }, { signal });
    }

    const formatted: QdrantSearchResult[] = points.map((p: any) => ({
      id: p.id,
      score: p.score,
      payload: p.payload as QdrantPointPayload | undefined,
    }));

    // Cache results
    if (searchCache.size > 500) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, {
      results: formatted,
      expiresAt: now + SEARCH_CACHE_TTL_MS,
    });

    return formatted;
  } catch (error) {
    const err = error as Error;
    if (err.name === "AbortError") {
      throw new HarnessError(
        "UpstreamTimeout",
        `Qdrant search on collection '${collectionName}' timed out.`
      );
    }
    throw new HarnessError(
      "UpstreamError",
      `Qdrant search failed: ${err.message}`,
      undefined,
      err
    );
  }
}

/**
 * Upserts a batch of points into a Qdrant collection.
 */
export async function upsertBatch(
  collectionName: string,
  points: Array<{
    id: string;
    vector: number[];
    payload: QdrantPointPayload;
  }>
): Promise<void> {
  const client = getClient();
  try {
    await client.upsert(collectionName, {
      wait: true,
      points,
    });
  } catch (error) {
    const err = error as Error;
    throw new HarnessError(
      "UpstreamError",
      `Qdrant upsert failed for collection '${collectionName}': ${err.message}`,
      undefined,
      err
    );
  }
}

/**
 * Creates a Qdrant collection if it does not already exist.
 */
export async function createCollectionIfNotExists(
  collectionName: string,
  vectorSize: number = 1024
): Promise<void> {
  const client = getClient();
  try {
    // Check if collection already exists
    const collectionsRes = await client.getCollections();
    const exists = collectionsRes.collections.some(
      (c) => c.name === collectionName
    );

    if (!exists) {
      await client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
        hnsw_config: {
          m: 16,
          ef_construct: 128,
        },
      });
    }
  } catch (error) {
    const err = error as Error;
    throw new HarnessError(
      "UpstreamError",
      `Qdrant createCollection failed for '${collectionName}': ${err.message}`,
      undefined,
      err
    );
  }
}
