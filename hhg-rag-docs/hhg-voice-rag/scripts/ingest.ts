import fs from 'fs';
import path from 'path';
import { embed } from '../lib/embeddings';
import { qdrantClient } from '../lib/qdrant';
import { chunkFixed } from '../lib/chunking/fixed';
import { chunkOverlap } from '../lib/chunking/overlap';
import { chunkSemantic } from '../lib/chunking/semantic';
import { chunkStructural } from '../lib/chunking/structural';
import { Chunk } from '../lib/chunking/types';

// Load environment to ensure QDRANT_URL, QDRANT_API_KEY, SARVAM_API_KEY exist
import '../lib/env';

const DATA_PATH = path.join(process.cwd(), 'data', 'sample-passages.json');
const REPORT_PATH = path.join(process.cwd(), 'data', 'ingest-report.json');

const BATCH_SIZE = 64; // Respect embedding rate limits

// Schema from docs 06
interface Payload {
  source_id: string; // Original MSMARCO-XI passage ID
  chunk_id: string; // Unique ID for this chunk
  text: string; // The chunked text
  chunk_index: number;
  total_chunks: number;
  chunking_strategy: 'fixed' | 'overlap' | 'semantic' | 'structural';
  metadata: Record<string, any>; // Includes original passage metadata
}

interface Passage {
  id: string;
  text: string;
  language: string;
  metadata: Record<string, any>;
}

async function ingest() {
  console.log('Starting ingestion pipeline...');
  const startTime = Date.now();
  
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Data file not found at ${DATA_PATH}. Please run the fetch script first.`);
  }

  const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
  const passages: Passage[] = JSON.parse(rawData);
  console.log(`Loaded ${passages.length} passages for ingestion.`);

  // If a limit is provided via arguments (e.g. --limit=100)
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
    console.log(`\nProcessing strategy: ${strategy.name}`);
    const allPayloads: Payload[] = [];

    // 1. Chunking
    for (const passage of subset) {
      if (!passage.text || passage.text.trim().length === 0) continue;
      try {
        const chunks = await strategy.fn(passage.text);
        
        chunks.forEach((chunk, index) => {
          allPayloads.push({
            source_id: passage.id,
            chunk_id: `${passage.id}_${strategy.name}_${index}`,
            text: chunk.text,
            chunk_index: index,
            total_chunks: chunks.length,
            chunking_strategy: strategy.name as any,
            metadata: passage.metadata || {}
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
      
      console.log(`[${strategy.name}] Embedding batch ${i} to ${i + batchPayloads.length}...`);
      try {
        const embeddings = await embed(batchTexts);

        const points = batchPayloads.map((payload, idx) => ({
          id: idx + i + 1, // Qdrant requires unique IDs, we use unsigned int for simplicity or UUID. We'll use a hash or simple index.
          // Wait, Qdrant ID should ideally be a UUID. Let's create a deterministic UUID or just use random UUID.
          // For simplicity in this script, we'll use a random UUID.
          id: crypto.randomUUID(), 
          vector: embeddings[idx],
          payload: payload
        }));

        const isQueryFn = typeof (qdrantClient as any).query === 'function';
        // Check Qdrant collections logic
        // We assume the collections exist (they should be created by setup or we create them on the fly)
        // Wait, the API spec says collections exist, but let's just upsert
        if (typeof qdrantClient.upsert === 'function') {
           await qdrantClient.upsert(strategy.collection, {
              wait: true,
              points: points
           });
        } else {
            // Fallback for older SDK
            // Any specific logic for older sdk goes here
             await (qdrantClient as any).upsert(strategy.collection, {
              wait: true,
              points: points
           });
        }

        report.collections_upserted += points.length;
      } catch (err: any) {
        console.error(`Failed to embed/upsert batch for ${strategy.name}:`, err);
        report.failures.push(`Batch upsert failed for ${strategy.name}: ${err.message}`);
      }
    }
  }

  report.timing_ms = Date.now() - startTime;
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log('\nIngestion complete!');
  console.log(`Report saved to ${REPORT_PATH}`);
  console.log(JSON.stringify(report, null, 2));
}

ingest().catch(err => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
