# Voice-Enabled RAG Model — HH Goa 2026, Task #2

Complete documentation set for building and submitting the voice-to-answer RAG pipeline.

**Deadline (from official task PDF): August 22, 2026, 11:59 PM IST.**
> Note: your prompt mentioned "21 Aug" — the source PDF says **22 Aug 11:59 PM IST**. All planning below uses the PDF date. Double-check the live countdown on the task card before you rely on this.

## Stack
- **Frontend + Backend:** Next.js 15 (App Router) + TypeScript
- **STT:** Sarvam AI (primary) — see [02-TRD](docs/02-TRD.md) for justification vs ElevenLabs
- **Vector DB:** Qdrant (local Docker for dev, Qdrant Cloud for prod)
- **Embeddings:** `intfloat/multilingual-e5-large` (or `-small` for latency)
- **LLM:** Groq Llama 3.3 70B (primary), 8B fallback for latency
- **Orchestration:** Pure TypeScript structured harness (no LangChain — see rationale in doc 09)
- **Deploy:** Vercel (app) + Qdrant Cloud + Groq API + Sarvam API

## Reading order

| # | Doc | Purpose |
|---|-----|---------|
| 1 | [PRD](docs/01-PRD.md) | What & why |
| 2 | [TRD](docs/02-TRD.md) | Tech decisions & constraints |
| 3 | [Architecture](docs/03-ARCHITECTURE.md) | System diagram |
| 4 | [Pipeline Workflow](docs/04-PIPELINE-WORKFLOW.md) | Voice→Answer step by step |
| 5 | [Chunking Strategy](docs/05-CHUNKING-STRATEGY.md) | Multi-strategy chunking |
| 6 | [Vector DB Schema](docs/06-VECTOR-DB-SCHEMA.md) | Collections & metadata |
| 7 | [API Spec](docs/07-API-SPEC.md) | All endpoints |
| 8 | [Sequence Diagrams](docs/08-SEQUENCE-DIAGRAMS.md) | Mermaid flows |
| 9 | [Harness Design](docs/09-HARNESS-DESIGN.md) | Retries, error recovery |
| 10 | [Guardrails](docs/10-GUARDRAILS.md) | Safety & grounding |
| 11 | [Latency Optimization](docs/11-LATENCY-OPTIMIZATION.md) | Hitting the target |
| 12 | [Frontend Docs](docs/12-FRONTEND-DOCS.md) | Design system, components, routes |
| 13 | [AI Context Pack](docs/13-AI-CONTEXT.md) | AI_CONTEXT.md, coding rules, DoD |
| 14 | [Implementation Guide](docs/14-IMPLEMENTATION-GUIDE.md) | Step-by-step build |
| 15 | [Setup Guide](docs/15-SETUP-GUIDE.md) | Local + prod setup |
| 16 | [Env Vars](docs/16-ENV-VARS.md) | Full `.env` reference |
| 17 | [Deployment Guide](docs/17-DEPLOYMENT-GUIDE.md) | Vercel + services |
| 18 | [Benchmarking Plan](docs/18-LATENCY-BENCHMARKING-PLAN.md) | P50/P70/P100 methodology |
| 19 | [Testing Strategy](docs/19-TESTING-STRATEGY.md) | Test plan |
| 20 | [Sprint Breakdown](docs/20-SPRINT-BREAKDOWN.md) | Day-by-day tasks |
| — | [Day-by-Day Plan](docs/DAY-BY-DAY-PLAN.md) | Final compressed schedule |

## Antigravity note
You mentioned building this "using Antigravity" (Google's agentic IDE). This doc set is IDE-agnostic — hand any single doc (start with `13-AI-CONTEXT.md` + `14-IMPLEMENTATION-GUIDE.md`) to Antigravity's agent as its task brief, and point it at this repo structure. The `AI_CONTEXT.md` in doc 13 is written specifically to be pasted as a system/context file for an agentic coding tool.
