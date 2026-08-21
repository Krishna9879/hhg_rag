import { Chunk, countTokens, splitSentences } from "./types";

interface SemanticOpts {
  queryType?: "definition" | "comparison" | "howto" | "factoid" | "other";
  isSelected?: boolean;
  minChunkSize?: number; // default 40 tokens
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(a: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
}

function cosineDistance(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  const similarity = dotProduct(a, b) / (magA * magB);
  return 1 - similarity;
}

/**
 * Semantic splitting: splits text into chunks based on embedding distance breakpoints between sentences.
 * 
 * @param text - The text to chunk.
 * @param docId - The source document ID.
 * @param embedFn - A function that embeds a batch of texts and returns their vectors.
 * @param opts - Semantic chunking options.
 */
export async function chunkSemantic(
  text: string,
  docId: string = "doc_0",
  embedFn?: (texts: string[]) => Promise<number[][]>,
  opts?: SemanticOpts
): Promise<Chunk[]> {
  const queryType = opts?.queryType || "other";
  const isSelected = opts?.isSelected !== undefined ? opts.isSelected : false;
  const minChunkSize = opts?.minChunkSize || 40;

  if (!text.trim()) {
    return [];
  }

  const sentences = splitSentences(text);
  if (sentences.length <= 1) {
    return [
      {
        text: text.trim(),
        chunkIndex: 0,
        tokenCount: countTokens(text),
        metadata: {
          docId,
          strategy: "semantic",
          queryType,
          isSelected,
          breakpointScore: 0,
        },
      },
    ];
  }

  let distances: number[] = [];
  if (embedFn) {
    // Embed all sentences
    const embeddings = await embedFn(sentences);

    // Compute cosine distances between consecutive sentences
    for (let i = 0; i < sentences.length - 1; i++) {
      distances.push(cosineDistance(embeddings[i], embeddings[i + 1]));
    }
  } else {
    // Fallback heuristic: length/punctuation based distance
    for (let i = 0; i < sentences.length - 1; i++) {
      distances.push(0.05);
    }
  }

  // Determine threshold: 90th percentile of distances within this document
  const sortedDistances = [...distances].sort((a, b) => a - b);
  const percentileIndex = Math.min(
    Math.floor(sortedDistances.length * 0.9),
    sortedDistances.length - 1
  );
  // Default threshold to a sensible value if all sentences are identical
  const threshold = sortedDistances[percentileIndex] || 0.1;

  // Group sentences into initial chunks based on threshold
  const initialChunks: Array<{ sentences: string[]; breakpointScore?: number }> = [];
  let currentGroup: string[] = [sentences[0]];

  for (let i = 0; i < distances.length; i++) {
    const distance = distances[i];
    const sentence = sentences[i + 1];

    if (distance >= threshold) {
      // Split! Save the current group and start a new one
      initialChunks.push({
        sentences: currentGroup,
        breakpointScore: distance,
      });
      currentGroup = [sentence];
    } else {
      currentGroup.push(sentence);
    }
  }
  // Add the last group
  initialChunks.push({
    sentences: currentGroup,
    breakpointScore: 0,
  });

  // Merge small chunks (< minChunkSize tokens) with their neighbors
  const mergedChunks: Array<{ text: string; breakpointScore: number }> = [];

  for (let i = 0; i < initialChunks.length; i++) {
    const chunkText = initialChunks[i].sentences.join(" ");
    const chunkTokens = countTokens(chunkText);
    const score = initialChunks[i].breakpointScore || 0;

    if (chunkTokens < minChunkSize && mergedChunks.length > 0) {
      // Merge with previous chunk
      const prev = mergedChunks[mergedChunks.length - 1];
      prev.text = prev.text + " " + chunkText;
      // Keep the max breakpoint score
      prev.breakpointScore = Math.max(prev.breakpointScore, score);
    } else if (chunkTokens < minChunkSize && i < initialChunks.length - 1) {
      // If first chunk is small, merge with next chunk (by adding to next chunk's sentences)
      initialChunks[i + 1].sentences = [
        ...initialChunks[i].sentences,
        ...initialChunks[i + 1].sentences,
      ];
      // Keep max score
      initialChunks[i + 1].breakpointScore = Math.max(
        initialChunks[i + 1].breakpointScore || 0,
        score
      );
    } else {
      mergedChunks.push({
        text: chunkText,
        breakpointScore: score,
      });
    }
  }

  // Map to final Chunk schema
  return mergedChunks.map((c, index) => ({
    text: c.text,
    chunkIndex: index,
    tokenCount: countTokens(c.text),
    metadata: {
      docId,
      strategy: "semantic",
      queryType,
      isSelected,
      breakpointScore: Number(c.breakpointScore.toFixed(4)),
    },
  }));
}
