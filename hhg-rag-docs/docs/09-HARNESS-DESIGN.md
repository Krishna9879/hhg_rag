# 9. Harness Design

"Harness" = the structured orchestration layer around the model, satisfying the task's explicit requirement of "not a single raw prompt-in, text-out call."

## 9.1 Location
`lib/harness/` — pure TypeScript, no framework dependency.

```
lib/harness/
  orchestrator.ts     # main run() entrypoint, sequences all stages
  types.ts            # StageResult, HarnessContext, Trace types
  stages/
    embed.ts
    retrieve.ts
    fuse.ts
    generate.ts
  retry.ts            # generic withRetry() wrapper
  timeout.ts           # generic withTimeout() wrapper
  trace.ts            # per-stage timing + traceId propagation
```

## 9.2 Core Contract
```ts
type StageResult<T> =
  | { ok: true; data: T; latencyMs: number }
  | { ok: false; error: HarnessError; latencyMs: number; attempts: number };

interface HarnessContext {
  traceId: string;
  query: string;
  startedAt: number;
  stageTimings: Record<string, number>;
}
```
Every stage function has the signature `(ctx: HarnessContext, input) => Promise<StageResult<Output>>` — uniform, testable, composable.

## 9.3 Retries
`withRetry(fn, { attempts: 2, backoffMs: [0, 150], retryOn: [502, 503, 504, 'ETIMEDOUT'] })`
- STT call: 1 retry.
- Embedding call: 1 retry.
- Qdrant search per collection: 1 retry, but a failed collection does **not** abort the request — degrade gracefully (§9.5).
- LLM generation: 1 retry with automatic model downgrade (70B → 8B) on second attempt.

## 9.4 Timeouts (hard budgets)
| Stage | Timeout |
|---|---|
| STT | 5000ms |
| Embedding | 300ms |
| Each Qdrant collection search | 150ms |
| Fusion/rerank (CPU, no I/O) | 20ms |
| Guardrail checks | 100ms each |
| LLM generation (streaming start) | 900ms to first token |

Timeouts are enforced with `Promise.race` against an `AbortController`-driven timer (`withTimeout`), and every downstream client (Sarvam, Qdrant, Groq) is called with its native `signal` support wired to the same controller so a timeout actually cancels the in-flight network call.

## 9.5 Structured Error Recovery
- **Partial retrieval degradation:** if 1–2 of 4 Qdrant collections fail/timeout, proceed with the surviving collections; annotate the trace with `degraded: true, missingStrategies: [...]`.
- **Total retrieval failure:** return a clear "retrieval unavailable, try again" error — never silently generate from an empty context.
- **Generation failure:** downgrade model once; if that also fails, return refusal with `reason: 'generation_unavailable'` rather than hanging.
- All errors are typed (`HarnessError` union: `UpstreamTimeout | UpstreamError | ValidationError | GuardrailRefusal`), never thrown as raw exceptions past the stage boundary — the orchestrator always gets a `StageResult`, never an unhandled rejection.

## 9.6 Structured I/O
- Every stage takes/returns a typed object (Zod-validated at the two trust boundaries: STT response parsing, and LLM output parsing for citation extraction).
- No stage does string-concatenation "prompt engineering" as its only interface — the prompt builder (`stages/generate.ts`) takes a typed `{ query, chunks: ContextChunk[] }` and returns a typed `{ systemPrompt, userPrompt }`.

## 9.7 "Tool calling" framing
Even without an agentic tool-loop, the harness treats retrieval as a callable tool with a defined schema (`retrieve(query, filters) -> ContextChunk[]`), matching the spirit of the requirement: the LLM's context is assembled through an explicit, inspectable tool call rather than baked into one mega-prompt. (Optional stretch: expose retrieval as an actual function-calling tool to the LLM so it can decide to re-query with refined terms — flagged as a stretch goal in doc 20, not required for MVP.)

## 9.8 Observability
Every `HarnessContext.stageTimings` is flushed to the benchmark store (in-memory ring buffer for hackathon scope, see doc 18) keyed by `traceId`, powering `/api/benchmark`.
