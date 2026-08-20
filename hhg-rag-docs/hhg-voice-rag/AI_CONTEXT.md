# AI_CONTEXT.md — Voice-Enabled RAG Model (HH Goa 2026, Task 2)

## What this project is
A Next.js 15 (App Router, TypeScript) app: user speaks a question, we transcribe (Sarvam AI),
retrieve grounded context from Qdrant (4 parallel chunking-strategy collections built from
ai4bharat/MSMARCO-XI), generate an answer via Groq (Llama 3.3), and stream it back — all
inside a typed harness with retries/timeouts/guardrails. See /docs for full spec.

## Non-negotiable constraints
- Retrieval sub-pipeline (embed→search→fuse) must be instrumented and target <200ms P70.
- Must implement 4 distinct chunking strategies (fixed, overlap, semantic, structural) — never
  reduce to one "good enough" strategy, even under time pressure.
- Every LLM/STT/DB call goes through lib/harness/ — never call an SDK directly from an API route.
- Every response must be traceable: propagate traceId, log stageTimings.
- No answer without a groundedness check first. Refusal is a valid, expected outcome.

## Conventions
- TypeScript strict mode. No `any` without a `// TODO(reason)` comment.
- All external I/O wrapped in withRetry + withTimeout (lib/harness/retry.ts, timeout.ts).
- Zod schemas at every external trust boundary (STT response, LLM output parsing, API request bodies).
- Server-only secrets (SARVAM_API_KEY, GROQ_API_KEY, QDRANT_API_KEY) never imported into client components.
- Prefer explicit, typed stage functions over LangChain/LlamaIndex abstractions.
- Commit ingestion outputs' summary (ingest-report.json) but not the raw dataset dump.

## Where things live
- /app — routes + API routes
- /lib/harness — orchestration
- /lib/guardrails — pre/post checks
- /lib/chunking — the 4 strategies
- /lib/qdrant, /lib/sarvam, /lib/groq, /lib/embeddings — thin typed clients
- /scripts/ingest.ts — offline ingestion CLI
- /docs — this documentation set (source of truth for design decisions)

## Definition of done for any task
- [ ] Typed (no unexplained `any`), passes `tsc --noEmit`.
- [ ] Has at least one unit test if it's a pure function (chunking, guardrail logic).
- [ ] Errors are handled per the `StageResult` contract, not left to throw.
- [ ] If it's on the request hot path, it's timed and the timing is added to `stageTimings`.
- [ ] Manually tested via the actual UI (not just curl), including a refusal-path test.
- [ ] Docs updated if behavior diverges from what's written in `/docs`.
