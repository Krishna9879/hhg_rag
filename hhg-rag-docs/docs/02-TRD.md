# 2. Technical Requirements Document (TRD)

## 2.1 Stack Decision Table

| Layer | Choice | Alternatives considered | Why |
|---|---|---|---|
| App framework | **Next.js 15 (App Router, TS)** | Remix, plain Express | Single deploy target (Vercel), API routes + streaming UI in one repo, edge runtime option for low latency |
| STT | **Sarvam AI** (`saarika:v2` model) | ElevenLabs Scribe | Sarvam is purpose-built for Indian languages/accents (relevant for a Goa-based hackathon audience), has a low-latency streaming STT endpoint, and is cheaper at hackathon scale. ElevenLabs Scribe is the fallback if Sarvam rate-limits during the demo. |
| Vector DB | **Qdrant** | Pinecone, Chroma | Qdrant: sub-10ms ANN search at this dataset scale, filterable payloads (metadata-aware retrieval requirement), free self-host via Docker for dev, Qdrant Cloud free tier for prod, gRPC client for lowest latency. Pinecone is serverless-friendly but adds network hop cost; Chroma is great locally but not built for low-latency hosted prod. |
| Embeddings | **`intfloat/multilingual-e5-large`** (fallback: `-small`) | OpenAI `text-embedding-3-small`, Cohere embed-v3 | Multilingual (matches Sarvam's multilingual STT output), open-weight (no per-call cost/latency to an external embedding API if self-hosted via a small inference endpoint), strong MTEB retrieval scores. `-small` variant swapped in if embedding latency threatens the 200ms budget. |
| LLM | **Groq — Llama 3.3 70B**, fallback 8B | Gemini 2.0 Flash, Claude 3.5 Haiku | Groq's LPU inference is the fastest hosted token generation available (routinely >300 tokens/sec), which matters most for the latency requirement. 8B model auto-selected under load-shedding rules if 70B latency spikes. |
| Orchestration | **Pure TypeScript structured harness** | LangChain, LlamaIndex | A hand-rolled harness (doc 09) gives full control over timeouts/retries/latency instrumentation with zero framework overhead — LangChain's abstraction layers add measurable latency and are hard to reason about under a 200ms budget. |
| Auth | None (public demo) | NextAuth | Out of scope; judges need frictionless access |
| Deploy | **Vercel** (app) + **Qdrant Cloud** + **Groq API** + **Sarvam API** | Self-hosted VPS | Vercel gives instant public URL, edge functions, zero-ops; matches "Live working link" requirement |

## 2.2 Functional Requirements
- FR1: Accept microphone audio in-browser (MediaRecorder API), stream/send to STT.
- FR2: Transcribe to text via Sarvam; display transcript to user before retrieval starts.
- FR3: Embed the transcribed query; run hybrid (dense + metadata filter) retrieval against Qdrant.
- FR4: Merge/re-rank results across ≥2 chunking-strategy collections (see doc 05).
- FR5: Construct a grounded prompt (context + citations) and call the LLM.
- FR6: Run guardrail checks pre- and post-generation (doc 10).
- FR7: Stream the answer token-by-token to the client with source citations attached.
- FR8: Log every request's per-stage latency to a store queryable by `/api/benchmark`.
- FR9: Expose `/api/benchmark` returning P50/P70/P100 over the last N queries.

## 2.3 Non-Functional Requirements
- NFR1 (Latency): Retrieval sub-pipeline (embed query → search → merge/re-rank) **P70 < 200ms**.
- NFR2 (Availability): Demo must survive judge traffic — add request queueing/backpressure, not crashes.
- NFR3 (Observability): Every request gets a trace ID and per-stage timing breakdown, visible in a debug panel.
- NFR4 (Groundedness): No answer ships without at least one retrieved chunk above a similarity threshold; otherwise refusal path triggers.
- NFR5 (Reproducibility): Ingestion pipeline is a script (`scripts/ingest.ts`), fully re-runnable, idempotent.

## 2.4 Dataset
`ai4bharat/MSMARCO-XI` (Hugging Face). Ingestion pulls the passage collection, applies the 4 chunking strategies (doc 05), embeds, and upserts into 4 parallel Qdrant collections tagged by strategy — enabling apples-to-apples retrieval-quality comparison and a hybrid "best-of" retrieval mode.

## 2.5 Out of Scope
LangChain/LlamaIndex adoption, multi-tenant auth, mobile native app, non-English UI copy.
