# Recommended Day-by-Day Plan

**Real deadline per task PDF: Aug 22, 2026, 11:59 PM IST.** (Your prompt said "21 Aug" — plan below targets the actual, later PDF deadline, with a same-day-22 buffer built in. If your team wants extra safety margin, just shift everything 12–24h earlier.)

## Day 1 — Aug 20 (today)
**Morning:** Team split into 3 tracks (Backend/Infra, Data/RAG, Frontend) — see Sprint 1, doc 20. Scaffold app, typed clients, mic capture, pull dataset sample, first 2 chunking strategies.
**Evening:** Sprint 2 — harness skeleton, `/api/transcribe` live, remaining 2 chunking strategies, sample ingestion + manual retrieval sanity check.
**Checkpoint before sleep:** voice→transcript works locally; all 4 strategies indexed on a small sample.

## Day 2 — Aug 21
**Morning/Afternoon:** Sprint 3 — full RAG pipeline wired (retrieval + fusion + generation, streaming), guardrails implemented and plugged in, full-scale ingestion against Qdrant Cloud.
**Evening:** UI fully wired to the live pipeline (`AnswerStream`, `SourceCard`, `LatencyChips`, `RefusalBanner`), `/benchmark` and `/about` pages built.
**Checkpoint before sleep:** complete voice-to-answer flow works end-to-end locally against prod Qdrant; refusal path verified.

## Day 3 — Aug 22 (deadline day)
**Morning:** Deploy to Vercel with all prod env vars. Smoke test the live URL.
**Midday:** Build the ≥50-query eval set, run `/api/benchmark/run` against the **live** deployed URL, commit the real P50/P70/P100 CSV.
**Afternoon:** Final manual QA pass (desktop + mobile, multiple browsers), record both required videos (90s process video + demo video).
**Early evening:** Post both videos to Instagram + X — every team member individually, `#RAGInGoa` on every single post, confirm ≥1 public Instagram account.
**By ~9:00 PM IST:** Fill and submit the form (`https://forms.gle/MNvCjcv23Hn2Eeu58`). Do not touch the build after this — **no resubmissions allowed**.
**Buffer (9:00 PM–11:59 PM):** held in reserve for upload failures, form issues, or last-minute bugs found during recording — not for new features.

## Non-negotiable order of priorities if time runs out
1. Working voice → grounded answer, even with only 2 chunking strategies live, beats 4 strategies with a broken pipeline.
2. Guardrails + harness (separately graded requirements) over UI polish.
3. Real, committed latency numbers over a nicer-looking but unmeasured demo.
4. Deployed + submitted on time over any additional feature.
