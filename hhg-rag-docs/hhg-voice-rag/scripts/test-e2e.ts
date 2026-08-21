/**
 * End-to-end pipeline test.
 * Usage: npx tsx scripts/test-e2e.ts
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { runPipeline } from "../lib/harness/orchestrator";

async function main() {
  const query = "भारत की राजधानी क्या है?";
  console.log(`\n=== Testing pipeline with: "${query}" ===\n`);
  
  const startMs = Date.now();
  const result = await runPipeline(query);
  const totalMs = Date.now() - startMs;
  
  console.log("Pipeline result:", JSON.stringify(result, null, 2));
  console.log(`\nTotal wall-clock time: ${totalMs}ms`);
}

main().catch(console.error);
