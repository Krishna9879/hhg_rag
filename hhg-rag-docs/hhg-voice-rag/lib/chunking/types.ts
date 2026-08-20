export interface Chunk {
  text: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: {
    docId: string;
    strategy: "fixed" | "overlap" | "semantic" | "structural";
    queryType: "definition" | "comparison" | "howto" | "factoid" | "other";
    isSelected: boolean;
    overlapWith?: string[];
    breakpointScore?: number;
    passageRank?: number;
  };
}

/**
 * A simple tokenizer helper to approximate token counts for English text.
 * Splits on words/numbers and counts punctuation as tokens, which is a good
 * approximation of standard BPE tokenizers (like cl100k_base).
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  // Match words, numbers, and individual punctuation marks
  const tokens = text.match(/\w+|[^\w\s]/g);
  return tokens ? tokens.length : 0;
}

/**
 * Split text into rough sentences using common punctuation.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  // Split on sentence boundaries (., !, ?) while keeping the punctuation
  const sentenceRegex = /[^.!?]+[.!?]*/g;
  const matches = text.match(sentenceRegex) || [text];
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}
