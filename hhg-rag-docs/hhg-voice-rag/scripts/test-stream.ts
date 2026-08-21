/**
 * Test streaming pipeline.
 * Usage: npx tsx scripts/test-stream.ts
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { runPipelineStream } from "../lib/harness/orchestrator";

async function main() {
  const query = "भारत की राजधानी क्या है?";
  console.log(`\n=== Testing STREAMING pipeline with: "${query}" ===\n`);
  
  const startMs = Date.now();
  
  for await (const event of runPipelineStream(query)) {
    const elapsed = Date.now() - startMs;
    if (event.type === "token") {
      process.stdout.write(event.data.text);
    } else if (event.type === "guardrail") {
      console.log(`[${elapsed}ms] GUARDRAIL:`, JSON.stringify(event.data));
    } else if (event.type === "retrieval") {
      const rd = event.data as any;
      console.log(`[${elapsed}ms] RETRIEVAL: ${rd.chunks.length} chunks, latency=${rd.retrievalLatencyMs}ms`);
      for (const c of rd.chunks) {
        console.log(`  score=${c.score} strategy=${c.strategy} text="${(c.text || "").substring(0, 60)}..."`);
      }
    } else if (event.type === "done") {
      console.log(`\n[${elapsed}ms] DONE:`, JSON.stringify(event.data, null, 2));
    } else if (event.type === "error") {
      console.log(`[${elapsed}ms] ERROR:`, JSON.stringify(event.data));
    }
  }
}

main().catch(console.error);
