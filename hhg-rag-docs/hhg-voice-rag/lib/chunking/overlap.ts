import { Chunk, countTokens } from "./types";

interface OverlapOpts {
  chunkSize?: number;
  overlapSize?: number;
  queryType?: "definition" | "comparison" | "howto" | "factoid" | "other";
  isSelected?: boolean;
}

/**
 * Splits text into fixed size chunks with a sliding window overlap.
 */
export function chunkOverlap(
  text: string,
  docId: string = "doc_0",
  opts?: OverlapOpts
): Chunk[] {
  const chunkSize = opts?.chunkSize || 256;
  const overlapSize = opts?.overlapSize || 64;
  const queryType = opts?.queryType || "other";
  const isSelected = opts?.isSelected !== undefined ? opts.isSelected : false;

  if (!text.trim()) {
    return [];
  }

  const words = text.trim().split(/\s+/);
  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  let wordIndex = 0;

  while (wordIndex < words.length) {
    const currentWords: string[] = [];
    let currentTokens = 0;
    let tempIndex = wordIndex;

    // Build the chunk up to chunkSize
    while (tempIndex < words.length) {
      const word = words[tempIndex];
      const wordTokens = countTokens(word);

      if (currentTokens + wordTokens > chunkSize && currentWords.length > 0) {
        break;
      }

      currentWords.push(word);
      currentTokens += wordTokens + 1; // +1 for spacing approximation
      tempIndex++;
    }

    const chunkText = currentWords.join(" ");
    chunks.push({
      text: chunkText,
      chunkIndex,
      tokenCount: countTokens(chunkText),
      metadata: {
        docId,
        strategy: "overlap",
        queryType,
        isSelected,
        overlapWith: [], // Populated later or left as empty array
      },
    });

    // If we've reached the end, we're done
    if (tempIndex >= words.length) {
      break;
    }

    // Now, backtrack tempIndex to compute the start of the next chunk.
    // We backtrack until we cover approximately `overlapSize` tokens.
    let overlapTokens = 0;
    let backtrackCount = 0;

    while (tempIndex - backtrackCount > wordIndex && overlapTokens < overlapSize) {
      backtrackCount++;
      const word = words[tempIndex - backtrackCount];
      overlapTokens += countTokens(word) + 1;
    }

    // Set next chunk start word index.
    // If we couldn't backtrack (e.g. single giant word), just move forward.
    const nextWordIndex = tempIndex - backtrackCount;
    if (nextWordIndex === wordIndex) {
      wordIndex = tempIndex; // force progress
    } else {
      wordIndex = nextWordIndex;
    }

    chunkIndex++;
  }

  // Populate overlap links (adjacent chunks)
  for (let i = 0; i < chunks.length; i++) {
    const adj: string[] = [];
    if (i > 0) adj.push(`${docId}_overlap_${i - 1}`);
    if (i < chunks.length - 1) adj.push(`${docId}_overlap_${i + 1}`);
    chunks[i].metadata.overlapWith = adj;
  }

  return chunks;
}
