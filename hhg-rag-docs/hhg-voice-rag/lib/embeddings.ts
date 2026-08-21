import { getEnv } from "./env";
import { HarnessError } from "./harness/types";

// In-memory LRU/TTL Embedding Cache (5-minute TTL, max 500 entries)
interface CacheEntry {
  vector: number[];
  expiresAt: number;
}

const embeddingCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

function getCacheKey(model: string, type: string, text: string): string {
  return `${model}:${type}:${text.trim().toLowerCase()}`;
}

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of embeddingCache.entries()) {
    if (now > entry.expiresAt) {
      embeddingCache.delete(key);
    }
  }
}

/**
 * Embeds an array of texts using the configured embedding model.
 * Automatically prefixes text with 'query: ' or 'passage: ' as required by E5 models.
 * Includes in-memory caching (TTL 5 min) and fine-grained raw HTTP timing.
 * 
 * @param texts - Array of strings to embed.
 * @param type - Whether the texts are queries or passages (for E5 prefixing).
 * @param signal - AbortSignal for timeout/cancellation.
 * @returns Array of embedding vectors.
 */
export async function embed(
  texts: string[],
  type: "query" | "passage" = "passage",
  signal?: AbortSignal
): Promise<number[][]> {
  const env = getEnv();
  const model = env.EMBEDDING_MODEL || "jina-embeddings-v3";
  
  let apiUrl = env.EMBEDDING_API_URL;
  if (!apiUrl) {
    apiUrl = `https://api-inference.huggingface.co/models/${model}`;
  }

  const apiKey = env.EMBEDDING_API_KEY || env.HF_TOKEN;

  if (texts.length === 0) {
    return [];
  }

  // 1. Check in-memory cache for each text
  const now = Date.now();
  cleanExpiredCache();

  const results: Array<number[] | null> = new Array(texts.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  texts.forEach((text, idx) => {
    const key = getCacheKey(model, type, text);
    const cached = embeddingCache.get(key);
    if (cached && now < cached.expiresAt) {
      results[idx] = cached.vector;
    } else {
      uncachedIndices.push(idx);
      uncachedTexts.push(text);
    }
  });

  // If all texts were found in cache, return immediately (0ms network time!)
  if (uncachedTexts.length === 0) {
    console.log(`[Embed Cache HIT] All ${texts.length} texts resolved from memory cache (0ms API latency).`);
    return results as number[][];
  }

  const isJina = apiUrl.includes("jina.ai");
  const isHF = apiUrl.includes("huggingface.co");

  // Format request payload based on provider
  let requestBody: any;
  if (isJina) {
    requestBody = {
      model: model.includes("jina") ? model : "jina-embeddings-v3",
      task: type === "query" ? "retrieval.query" : "retrieval.passage",
      input: uncachedTexts,
    };
  } else if (isHF) {
    // Prefix texts for E5 / HF models compatibility
    const prefixedTexts = uncachedTexts.map((t) => {
      if (t.startsWith("query: ") || t.startsWith("passage: ")) {
        return t;
      }
      return `${type}: ${t}`;
    });
    requestBody = { inputs: prefixedTexts };
  } else {
    // Standard OpenAI compatible format
    requestBody = {
      model,
      input: uncachedTexts,
    };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const httpStart = Date.now();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal,
    });
    const httpMs = Date.now() - httpStart;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new HarnessError(
        "UpstreamError",
        `Embedding API failed with status ${response.status}: ${errorText}`,
        response.status,
        { errorText, httpMs }
      );
    }

    const parseStart = Date.now();
    const data = await response.json();
    const parseMs = Date.now() - parseStart;

    let newVectors: number[][] = [];

    // 1. Check for Jina / OpenAI standard format ({ data: [{ embedding: [...] }] })
    if (data && Array.isArray(data.data)) {
      const sorted = [...data.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      newVectors = sorted.map((d: any) => d.embedding);
    } else if (Array.isArray(data)) {
      // 2. Check for HF direct array format
      for (const item of data) {
        if (Array.isArray(item)) {
          if (typeof item[0] === "number") {
            newVectors.push(item as number[]);
          } else if (Array.isArray(item[0])) {
            // Token pooling fallback
            const pooled = (item as number[][]).reduce((acc, tokenVec) => {
              return acc.map((val, idx) => val + tokenVec[idx]);
            }, new Array((item[0] as number[]).length).fill(0))
            .map((sum) => sum / item.length);
            newVectors.push(pooled);
          }
        } else if (typeof item === "number") {
          newVectors.push(data as number[]);
          break;
        }
      }
    } else {
      throw new HarnessError(
        "ValidationError",
        "Embedding response is in an unexpected format",
        200,
        data
      );
    }

    console.log(
      `[Embed API] Raw HTTP RTT=${httpMs}ms, JSON Parse=${parseMs}ms, Total=${httpMs + parseMs}ms for ${uncachedTexts.length} text(s)`
    );

    // Store newly embedded vectors in cache and populate results
    newVectors.forEach((vector, i) => {
      const originalIdx = uncachedIndices[i];
      const text = uncachedTexts[i];
      results[originalIdx] = vector;

      // Cache with TTL
      if (embeddingCache.size >= MAX_CACHE_SIZE) {
        const firstKey = embeddingCache.keys().next().value;
        if (firstKey) embeddingCache.delete(firstKey);
      }
      embeddingCache.set(getCacheKey(model, type, text), {
        vector,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    });

    return results as number[][];
  } catch (error) {
    if (error instanceof HarnessError) {
      throw error;
    }

    const err = error as Error;
    if (err.name === "AbortError") {
      throw new HarnessError("UpstreamTimeout", "Embedding request timed out.");
    }

    throw new HarnessError(
      "UpstreamError",
      `Failed to embed texts: ${err.message}`,
      undefined,
      err
    );
  }
}

