# 19. Testing Strategy

Given the timeline, testing is scoped to what actually protects the demo and the judged requirements — not full coverage.

## 19.1 Unit Tests (fast, run in CI/pre-commit)
- `lib/chunking/*` — each strategy against fixed sample text, assert expected chunk count/boundaries/overlap behavior.
- `lib/guardrails/*` — table-driven tests: known off-topic query → refused; known in-domain query with strong context → pass; low-similarity chunks → groundedness fails.
- `lib/harness/retry.ts`, `timeout.ts` — mock a flaky/slow function, assert retry count and timeout behavior.

## 19.2 Integration Tests
- `/api/transcribe` against a fixture audio file (checked into `test/fixtures/`) — asserts a non-empty transcript comes back (don't assert exact text, STT isn't deterministic).
- `/api/query` end-to-end against a live (or recorded/mocked) Qdrant + Groq for a known query — asserts response contains sources + citations + latency breakdown.
- Refusal path integration test — off-topic query → asserts `guardrail: refused` event, no generation call made (mock Groq client, assert not called — proves the fast-fail path).

## 19.3 Manual / Exploratory Testing (before each deploy)
- Real mic test on: Chrome desktop, Safari desktop, Chrome Android, Safari iOS.
- Ask 5–10 varied real questions live, visually confirm sources + latency chips look right.
- Ask 2–3 deliberately off-topic/unsafe questions, confirm graceful refusal UI.
- Kill network mid-request (dev tools throttling) — confirm the UI shows a clear error, not an infinite spinner.

## 19.4 Load / Resilience Check (before judging window)
- Fire the `/api/benchmark/run` replay (§18.2) as a light load test — confirms the app survives ~50 sequential/parallel real requests without crashing, which roughly approximates judge traffic.
- Rate limiting (`RATE_LIMIT_PER_MIN`) sanity check — confirm it kicks in without breaking the UX for normal use.

## 19.5 Regression Guard
- Any change to chunking strategies or the groundedness threshold **must** be followed by a fresh benchmark run (doc 18) before merging — silent retrieval-quality regressions are the highest-risk failure mode this close to a demo.

## 19.6 Out of Scope (explicitly, given timeline)
Full E2E browser automation (Playwright suite), load testing at scale (>100 concurrent), accessibility audit beyond basic keyboard/contrast checks. Note these as "future work" in the README rather than silently skipping them.
