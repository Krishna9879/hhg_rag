import { describe, it, expect } from "vitest";
import { chunkFixed } from "./fixed";
import { chunkOverlap } from "./overlap";
import { chunkStructural } from "./structural";
import { chunkSemantic } from "./semantic";
import { countTokens, splitSentences } from "./types";

const testPassage = 
  "The quick brown fox jumps over the lazy dog. " +
  "This is the second sentence of the test. " +
  "Here is a third sentence, containing more words to ensure splitting.";

describe("Chunking Helpers", () => {
  it("should split sentences properly", () => {
    const sentences = splitSentences(testPassage);
    expect(sentences.length).toBe(3);
    expect(sentences[0]).toBe("The quick brown fox jumps over the lazy dog.");
  });

  it("should count tokens approximately correctly", () => {
    const tokens = countTokens("Hello, world! This has 6 tokens.");
    // "Hello", ",", "world", "!", "This", "has", "6", "tokens", "."
    expect(tokens).toBe(9);
  });
});

describe("Fixed Chunking", () => {
  it("should chunk into fixed sizes", () => {
    // Force chunks of max 10 tokens
    const chunks = chunkFixed(testPassage, "doc_1", {
      chunkSize: 10,
      queryType: "factoid",
      isSelected: true,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].metadata.strategy).toBe("fixed");
    expect(chunks[0].metadata.queryType).toBe("factoid");
    expect(chunks[0].metadata.isSelected).toBe(true);
    expect(chunks[0].tokenCount).toBeLessThanOrEqual(12); // approx spacing
  });
});

describe("Overlap Chunking", () => {
  it("should include overlapping chunks with correct reference metadata", () => {
    const chunks = chunkOverlap(testPassage, "doc_1", {
      chunkSize: 15,
      overlapSize: 5,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].metadata.strategy).toBe("overlap");
    expect(chunks[0].metadata.overlapWith).toBeDefined();
    expect(chunks[0].metadata.overlapWith?.[0]).toContain("overlap_1");
  });
});

describe("Structural Chunking", () => {
  it("should return the entire text as a single chunk if it fits within the limit", () => {
    const chunks = chunkStructural(testPassage, "doc_1", {
      maxTokens: 100,
    });
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe(testPassage);
    expect(chunks[0].metadata.strategy).toBe("structural");
  });

  it("should split text if it exceeds the limit with a 1-sentence overlap", () => {
    const chunks = chunkStructural(testPassage, "doc_1", {
      maxTokens: 10,
    });
    expect(chunks.length).toBeGreaterThan(1);
    // The second chunk should carry over the last sentence of the first chunk
    expect(chunks[1].text).toContain(splitSentences(testPassage)[0]);
  });
});

describe("Semantic Chunking", () => {
  it("should chunk semantically based on similarity breakpoints", async () => {
    // Mock embedding function that puts a distance breakpoint after the first sentence
    const mockEmbed = async (texts: string[]) => {
      return texts.map((text, idx) => {
        const vec = new Array(128).fill(0);
        if (idx === 0) {
          vec[0] = 1.0; // very different from others
        } else {
          vec[1] = 1.0;
        }
        return vec;
      });
    };

    const chunks = await chunkSemantic(testPassage, "doc_1", mockEmbed, {
      minChunkSize: 2,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].metadata.strategy).toBe("semantic");
    expect(chunks[0].metadata.breakpointScore).toBeDefined();
  });
});
