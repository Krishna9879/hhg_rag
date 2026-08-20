# 13. AI-Specific Docs

This section is written to be handed directly to an agentic coding tool (e.g. **Antigravity**, Cursor, Claude Code) as its task brief. Copy `13a` into the tool's context/system file (often literally named `AI_CONTEXT.md` at repo root).

---

## 13a. `AI_CONTEXT.md` (paste at repo root)

```markdown
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
See §13e below — do not mark a task complete without checking it.
```

## 13b. Implementation Plan (step-by-step build order)
1. Scaffold Next.js 15 + TS project, env var loading, `/api/health`.
2. Build typed clients: `lib/sarvam.ts`, `lib/embeddings.ts`, `lib/qdrant.ts`, `lib/groq.ts` (no orchestration yet — just clean SDK wrappers with types).
3. Build `lib/chunking/` — all 4 strategies as pure functions with unit tests on sample text.
4. Build `scripts/ingest.ts` — wire chunking → embeddings → Qdrant upsert, run on a small sample first (100 passages) to validate end-to-end before full ingestion.
5. Build `lib/harness/` — retry/timeout wrappers, stage contract, orchestrator skeleton (stub stages first).
6. Wire real stages into the orchestrator one at a time: embed → retrieve → fuse → generate.
7. Build `lib/guardrails/` — pre-check, groundedness, post-check — plug into orchestrator.
8. Build `/api/transcribe`, `/api/query` (SSE), `/api/benchmark`.
9. Build frontend: `MicButton` → `TranscriptEditor` → `AnswerStream` → `SourceCard`/`LatencyChips`.
10. Instrument tracing end-to-end, verify `/api/benchmark` produces real numbers.
11. Run full ingestion at target scale; re-benchmark.
12. Polish UI, add `/benchmark` and `/about` pages.
13. Deploy (doc 17), record demo + process videos, post with `#RAGInGoa`, submit form.

## 13c. Module Specifications
| Module | Exports | Depends on |
|---|---|---|
| `lib/chunking/fixed.ts` | `chunkFixed(text, opts): Chunk[]` | none |
| `lib/chunking/overlap.ts` | `chunkOverlap(text, opts): Chunk[]` | none |
| `lib/chunking/semantic.ts` | `chunkSemantic(text, embedFn, opts): Promise<Chunk[]>` | embeddings client |
| `lib/chunking/structural.ts` | `chunkStructural(passage, meta): Chunk[]` | MSMARCO passage schema |
| `lib/harness/orchestrator.ts` | `runPipeline(query, ctx): Promise<PipelineResult>` | all stage modules |
| `lib/guardrails/preCheck.ts` | `preCheck(query): GuardrailResult` | embeddings, keyword list |
| `lib/guardrails/groundedness.ts` | `checkGroundedness(chunks): GuardrailResult` | none (pure) |
| `lib/guardrails/postCheck.ts` | `postCheck(answer, chunks): GuardrailResult` | none (pure) |

## 13d. Coding Guidelines
- One stage = one file = one exported function with the `StageResult<T>` contract (doc 09).
- No stage function throws — always returns a typed result.
- Every API route: validate input with Zod → call harness → map result to HTTP/SSE, nothing else.
- Prefer composition over inheritance; no class hierarchies for stages.
- Keep prompt templates in `lib/prompts/*.ts` as typed template functions, not inline strings in route handlers.
- Write the latency-critical path (retrieval sub-pipeline) with zero unnecessary `await` chaining — use `Promise.all` for the 4 collection searches, always.

## 13e. Definition of Done (per task/feature)
A task is done only when:
- [ ] Typed (no unexplained `any`), passes `tsc --noEmit`.
- [ ] Has at least one unit test if it's a pure function (chunking, guardrail logic).
- [ ] Errors are handled per the `StageResult` contract, not left to throw.
- [ ] If it's on the request hot path, it's timed and the timing is added to `stageTimings`.
- [ ] Manually tested via the actual UI (not just curl), including a refusal-path test.
- [ ] Docs updated if behavior diverges from what's written in `/docs`.
