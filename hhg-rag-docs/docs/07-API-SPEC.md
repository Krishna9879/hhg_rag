# 7. API Specification

All routes under Next.js App Router `app/api/*`. All responses include an `X-Trace-Id` header.

## 7.1 `POST /api/transcribe`
Transcribes uploaded audio via Sarvam.

**Request:** `multipart/form-data`
- `audio`: file (webm/opus, ≤15s)

**Response `200`:**
```json
{
  "transcript": "what is the capital of india",
  "confidence": 0.94,
  "language": "en-IN",
  "sttLatencyMs": 412,
  "traceId": "..."
}
```
**Errors:** `400` (no audio / too long), `502` (Sarvam upstream failure), `504` (STT timeout after 5s + 1 retry).

## 7.2 `POST /api/query`
Runs the full retrieval+generation pipeline. Streams via Server-Sent Events.

**Request:**
```json
{ "query": "what is the capital of india", "traceId": "optional, reuse from /api/transcribe" }
```

**Response:** `text/event-stream`, events:
- `event: guardrail` → `{ "status": "pass" | "refused", "reason": "off_topic" | "unsafe" | "ungrounded" | null }`
- `event: retrieval` → `{ "chunks": [{ "docId", "text", "score", "strategy" }], "retrievalLatencyMs": 87 }`
- `event: token` → `{ "text": "Del" }` (repeated, streamed answer)
- `event: done` → `{ "fullAnswer": "...", "latency": { "sttMs":412, "embedMs":18, "retrievalMs":87, "generationMs":640, "totalMs":1157 }, "traceId": "..." }`
- `event: error` → `{ "message": "..." }`

**Errors:** `400` (empty query), `422` (guardrail hard-refusal — still `200` with `status:"refused"` in practice, so the UI can render it nicely — `422` reserved for malformed input only).

## 7.3 `GET /api/benchmark`
Returns aggregated latency stats over recent logged requests.

**Query params:** `?n=100` (sample size, default 100), `?stage=retrieval|generation|total` (default `total`)

**Response `200`:**
```json
{
  "sampleSize": 100,
  "stage": "total",
  "p50Ms": 640,
  "p70Ms": 810,
  "p100Ms": 1420,
  "generatedAt": "ISO timestamp"
}
```

## 7.4 `POST /api/benchmark/run`
Triggers a fresh benchmark run against a fixed query set (`data/eval-queries.json`, ≥50 queries) and persists results.

**Response `202`:** `{ "jobId": "...", "status": "started" }`
**Poll:** `GET /api/benchmark/run/:jobId` → `{ "status": "running" | "done", "resultCsvUrl": "/reports/latest.csv" }`

## 7.5 `GET /api/health`
Liveness/readiness for Vercel + uptime checks. Returns status of each downstream (Sarvam, Qdrant, Groq) with a cheap ping.

## 7.6 Auth
None required (public hackathon demo). Rate limiting: IP-based, 20 req/min on `/api/query`, to protect the demo from being hammered during judging.
