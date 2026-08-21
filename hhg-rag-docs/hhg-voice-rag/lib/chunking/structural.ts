import { Chunk, countTokens, splitSentences } from "./types";

interface StructuralOpts {
  queryType?: "definition" | "comparison" | "howto" | "factoid" | "other";
  isSelected?: boolean;
  passageRank?: number;
  maxTokens?: number; // default 512
}

/**
 * Structural / metadata-aware chunking.
 * Preserves the natural boundaries of MSMARCO passages, enriches with query-type and rank metadata.
 * If a passage exceeds maxTokens (512), it is split with a 1-sentence overlap.
 */
export function chunkStructural(
  text: string,
  docId: string = "doc_0",
  opts?: StructuralOpts
): Chunk[] {
  const queryType = opts?.queryType || "other";
  const isSelected = opts?.isSelected !== undefined ? opts.isSelected : false;
  const passageRank = opts?.passageRank || 0;
  const maxTokens = opts?.maxTokens || 512;

  if (!text.trim()) {
    return [];
  }

  const tokenCount = countTokens(text);

  // Happy path: passage fits entirely inside the structural token limit
  if (tokenCount <= maxTokens) {
    return [
      {
        text: text.trim(),
        chunkIndex: 0,
        tokenCount,
        metadata: {
          docId,
          strategy: "structural",
          queryType,
          isSelected,
          passageRank,
        },
      },
    ];
  }

  // Sad path: passage exceeds limit, split sentence-by-sentence with 1-sentence overlap
  const sentences = splitSentences(text);
  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  let sentenceIndex = 0;

  while (sentenceIndex < sentences.length) {
    const currentSentences: string[] = [];
    let currentTokens = 0;

    // If we're not on the first chunk, carry over the last sentence of the previous chunk for overlap
    if (chunkIndex > 0 && sentenceIndex > 0) {
      const overlapSentence = sentences[sentenceIndex - 1];
      currentSentences.push(overlapSentence);
      currentTokens += countTokens(overlapSentence) + 1;
    }

    while (sentenceIndex < sentences.length) {
      const sentence = sentences[sentenceIndex];
      const sentenceTokens = countTokens(sentence);

      // If adding this sentence exceeds the limit, stop (unless we have no sentences in this chunk yet)
      if (currentTokens + sentenceTokens > maxTokens && currentSentences.length > 0) {
        break;
      }

      currentSentences.push(sentence);
      currentTokens += sentenceTokens + 1;
      sentenceIndex++;
    }

    const chunkText = currentSentences.join(" ");
    chunks.push({
      text: chunkText,
      chunkIndex,
      tokenCount: countTokens(chunkText),
      metadata: {
        docId,
        strategy: "structural",
        queryType,
        isSelected,
        passageRank,
      },
    });

    chunkIndex++;
  }

  return chunks;
}
