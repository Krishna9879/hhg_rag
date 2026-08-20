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
  type: "query" | "passage",
  signal?: AbortSignal
): Promise<number[][]> {
  const env = getEnv();
  const model = env.EMBEDDING_MODEL || "intfloat/multilingual-e5-large";
  
  // Default to standard HuggingFace Inference API if URL is not provided
  let apiUrl = env.EMBEDDING_API_URL;
  if (!apiUrl) {
    apiUrl = `https://api-inference.huggingface.co/models/${model}`;
  }

  const apiKey = env.EMBEDDING_API_KEY || env.HF_TOKEN;

  if (texts.length === 0) {
    return [];
  }

  // Prefix texts for E5 compatibility
  const prefixedTexts = texts.map((t) => {
    // Avoid double prefixing if it's already prefixed
    if (t.startsWith("query: ") || t.startsWith("passage: ")) {
      return t;
    }
    return `${type}: ${t}`;
  });

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
      body: JSON.stringify({ inputs: prefixedTexts }),
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

    // The response from HF feature-extraction can sometimes be a nested 3D array [[[float]]] if it returns token-level embeddings,
    // or a 2D array [[float]] if it does pooling.
    // For standard feature-extraction on sentence transformers, HF returns 2D [[float]].
    // Let's validate the return type.
    if (!Array.isArray(data)) {
      throw new HarnessError(
        "ValidationError",
        "Embedding response is not a valid JSON array",
        200,
        data
      );
    }

    // Check if the response contains any error messages from Hugging Face
    if ("error" in data) {
      throw new HarnessError(
        "UpstreamError",
        `Hugging Face API returned error: ${(data as any).error}`,
        200,
        data
      );
    }

    // In some cases, HF Inference API returns a raw list of numbers if inputs had length 1, 
    // but usually it mirrors the batch dimension. Let's make sure it's a 2D array.
    const result: number[][] = [];
    for (const item of data) {
      if (Array.isArray(item)) {
        if (typeof item[0] === "number") {
          result.push(item as number[]);
        } else if (Array.isArray(item[0])) {
          // If 3D array (token embeddings instead of pooled sentence embedding),
          // we can average pool them as a fallback.
          // Usually E5 models on HF feature-extraction returns the pooled 2D array.
          const pooled = (item as number[][]).reduce((acc, tokenVec) => {
            return acc.map((val, idx) => val + tokenVec[idx]);
          }, new Array((item[0] as number[]).length).fill(0))
          .map((sum) => sum / item.length);
          result.push(pooled);
        }
      } else if (typeof item === "number") {
        // Single text was sent, HF returned 1D array directly (rare but possible depending on endpoint config)
        return [data as number[]];
      }
    }

    if (result.length !== texts.length) {
      throw new HarnessError(
        "ValidationError",
        `Expected ${texts.length} embeddings, got ${result.length}`,
        200,
        data
      );
    }

    return result;
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
