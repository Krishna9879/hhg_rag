# 15. Complete Setup Guide

## 15.1 Prerequisites
- Node.js ≥ 20, npm or pnpm
- Docker (for local Qdrant)
- Accounts/API keys: Sarvam AI, Groq, Qdrant Cloud (or local Docker for dev), Hugging Face (read token, for dataset access)
- Vercel account (deployment)

## 15.2 Local Development Setup
```bash
git clone <your-repo-url>
cd hhg-voice-rag
npm install

# Local Qdrant via Docker
docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant

cp .env.example .env.local
# fill in .env.local — see doc 16

# Ingest a small sample first
npm run ingest -- --limit=100

npm run dev
# open http://localhost:3000
```

## 15.3 Verifying the pipeline locally
1. `curl http://localhost:3000/api/health` → all downstreams should report `ok`.
2. Speak a question in the UI → confirm transcript appears, then answer streams with sources.
3. Ask something clearly off-topic (e.g. "write me a poem about cats") → confirm refusal path triggers.
4. `curl http://localhost:3000/api/benchmark` → confirm real numbers (not zeros/nulls).

## 15.4 Full-Scale Ingestion
```bash
npm run ingest -- --strategy=all --limit=<target-N>
```
Expect this to take longer than the sample run — embedding is the bottleneck. Run it once, commit `ingest-report.json`, do not re-run unnecessarily close to the deadline (Qdrant Cloud rate/storage limits + wasted time).

## 15.5 Production Setup (Qdrant Cloud)
1. Create a free-tier Qdrant Cloud cluster, same region as your Vercel deployment region.
2. Note the cluster URL + API key → `QDRANT_URL`, `QDRANT_API_KEY` in Vercel env vars.
3. Point `scripts/ingest.ts` at the cloud cluster (same script, different `QDRANT_URL`) and run ingestion once against prod.

## 15.6 Common Setup Issues
| Symptom | Fix |
|---|---|
| Sarvam 401 | Check `SARVAM_API_KEY` is set server-side, not `NEXT_PUBLIC_*` |
| Qdrant connection refused locally | Docker container not running / port mismatch |
| Embedding requests slow | Check you're not hitting a cold-start serverless embedding endpoint — use a warm instance or a hosted embedding API for dev too |
| Mic not working on iOS Safari | `MediaRecorder` mime type fallback needed — see doc 12.6 |
| CORS errors on `/api/*` | Should not occur (same-origin Next.js API routes) — check you're not calling external APIs directly from the client |
