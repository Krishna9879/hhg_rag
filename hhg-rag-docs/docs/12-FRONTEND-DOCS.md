# 12. Frontend Docs

## 12.1 Design System
**Tone:** technical-but-warm, "instrument panel meets chat." Judges should visually register "this is engineered" within 2 seconds.

- **Color tokens:**
  - `--bg`: near-black `#0B0F0E`
  - `--surface`: `#141A18`
  - `--accent`: teal-green `#1F9D6B` (nods to the RAG/"grounded" theme)
  - `--accent-alt`: warm amber `#F2A93B` (mic-active state)
  - `--text-primary`: `#F5F7F6`
  - `--text-muted`: `#9AA6A2`
  - `--danger`: `#E4573D` (refusal/error states)
- **Typography:** `Inter` (UI text) + `JetBrains Mono` (latency chips, trace IDs, source snippets — reinforces "real system" feel).
- **Spacing scale:** 4/8/12/16/24/32/48px.
- **Radius:** 12px cards, 999px (pill) for chips/buttons.
- **Motion:** mic button pulses on active recording; token stream uses a subtle fade-in per word, not a typewriter effect (feels faster).

## 12.2 Component Library (`components/`)
| Component | Purpose |
|---|---|
| `MicButton` | Press-and-hold or tap-to-toggle recording, waveform visualization, states: idle/recording/processing |
| `TranscriptEditor` | Editable confirmation of STT output before submit |
| `AnswerStream` | Renders streamed tokens, inline citation markers |
| `SourceCard` | Shows a retrieved chunk: text snippet, `docId`, strategy tag, similarity score |
| `LatencyChips` | Small pill row: `STT 412ms · Embed 18ms · Retrieval 87ms · Gen 640ms` |
| `RefusalBanner` | Distinct visual treatment for guardrail refusals (not styled as an error) |
| `DebugPanel` | Collapsible: raw trace JSON, per-strategy retrieval breakdown |
| `BenchmarkBadge` | Live-fetches `/api/benchmark`, shows current P50/P70/P100 |

## 12.3 Page Specifications
| Route | Purpose |
|---|---|
| `/` | Main voice Q&A experience (mic, transcript, answer, sources, latency) |
| `/benchmark` | Public-facing latency report page (for judges/submission link) |
| `/about` | Short explainer: dataset, chunking strategies, architecture diagram (embeds doc 03's Mermaid) |

## 12.4 Routing Map
```
app/
  page.tsx                → /
  benchmark/page.tsx      → /benchmark
  about/page.tsx          → /about
  api/
    transcribe/route.ts   → POST /api/transcribe
    query/route.ts        → POST /api/query
    benchmark/route.ts    → GET  /api/benchmark
    benchmark/run/route.ts→ POST /api/benchmark/run
    health/route.ts       → GET  /api/health
```

## 12.5 State Management
- Local component state (`useState`/`useReducer`) for the recording/answer flow — no global store needed at this scope.
- One `QueryFlowContext` (React context) holds: `status ('idle'|'recording'|'transcribing'|'retrieving'|'generating'|'done'|'refused'|'error')`, `transcript`, `chunks`, `answer`, `latency`, `traceId` — passed to `AnswerStream`, `LatencyChips`, `DebugPanel` without prop drilling.
- Server state (`/api/benchmark`) fetched with a simple `useEffect` + polling (10s) on `/benchmark`; no need for React Query at this scope, but acceptable to add if the team is faster with it.

## 12.6 Responsive Breakpoints
| Name | Width | Behavior |
|---|---|---|
| `sm` | <640px | Single column, mic button large & centered, sources collapse under answer |
| `md` | 640–1024px | Two-column: answer left, sources+debug right |
| `lg` | >1024px | Same as `md` with wider max-width (1080px) container, larger typography |

Mic capture must work on mobile Safari/Chrome — verify `MediaRecorder` mime-type fallback (`audio/mp4` on iOS Safari vs `audio/webm` elsewhere) explicitly in testing (doc 19).
