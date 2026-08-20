# 14. Complete Step-by-Step Implementation Guide

## 14.1 Scaffold
```bash
npx create-next-app@latest hhg-voice-rag --typescript --app --tailwind --eslint
cd hhg-voice-rag
npm i zod qdrant-client groq-sdk @huggingface/hub p-retry
```
> If `qdrant-client` naming differs, use the official `@qdrant/js-client-rest` or `@qdrant/js-client-grpc`.

## 14.2 Environment
Copy `.env.example` (doc 16) → `.env.local`. Never commit real keys.

## 14.3 Typed external clients
Create `lib/sarvam.ts`, `lib/groq.ts`, `lib/qdrant.ts`, `lib/embeddings.ts` — each exports a single typed async function (`transcribe()`, `generate()`, `search()`, `embed()`), wraps fetch/SDK calls, throws only `HarnessError`-typed errors (never raw SDK errors leak upward).

## 14.4 Chunking module
Implement `lib/chunking/{fixed,overlap,semantic,structural}.ts` per doc 05. Write a tiny test harness (`scripts/test-chunking.ts`) that runs all 4 against 3 sample MSMARCO passages and prints chunk counts/boundaries for manual sanity-check before wiring to ingestion.

## 14.5 Ingestion
`scripts/ingest.ts`:
1. Pull a stratified sample of MSMARCO-XI passages via `@huggingface/hub` or the HF datasets REST API.
2. For each passage, run all 4 chunking strategies.
3. Batch-embed all chunks (batch size ~64, respect embedding endpoint rate limits).
4. Upsert into the 4 Qdrant collections with the payload schema from doc 06.
5. Write `ingest-report.json` (counts, timing, any failures).

Run first at `--limit=100` to validate, then at full target scale.

## 14.6 Harness
Implement `lib/harness/{retry,timeout,trace}.ts` first (these are pure utilities, easiest to unit test), then `stages/{embed,retrieve,fuse,generate}.ts`, then `orchestrator.ts` wiring them with the timeout budgets from doc 09.

## 14.7 Guardrails
Implement `lib/guardrails/{preCheck,groundedness,postCheck}.ts` per doc 10. Wire into the orchestrator between the relevant stages. Write a small fixture set of known off-topic/unsafe/in-domain queries to manually verify each guardrail actually fires.

## 14.8 API routes
- `/api/transcribe`: multipart parse → `sarvam.transcribe()` → typed JSON response.
- `/api/query`: parse body with Zod → `orchestrator.runPipeline()` → convert to SSE stream (use `ReadableStream` + `TextEncoder`, `Content-Type: text/event-stream`).
- `/api/benchmark`, `/api/benchmark/run`, `/api/health` per doc 07.

## 14.9 Frontend
Build bottom-up: `MicButton` (test recording+playback alone) → wire to `/api/transcribe` → `TranscriptEditor` → wire submit to `/api/query` with an `EventSource`/manual `fetch` + stream reader → `AnswerStream` renders incoming tokens → `SourceCard`/`LatencyChips`/`RefusalBanner` for the remaining event types.

## 14.10 Benchmarking
Build `data/eval-queries.json` (≥50 real, varied queries drawn from/adjacent to MSMARCO-XI's own query set). Implement `/api/benchmark/run` to replay them sequentially against `/api/query` internally, log every `stageTimings`, compute P50/P70/P100 (doc 18), write `reports/latest.csv`.

## 14.11 Polish & Record
- `/about` page embedding the architecture Mermaid diagram (render via `react-markdown` + `mermaid` or a static export).
- Record the two required videos (see doc 20 for exact shot list).
- Post to Instagram + X with `#RAGInGoa`, every team member individually.
- Final smoke test on the deployed URL, then submit the form — no resubmissions allowed.
