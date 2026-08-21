import { getEnv } from "./env";
import { HarnessError } from "./harness/types";

/**
 * Embeds an array of texts using the configured embedding model.
 * Automatically prefixes text with 'query: ' or 'passage: ' as required by E5 models.
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

  const isJina = apiUrl.includes("jina.ai");
  const isHF = apiUrl.includes("huggingface.co");

  // Format request payload based on provider
  let requestBody: any;
  if (isJina) {
    requestBody = {
      model: model.includes("jina") ? model : "jina-embeddings-v3",
      task: type === "query" ? "retrieval.query" : "retrieval.passage",
      input: texts,
    };
  } else if (isHF) {
    // Prefix texts for E5 / HF models compatibility
    const prefixedTexts = texts.map((t) => {
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
      input: texts,
    };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new HarnessError(
        "UpstreamError",
        `Embedding API failed with status ${response.status}: ${errorText}`,
        response.status,
        { errorText }
      );
    }

    const data = await response.json();

    // 1. Check for Jina / OpenAI standard format ({ data: [{ embedding: [...] }] })
    if (data && Array.isArray(data.data)) {
      const sorted = [...data.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      return sorted.map((d: any) => d.embedding);
    }

    // 2. Check for HF direct array format
    if (Array.isArray(data)) {
      const result: number[][] = [];
      for (const item of data) {
        if (Array.isArray(item)) {
          if (typeof item[0] === "number") {
            result.push(item as number[]);
          } else if (Array.isArray(item[0])) {
            // Token pooling fallback
            const pooled = (item as number[][]).reduce((acc, tokenVec) => {
              return acc.map((val, idx) => val + tokenVec[idx]);
            }, new Array((item[0] as number[]).length).fill(0))
            .map((sum) => sum / item.length);
            result.push(pooled);
          }
        } else if (typeof item === "number") {
          return [data as number[]];
        }
      }
      return result;
    }

    throw new HarnessError(
      "ValidationError",
      "Embedding response is in an unexpected format",
      200,
      data
    );
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
