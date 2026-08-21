import fs from 'fs';
import path from 'path';
import { embed } from '../lib/embeddings';
import { createCollectionIfNotExists, upsertBatch, QdrantPointPayload } from '../lib/qdrant';
import { chunkFixed } from '../lib/chunking/fixed';
import { chunkOverlap } from '../lib/chunking/overlap';
import { chunkSemantic } from '../lib/chunking/semantic';
import { chunkStructural } from '../lib/chunking/structural';

// Load environment to ensure QDRANT_URL, QDRANT_API_KEY, SARVAM_API_KEY exist
import '../lib/env';

const DATA_PATH = path.join(process.cwd(), 'data', 'sample-passages.json');
const REPORT_PATH = path.join(process.cwd(), 'data', 'ingest-report.json');

const BATCH_SIZE = 32;

interface Passage {
  id: string;
  text: string;
  language: string;
  metadata: Record<string, any>;
}

async function ingest() {
  console.log('🚀 Starting ingestion pipeline...');
  const startTime = Date.now();
  
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Data file not found at ${DATA_PATH}. Please run the fetch script first.`);
  }

  const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
  const passages: Passage[] = JSON.parse(rawData);
  console.log(`Loaded ${passages.length} passages for ingestion.`);

  let limit = passages.length;
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  if (limitArg) {
    limit = parseInt(limitArg.split('=')[1], 10);
    console.log(`Limiting to ${limit} passages based on arguments.`);
  }

  const subset = passages.slice(0, limit);
  const report = {
    total_passages: subset.length,
    total_chunks_created: 0,
    collections_upserted: 0,
    timing_ms: 0,
    failures: [] as string[]
  };

  const strategies = [
    { name: 'fixed', fn: chunkFixed, collection: 'msmarco_fixed' },
    { name: 'overlap', fn: chunkOverlap, collection: 'msmarco_overlap' },
    { name: 'semantic', fn: chunkSemantic, collection: 'msmarco_semantic' },
    { name: 'structural', fn: chunkStructural, collection: 'msmarco_structural' }
  ] as const;

  for (const strategy of strategies) {
    console.log(`\n📦 Initializing collection: ${strategy.collection}`);
    await createCollectionIfNotExists(strategy.collection, 1024);

    console.log(`Processing strategy: ${strategy.name}`);
    const allPayloads: Array<{
      id: string;
      text: string;
      payload: QdrantPointPayload;
    }> = [];

    // 1. Chunking
    for (const passage of subset) {
      if (!passage.text || passage.text.trim().length === 0) continue;
      try {
        const chunks = await strategy.fn(passage.text);
        
        chunks.forEach((chunk, index) => {
          allPayloads.push({
            id: crypto.randomUUID(),
            text: chunk.text,
            payload: {
              docId: passage.id,
              strategy: strategy.name,
              chunkIndex: index,
              text: chunk.text,
              tokenCount: chunk.tokenCount,
              queryType: "other",
              isSelected: true,
              sourceDataset: "msmarco-xi",
              createdAt: new Date().toISOString(),
              overlapWith: (chunk as any).overlapWith,
              breakpointScore: (chunk as any).breakpointScore,
            }
          });
        });
      } catch (err: any) {
        report.failures.push(`Chunking failed for passage ${passage.id} with ${strategy.name}: ${err.message}`);
      }
    }

    report.total_chunks_created += allPayloads.length;
    console.log(`Created ${allPayloads.length} chunks for ${strategy.name}. Starting embedding & upsert...`);

    // 2. Batched Embedding and Upserting
    for (let i = 0; i < allPayloads.length; i += BATCH_SIZE) {
      const batchPayloads = allPayloads.slice(i, i + BATCH_SIZE);
      const batchTexts = batchPayloads.map(p => p.text);
      
      console.log(`[${strategy.name}] Embedding batch ${i + 1} to ${i + batchPayloads.length} of ${allPayloads.length}...`);
      try {
        const embeddings = await embed(batchTexts, 'passage');

        const points = batchPayloads.map((item, idx) => ({
          id: item.id,
          vector: embeddings[idx],
          payload: item.payload
        }));

        await upsertBatch(strategy.collection, points);
        report.collections_upserted += points.length;
      } catch (err: any) {
        console.error(`Failed to embed/upsert batch for ${strategy.name}:`, err);
        report.failures.push(`Batch upsert failed for ${strategy.name}: ${err.message}`);
      }
    }
  }

  report.timing_ms = Date.now() - startTime;
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log('\n✅ Ingestion complete!');
  console.log(`Report saved to ${REPORT_PATH}`);
  console.log(JSON.stringify(report, null, 2));
}

ingest().catch(err => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
