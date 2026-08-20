import { Chunk, countTokens } from "./types";

interface FixedOpts {
  chunkSize?: number;
  queryType?: "definition" | "comparison" | "howto" | "factoid" | "other";
  isSelected?: boolean;
}

/**
 * Splits text into fixed size chunks without overlap.
 */
export function chunkFixed(
  text: string,
  docId: string,
  opts?: FixedOpts
): Chunk[] {
  const chunkSize = opts?.chunkSize || 256;
  const queryType = opts?.queryType || "other";
  const isSelected = opts?.isSelected !== undefined ? opts.isSelected : false;

  if (!text.trim()) {
    return [];
  }

  // Split text by whitespace to preserve natural words
  const words = text.trim().split(/\s+/);
  const chunks: Chunk[] = [];
  let currentWords: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const word of words) {
    const wordTokens = countTokens(word);
    
    // If adding this word exceeds chunk size and we already have words, commit the chunk
    if (currentTokens + wordTokens > chunkSize && currentWords.length > 0) {
      const chunkText = currentWords.join(" ");
      chunks.push({
        text: chunkText,
        chunkIndex,
        tokenCount: countTokens(chunkText),
        metadata: {
          docId,
          strategy: "fixed",
          queryType,
          isSelected,
        },
      });
      chunkIndex++;
      currentWords = [];
      currentTokens = 0;
    }
    
    currentWords.push(word);
    currentTokens += wordTokens + 1; // +1 to approximate space token
  }

  // Handle remaining words
  if (currentWords.length > 0) {
    const chunkText = currentWords.join(" ");
    chunks.push({
      text: chunkText,
      chunkIndex,
      tokenCount: countTokens(chunkText),
      metadata: {
        docId,
        strategy: "fixed",
        queryType,
        isSelected,
      },
    });
  }

  return chunks;
}
