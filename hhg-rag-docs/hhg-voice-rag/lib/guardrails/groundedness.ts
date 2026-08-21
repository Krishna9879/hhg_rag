import { getEnv } from "../env";

export interface GroundednessResult {
  pass: boolean;
  maxSimilarity: number;
  threshold: number;
  reason?: "ungrounded";
  message?: string;
}

/**
 * Validates whether retrieved context is sufficiently similar to the query.
 * If below threshold, skips LLM generation to avoid hallucinating facts not in the dataset.
 *
 * IMPORTANT: The absolute floor is kept low (0.15) because with a small corpus (10 docs),
 * cosine similarity scores from Jina embeddings tend to be in the 0.2-0.7 range.
 * Only completely disconnected queries (random noise, gibberish) score below 0.15.
 */
export function runGroundednessGuardrail(maxSimilarity: number): GroundednessResult {
  const env = getEnv();
  const threshold = env.GROUNDEDNESS_THRESHOLD ?? 0.72;

  // Log for debugging
  console.log(
    `[Groundedness] maxSimilarity=${maxSimilarity.toFixed(4)} threshold=${threshold} floor=0.15`
  );

  // Case 1: No results at all (maxSimilarity = 0 means Qdrant returned nothing)
  if (maxSimilarity <= 0) {
    console.log(`[Groundedness] REFUSED: maxSimilarity=0 (no retrieval results)`);
    return {
      pass: false,
      maxSimilarity,
      threshold,
      reason: "ungrounded",
      message:
        "मुझे इस डेटासेट में इससे संबंधित प्रमाणित जानकारी नहीं मिली। कृपया कोई अन्य प्रश्न पूछें। (I couldn't find grounded information about that in this dataset.)",
    };
  }

  // Case 2: Results exist but are completely disconnected (absolute floor)
  if (maxSimilarity < 0.15) {
    console.log(`[Groundedness] REFUSED: maxSimilarity=${maxSimilarity.toFixed(4)} < 0.15 (absolute floor)`);
    return {
      pass: false,
      maxSimilarity,
      threshold,
      reason: "ungrounded",
      message:
        "मुझे इस डेटासेट में इससे संबंधित प्रमाणित जानकारी नहीं मिली। कृपया कोई अन्य प्रश्न पूछें। (I couldn't find grounded information about that in this dataset.)",
    };
  }

  // Case 3: Results exist and are above the floor → pass (let the LLM answer)
  console.log(`[Groundedness] PASSED: maxSimilarity=${maxSimilarity.toFixed(4)} >= 0.15`);
  return {
    pass: true,
    maxSimilarity,
    threshold,
  };
}

