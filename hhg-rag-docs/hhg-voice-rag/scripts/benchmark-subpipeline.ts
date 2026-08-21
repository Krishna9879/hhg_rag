import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { runPipeline } from "../lib/harness/orchestrator";

interface LatencySample {
  query: string;
  runType: "Cold" | "Warm (Cached)";
  embedMs: number;
  retrievalMs: number;
  retrievalSubPipelineMs: number;
  generationMs: number;
  totalMs: number;
}

async function runBenchmark() {
  const queries = [
    "भारत की राजधानी क्या है?",
    "अंतर्राष्ट्रीय योग दिवस कब मनाया जाता है?",
    "What is UPI and how does it work?",
    "ताजमहल कहाँ स्थित है और इसे किसने बनवाया?"
  ];

  console.log("=========================================================================");
  console.log("    RETRIEVAL SUB-PIPELINE LATENCY BENCHMARK (EMBED + RETRIEVAL)");
  console.log("=========================================================================\n");

  const results: LatencySample[] = [];

  // Pass 1: Cold Run
  console.log("--- PASS 1: COLD EXECUTION (Live API + Cloud DB Network Round-trips) ---");
  for (const q of queries) {
    const res = await runPipeline(q);
    const embedMs = res.latency?.embedMs ?? 0;
    const retrievalMs = res.latency?.retrievalMs ?? 0;
    const subPipelineMs = embedMs + retrievalMs;
    const genMs = res.latency?.generationMs ?? 0;
    const totalMs = res.latency?.totalMs ?? 0;

    results.push({
      query: q,
      runType: "Cold",
      embedMs,
      retrievalMs,
      retrievalSubPipelineMs: subPipelineMs,
      generationMs: genMs,
      totalMs
    });

    console.log(`Query: "${q}"`);
    console.log(`  └─ Embed: ${embedMs}ms | Retrieve: ${retrievalMs}ms | Retrieval Sub-Pipeline: ${subPipelineMs}ms (Gen: ${genMs}ms, Total: ${totalMs}ms)\n`);
  }

  // Pass 2: Warm Run (With In-Memory Cache)
  console.log("\n--- PASS 2: WARM EXECUTION (With In-Memory Cache & Optimized HNSW ef=64) ---");
  for (const q of queries) {
    const res = await runPipeline(q);
    const embedMs = res.latency?.embedMs ?? 0;
    const retrievalMs = res.latency?.retrievalMs ?? 0;
    const subPipelineMs = embedMs + retrievalMs;
    const genMs = res.latency?.generationMs ?? 0;
    const totalMs = res.latency?.totalMs ?? 0;

    results.push({
      query: q,
      runType: "Warm (Cached)",
      embedMs,
      retrievalMs,
      retrievalSubPipelineMs: subPipelineMs,
      generationMs: genMs,
      totalMs
    });

    console.log(`Query: "${q}"`);
    console.log(`  └─ Embed: ${embedMs}ms | Retrieve: ${retrievalMs}ms | Retrieval Sub-Pipeline: ${subPipelineMs}ms (Gen: ${genMs}ms, Total: ${totalMs}ms)\n`);
  }

  // Summary Table
  console.log("\n=========================================================================");
  console.log("                         BEFORE & AFTER SUMMARY                          ");
  console.log("=========================================================================");
  console.log("Target SLA: Retrieval Sub-Pipeline (Embed + Retrieve) < 200ms");
  console.log("-------------------------------------------------------------------------");
  console.log("| Query | Mode | Embed (ms) | Retrieve (ms) | Sub-Pipeline (ms) | Target Met? |");
  console.log("|:---|:---:|:---:|:---:|:---:|:---:|");
  for (const r of results) {
    const shortQ = r.query.length > 25 ? r.query.slice(0, 22) + "..." : r.query;
    const passed = r.retrievalSubPipelineMs <= 200 ? "✅ YES (<200ms)" : "⚠️ OVER 200ms";
    console.log(`| ${shortQ.padEnd(25)} | ${r.runType.padEnd(13)} | ${String(r.embedMs).padStart(10)} | ${String(r.retrievalMs).padStart(13)} | ${String(r.retrievalSubPipelineMs).padStart(17)} | ${passed} |`);
  }
  console.log("=========================================================================\n");
}

runBenchmark().catch(console.error);
