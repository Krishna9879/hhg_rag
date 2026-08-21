import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { runPipeline } from "../lib/harness/orchestrator";

async function verifyQueries() {
  const queries = [
    "भारत की राजधानी क्या है?",
    "अंतर्राष्ट्रीय योग दिवस कब मनाया जाता है?",
    "इसरो ने चंद्रयान-3 कब लॉन्च किया?",
    "What is UPI and how does it work?",
    "ताजमहल कहाँ स्थित है और इसे किसने बनवाया?"
  ];

  console.log("=== RUNNING MULTI-QUERY VERIFICATION ===\n");

  for (const q of queries) {
    console.log(`Query: "${q}"`);
    const t0 = Date.now();
    const res = await runPipeline(q);
    const ms = Date.now() - t0;
    console.log(`Status: ${res.ok ? "SUCCESS" : "FAILED"}`);
    console.log(`Answer: ${res.answer}`);
    console.log(`Latency: Total=${ms}ms (Embed=${res.latency?.embedMs}ms, Retrieve=${res.latency?.retrievalMs}ms, Gen=${res.latency?.generationMs}ms)`);
    console.log(`Chunks used: ${res.chunks?.length ?? 0}`);
    console.log("--------------------------------------------------\n");
  }
}

verifyQueries().catch(console.error);
