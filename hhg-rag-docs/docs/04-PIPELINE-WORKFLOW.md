# 4. Detailed Workflow / Pipeline Design

## 4.1 Stage-by-Stage

### Stage 0 — Capture
- Browser records audio via `MediaRecorder` (webm/opus, 16kHz mono preferred for STT).
- Max recording length: 15s (hackathon Q&A doesn't need longer; keeps STT latency bounded).
- Client shows a live waveform (uses `AnalyserNode`) for UX feedback.

### Stage 1 — Speech-to-Text (Sarvam)
- On stop, blob POSTed to `/api/transcribe`.
- Server calls Sarvam's STT endpoint (`saarika:v2`), language auto-detect enabled.
- Returns `{ transcript, confidence, sttLatencyMs }`.
- Client shows transcript in an **editable** text field before submission (trust + error correction — also a guardrail against garbled audio).

### Stage 2 — Query Understanding (lightweight)
- Trim/normalize transcript.
- Quick heuristic + classifier pass (part of Guardrail pre-check, doc 10) to flag empty/off-topic/unsafe queries *before* spending a retrieval+LLM call.

### Stage 3 — Embedding
- Query embedded with the same multilingual-e5 model used at ingestion time.
- Cached: identical query text within a short TTL reuses the embedding (demo traffic often repeats judge questions).

### Stage 4 — Retrieval (parallel, multi-strategy)
- Query fired in parallel against all 4 Qdrant collections (fixed-size, semantic, overlap, metadata-aware — doc 05).
- Each returns top-k (k=5) with cosine similarity scores.
- **Merge/re-rank step:** reciprocal-rank fusion across the 4 result sets → final top-k (k=5) passed forward, with per-chunk `sourceStrategy` tag retained for the debug panel.

### Stage 5 — Groundedness Pre-Generation Guardrail
- If max similarity score < threshold (e.g. 0.72) → skip generation, return a "not found in dataset" refusal immediately (fast + honest).

### Stage 6 — Generation (Groq)
- Structured prompt: system instructions + numbered context passages + user query.
- Streamed response via Groq's streaming API, forwarded to client over SSE.
- Prompt instructs the model to cite passage numbers inline and to say "I don't have grounded information for that" if context is insufficient (belt-and-suspenders with Stage 5).

### Stage 7 — Post-Generation Guardrail
- Cheap check: does the answer reference at least one passage number / does it overlap lexically with retrieved context? If not → flag as ungrounded, append a disclaimer or fall back to refusal (doc 10 has full logic).

### Stage 8 — Response Assembly
- Client receives: streamed answer text, source chunk previews + dataset IDs, per-stage latency breakdown, trace ID.

## 4.2 Failure Points & Fallbacks
| Stage | Failure | Fallback |
|---|---|---|
| STT | Sarvam timeout/error | Retry once (harness), then fall back to ElevenLabs if configured, else prompt user to type |
| Embedding | Model endpoint down | Retry with backoff (2 attempts), then fail request with clear error |
| Retrieval | One collection times out | Proceed with remaining collections' results (partial degradation, not full failure) |
| Generation | Groq 70B slow/rate-limited | Auto-downgrade to 8B model for that request |
| Any stage | Total budget exceeded | Return best-effort partial result + latency breakdown rather than hanging |
