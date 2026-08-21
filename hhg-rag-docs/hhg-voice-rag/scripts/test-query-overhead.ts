import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { runPipeline } from "../lib/harness/orchestrator";

async function testQueryLatency() {
  const query = "National Bird of India";

  console.log("=========================================================================");
  console.log(`    TESTING LATENCY OVERHEAD FOR QUERY: "${query}"`);
  console.log("=========================================================================\n");

  console.log("--- 1. FIRST EXECUTION (STEADY-STATE TLS CONNECTION REUSE) ---");
  const t0 = Date.now();
  const res1 = await runPipeline(query);
  const total1 = Date.now() - t0;
  console.log(`Result 1: Answer="${res1.answer}"`);
  console.log(`  Embed: ${res1.latency?.embedMs}ms | Retrieve: ${res1.latency?.retrievalMs}ms | Sub-Pipeline: ${(res1.latency?.embedMs ?? 0) + (res1.latency?.retrievalMs ?? 0)}ms | Total: ${total1}ms\n`);

  console.log("--- 2. SECOND EXECUTION (IN-MEMORY CACHE HIT) ---");
  const t1 = Date.now();
  const res2 = await runPipeline(query);
  const total2 = Date.now() - t1;
  console.log(`Result 2: Answer="${res2.answer}"`);
  console.log(`  Embed: ${res2.latency?.embedMs}ms | Retrieve: ${res2.latency?.retrievalMs}ms | Sub-Pipeline: ${(res2.latency?.embedMs ?? 0) + (res2.latency?.retrievalMs ?? 0)}ms | Total: ${total2}ms\n`);

  console.log("--- 3. THIRD EXECUTION WITH HINDI QUERY ---");
  const hindiQuery = "भारत का राष्ट्रीय पक्षी क्या है?";
  const t2 = Date.now();
  const res3 = await runPipeline(hindiQuery);
  const total3 = Date.now() - t2;
  console.log(`Result 3: Answer="${res3.answer}"`);
  console.log(`  Embed: ${res3.latency?.embedMs}ms | Retrieve: ${res3.latency?.retrievalMs}ms | Sub-Pipeline: ${(res3.latency?.embedMs ?? 0) + (res3.latency?.retrievalMs ?? 0)}ms | Total: ${total3}ms\n`);
}

testQueryLatency().catch(console.error);
