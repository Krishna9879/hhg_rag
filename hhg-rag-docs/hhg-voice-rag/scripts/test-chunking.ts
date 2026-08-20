import { chunkFixed } from "../lib/chunking/fixed";
import { chunkOverlap } from "../lib/chunking/overlap";
import { chunkSemantic } from "../lib/chunking/semantic";
import { chunkStructural } from "../lib/chunking/structural";

// Mock embedding function for semantic chunking test
async function mockEmbed(texts: string[]): Promise<number[][]> {
  // Return dummy vectors of size 1024
  // We make consecutive sentences have a large similarity (0) or distance (1) to test split
  return texts.map((text, idx) => {
    const vec = new Array(1024).fill(0);
    // Create a boundary at sentence index 3 (idx === 2)
    if (idx === 2) {
      vec[0] = 1.0;
    } else {
      vec[1] = 1.0;
    }
    return vec;
  });
}

const samplePassages = [
  {
    docId: "doc_001",
    text: "The capital of India is New Delhi. It is a bustling metropolis with a rich history. The city serves as the seat of all three branches of the government of India. Thousands of people visit its landmarks every day. The government functions from offices in New Delhi. Rashtrapati Bhavan, Sansad Bhavan, and the Supreme Court are all located here.",
    queryType: "factoid" as const,
    isSelected: true,
  },
  {
    docId: "doc_002",
    text: "Comparison of SQL vs NoSQL databases. SQL databases are relational databases that use structured query language to define and manipulate data. They are table-based and have a predefined schema. NoSQL databases are non-relational databases that store data in document, key-value, wide-column, or graph formats. They are dynamic-schema based and scale horizontally. SQL is preferred for transactions, while NoSQL is preferred for rapid development and unstructured data.",
    queryType: "comparison" as const,
    isSelected: false,
  },
  {
    docId: "doc_003",
    text: "Definition of Photosynthesis. Photosynthesis is the chemical process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water. Photosynthesis in plants generally involves the green pigment chlorophyll and generates oxygen as a byproduct. This process is essential for maintaining life on Earth as it is the primary source of food and oxygen.",
    queryType: "definition" as const,
    isSelected: true,
  }
];

async function runTests() {
  console.log("=========================================");
  console.log("RUNNING CHUNKING STRATEGY SANITY CHECKS");
  console.log("=========================================");

  for (const [pIdx, passage] of samplePassages.entries()) {
    console.log(`\n--- PASSAGE ${pIdx + 1} (${passage.docId}) ---`);
    console.log(`Length: ${passage.text.length} chars, words: ${passage.text.split(/\s+/).length}`);

    // 1. Fixed
    const fixedChunks = chunkFixed(passage.text, passage.docId, {
      chunkSize: 30, // smaller size to force splits on short text
      queryType: passage.queryType,
      isSelected: passage.isSelected,
    });
    console.log(`\n[Fixed Chunks (size=30 words)] Count: ${fixedChunks.length}`);
    fixedChunks.forEach((c) => {
      console.log(`  Chunk ${c.chunkIndex} (${c.tokenCount} tokens): "${c.text.substring(0, 60)}..."`);
    });

    // 2. Overlap
    const overlapChunks = chunkOverlap(passage.text, passage.docId, {
      chunkSize: 30,
      overlapSize: 10,
      queryType: passage.queryType,
      isSelected: passage.isSelected,
    });
    console.log(`\n[Overlap Chunks (size=30, overlap=10)] Count: ${overlapChunks.length}`);
    overlapChunks.forEach((c) => {
      console.log(`  Chunk ${c.chunkIndex} (${c.tokenCount} tokens): "${c.text.substring(0, 60)}..."`);
      console.log(`    overlapWith:`, c.metadata.overlapWith);
    });

    // 3. Structural
    const structuralChunks = chunkStructural(passage.text, passage.docId, {
      maxTokens: 40, // smaller limit to force split
      queryType: passage.queryType,
      isSelected: passage.isSelected,
    });
    console.log(`\n[Structural Chunks (max=40)] Count: ${structuralChunks.length}`);
    structuralChunks.forEach((c) => {
      console.log(`  Chunk ${c.chunkIndex} (${c.tokenCount} tokens): "${c.text.substring(0, 60)}..."`);
    });

    // 4. Semantic
    const semanticChunks = await chunkSemantic(
      passage.text,
      passage.docId,
      mockEmbed,
      {
        queryType: passage.queryType,
        isSelected: passage.isSelected,
        minChunkSize: 5,
      }
    );
    console.log(`\n[Semantic Chunks] Count: ${semanticChunks.length}`);
    semanticChunks.forEach((c) => {
      console.log(`  Chunk ${c.chunkIndex} (${c.tokenCount} tokens, breakpointScore=${c.metadata.breakpointScore}): "${c.text.substring(0, 60)}..."`);
    });
  }
}

runTests().catch(console.error);
