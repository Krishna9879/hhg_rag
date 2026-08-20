# 20. Sprint-wise Task Breakdown

Given the real deadline is **Aug 22, 2026, 11:59 PM IST** and today is **Aug 20**, this is a ~2.5-day sprint, not a multi-week plan. Broken into 4 half-day sprints. Assumes a small team (2–4 people) working in parallel tracks.

## Sprint 1 — Aug 20, Morning/Afternoon: Foundations (parallel tracks)
**Track A (Backend/Infra):**
- Scaffold Next.js app, env setup, `/api/health`.
- Typed clients: Sarvam, Groq, Qdrant, embeddings.
- Local Qdrant via Docker running.

**Track B (Data/RAG):**
- Pull MSMARCO-XI sample, inspect schema.
- Implement `chunkFixed` + `chunkOverlap` (simplest 2 first).

**Track C (Frontend):**
- Scaffold pages/routing, design tokens (doc 12), `MicButton` component with real mic capture + waveform, no backend wiring yet.

**End-of-sprint checkpoint:** mic records + plays back locally; typed clients compile; fixed+overlap chunking produces sane output on sample text.

## Sprint 2 — Aug 20 Evening → Aug 21 Morning: Core Pipeline
**Track A:** Build `lib/harness/` (retry/timeout/orchestrator skeleton). Wire `/api/transcribe` end-to-end (real Sarvam call).

**Track B:** Implement `chunkSemantic` + `chunkStructural`. Run `scripts/ingest.ts --limit=100` against local Qdrant, validate retrieval manually (a quick script that embeds a test query and prints top-k).

**Track C:** Wire `MicButton` → `/api/transcribe`, build `TranscriptEditor`.

**End-of-sprint checkpoint:** end-to-end voice → transcript works in the browser against local backend; all 4 chunking strategies produce indexed, queryable data.

## Sprint 3 — Aug 21 Afternoon/Evening: Full RAG + Guardrails
**Track A:** Wire retrieval + fusion stages into the harness. Wire generation (Groq) with streaming. `/api/query` fully functional (SSE).

**Track B:** Implement `lib/guardrails/*`, plug into orchestrator. Full-scale ingestion run against Qdrant Cloud (prod target).

**Track C:** Wire `AnswerStream`, `SourceCard`, `LatencyChips`, `RefusalBanner` to the live `/api/query` stream. Build `/benchmark`, `/about` pages.

**End-of-sprint checkpoint:** full voice-to-answer flow works locally against prod Qdrant; refusal path demonstrably works; UI shows sources + latency.

## Sprint 4 — Aug 22 Morning/Afternoon: Deploy, Benchmark, Record, Submit
- Deploy to Vercel, wire all prod env vars (doc 17).
- Build `data/eval-queries.json` (≥50), run `/api/benchmark/run` against the **live deployed URL**, commit `reports/latest.csv`.
- Final manual test pass (doc 19.3) on desktop + mobile against the live link.
- Record **Video 1** (90s team/process video) and **Video 2** (demo video).
- Post both videos to Instagram + X, every team member, `#RAGInGoa` on every post.
- Fill and submit the form: `https://forms.gle/MNvCjcv23Hn2Eeu58`.
- **Hard stop before 11:59 PM IST Aug 22** — no resubmissions allowed, so lock the build with buffer time (target being fully done by ~9:00 PM IST to leave margin for upload/posting/form issues).

## 20.1 Stretch Goals (only if ahead of schedule)
- Expose retrieval as an actual LLM tool-call (agentic re-query on low confidence) — doc 09 §9.7.
- Per-strategy retrieval-quality comparison chart on `/benchmark` (using MSMARCO's `isSelected` ground truth as a mini eval set).
- ElevenLabs fallback STT actually wired and tested, not just designed.
