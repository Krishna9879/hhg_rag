# 18. Latency Benchmarking Plan

## 18.1 What "P50/P70/P100" means here
- **P50**: median latency — half of real queries were faster than this.
- **P70**: 70th percentile — a stricter "typical worst case" bar.
- **P100**: the maximum observed — the single slowest query in the sample (honest worst case, not an outlier-trimmed number).

## 18.2 Methodology
1. Build `data/eval-queries.json` — **≥50 real, varied queries**, not the same question repeated. Draw from:
   - A sample of MSMARCO-XI's own query set (ensures in-domain, answerable queries).
   - A handful of deliberately off-topic/unsafe queries (to also report refusal-path latency separately — refusals should be *fast*, since they can often skip generation).
2. Implement `/api/benchmark/run`: replays every query in the set through the real `/api/query` pipeline (not a mocked shortcut), sequentially or with light concurrency (2–3 parallel, to avoid self-induced rate limiting), recording full `stageTimings` per request.
3. Persist raw results to `reports/latest.csv` with columns: `traceId, query, sttMs, embedMs, retrievalMs, retrievalSubPipelineMs, generationMs, totalMs, guardrailResult`.
4. Compute percentiles server-side (simple sort + index, no need for a stats library at this sample size) and expose via `GET /api/benchmark`.

## 18.3 Isolated Stage Reporting & Evaluation Rubric
The retrieval sub-pipeline (**Embed + Vector Retrieval**) is isolated and reported distinctly from STT and LLM generation:

| Stage Sub-Pipeline | Target SLA (P70) | What gets measured | Where it is shown |
|---|---|---|---|
| **Embedding-Only** | <20ms (cache) / <300ms (cold) | Query text vectorization (Jina / E5) + in-memory LRU cache | `/api/benchmark?stage=embed` & CSV |
| **Vector Retrieval-Only** | <10ms (cache) / <150ms (cold) | Parallel 4-collection Qdrant HNSW search + RRF fusion | `/api/benchmark?stage=retrieval` & CSV |
| **Combined Retrieval Sub-Pipeline** | **< 200ms** | Total pre-generation retrieval latency (Embed + Retrieve) | `/benchmark` page, Primary Rubric Metric |
| **LLM Generation** | < 1500ms (TTFT) | Groq LPU streaming generation (Qwen 27B / Llama 70B) | `/api/benchmark?stage=generation` & UI |
| **STT (Voice Input)** | < 600ms | Sarvam AI Saarika Indic ASR | `/api/benchmark?stage=stt` & UI |
| **Full End-to-End** | < 2500ms | Complete voice-to-streamed-citation lifecycle | `/benchmark` telemetry summary |

## 18.4 Re-run discipline
- Re-run the full benchmark after any change to chunking, embedding model, or retrieval fusion logic — stale numbers in the submission are worse than no numbers.
- Final benchmark run happens **after** production ingestion is complete and the app is deployed to its final live URL — not against localhost — since network latency to the real deployed services is part of the honest number.
- Lock and commit `reports/latest.csv` only after this final run, right before submitting the form.

