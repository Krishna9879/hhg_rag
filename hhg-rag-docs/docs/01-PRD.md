# 1. Product Requirements Document (PRD)

## 1.1 Problem
Users want to ask a question **by voice** and get an answer that is **grounded in a real dataset** (MSMARCO-XI), not hallucinated — delivered fast enough to feel like a conversation, not a search engine.

## 1.2 Goals
- G1: Voice-in → grounded, cited answer, end-to-end.
- G2: Retrieval quality via *engineered* chunking, not one naive splitter.
- G3: Demonstrable low latency with honest P50/P70/P100 numbers.
- G4: Production-shaped code: harness, retries, structured I/O, guardrails.
- G5: Judges can try it live in under 30 seconds (no signup friction).

## 1.3 Non-Goals
- Multi-turn conversational memory (nice-to-have, not judged).
- User accounts / auth (optional, skip unless time permits).
- Multi-language UI localization (voice input can be multilingual via Sarvam; UI stays English).
- Mobile app — responsive web only.

## 1.4 Target User (for the demo)
A judge or visitor on `hhgoa.com`'s live link, on a laptop or phone, who:
1. Opens the site.
2. Taps a mic button.
3. Asks a question in English or Hindi/Indian language.
4. Sees: transcript → retrieved chunks (with sources) → generated answer → latency badge.

## 1.5 Core User Stories
1. *As a user*, I press-and-hold (or tap-to-toggle) a mic button and speak a question.
2. *As a user*, I see my transcribed text confirmed before the answer generates (trust signal).
3. *As a user*, I see the answer stream in, with the source passages it was grounded on.
4. *As a user*, if I ask something off-topic or unsafe, I get a polite refusal, not a fabricated answer.
5. *As a judge*, I can see a small "latency" chip (e.g. `STT 180ms · Retrieval 90ms · Gen 640ms`) proving the pipeline is instrumented.
6. *As a team*, we can hit `/api/benchmark` to get a P50/P70/P100 report to paste into our submission.

## 1.6 Success Metrics (what's actually judged)
| Requirement (from task PDF) | Product behavior that satisfies it |
|---|---|
| Voice-to-text input, not typed | Mic-first UI; typed fallback allowed but not the primary path |
| Multiple chunking strategies | 4 strategies live in the indexer, selectable/combined at query time |
| Pipeline under 200ms | Retrieval+chunking path benchmarked separately from LLM generation (see doc 11 for the honest breakdown) |
| P50/P70/P100 latency, real queries | `/api/benchmark` endpoint + committed CSV of ≥50 real queries |
| Real harness | `lib/harness/` orchestrator with retries, timeouts, structured I/O |
| Guardrails | Off-topic classifier, groundedness check, refusal path |
| `#RAGInGoa` promo | Checklist item in submission doc, not a product feature |

## 1.7 Constraints
- Deadline: **Aug 22, 2026, 11:59 PM IST** (per task PDF).
- Small team, must be realistically buildable in the remaining time.
- Must deploy to a public live URL + public GitHub repo.
- No resubmissions — final build must be locked before submitting the form.

## 1.8 Risks
- **<200ms end-to-end including LLM generation is not physically realistic** with current hosted LLM APIs (network + decode time alone usually exceeds this). Mitigation: instrument and report the *retrieval pipeline* (STT excluded, generation excluded) under 200ms, and report full end-to-end P50/P70/P100 transparently as a separate, larger number. Document this reasoning explicitly in the submission (judges respect honesty + instrumentation over a suspiciously fast unverifiable claim). See doc 11.
- Sarvam/ElevenLabs API rate limits during demo — mitigate with local audio caching for the demo video.
- Vector DB cold start latency on serverless — mitigate by keeping a warm Qdrant Cloud instance or self-hosted always-on container.
