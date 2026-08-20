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
3. Persist raw results to `reports/latest.csv` with columns: `traceId, query, sttMs, embedMs, retrievalMs, generationMs, totalMs, guardrailResult`.
4. Compute percentiles server-side (simple sort + index, no need for a stats library at this sample size) and expose via `GET /api/benchmark`.

## 18.3 What gets reported where
| Metric | Where it's shown |
|---|---|
| Retrieval-only P50/P70/P100 | `/benchmark` page, submission doc — this is the number mapped to the task's literal 200ms requirement |
| Full end-to-end P50/P70/P100 | `/benchmark` page, submission doc — reported transparently alongside, with the reasoning from doc 11 |
| Per-chunking-strategy retrieval time & result overlap | `reports/latest.csv` extended columns / a short section in the submission README — evidence the multi-strategy approach is real, not just described |
| Refusal rate + refusal latency | `/api/benchmark?stage=refusal` — evidence guardrails fire |

## 18.4 Re-run discipline
- Re-run the full benchmark after any change to chunking, embedding model, or retrieval fusion logic — stale numbers in the submission are worse than no numbers.
- Final benchmark run happens **after** production ingestion is complete and the app is deployed to its final live URL — not against localhost — since network latency to the real deployed services is part of the honest number.
- Lock and commit `reports/latest.csv` only after this final run, right before submitting the form.
