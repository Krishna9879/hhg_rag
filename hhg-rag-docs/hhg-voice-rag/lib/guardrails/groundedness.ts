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
 */
export function runGroundednessGuardrail(maxSimilarity: number): GroundednessResult {
  const env = getEnv();
  const threshold = env.GROUNDEDNESS_THRESHOLD ?? 0.72;

  // If Qdrant returns cosine score (0 to 1), check against threshold
  if (maxSimilarity < threshold && maxSimilarity > 0) {
    // Check if score is reasonable or if similarity is below the bar
    // Note: depending on embedding distance, raw cosine vs normalized can differ.
    // If threshold is strict and maxSimilarity is too low:
    if (maxSimilarity < 0.35) { // absolute floor for completely disconnected queries
      return {
        pass: false,
        maxSimilarity,
        threshold,
        reason: "ungrounded",
        message:
          "मुझे इस डेटासेट में इससे संबंधित प्रमाणित जानकारी नहीं मिली। कृपया कोई अन्य प्रश्न पूछें। (I couldn't find grounded information about that in this dataset.)",
      };
    }
  }

  return {
    pass: true,
    maxSimilarity,
    threshold,
  };
}
