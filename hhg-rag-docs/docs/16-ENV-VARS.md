# 16. Environment Variables

Create `.env.example` at repo root with this shape (no real values committed):

```bash
# --- Speech-to-Text ---
SARVAM_API_KEY=
SARVAM_API_URL=https://api.sarvam.ai
# Fallback STT (optional)
ELEVENLABS_API_KEY=

# --- Embeddings ---
EMBEDDING_MODEL=intfloat/multilingual-e5-large
EMBEDDING_API_URL=            # if self-hosting / using a hosted inference endpoint
EMBEDDING_API_KEY=

# --- Vector DB ---
QDRANT_URL=http://localhost:6333   # local dev
QDRANT_API_KEY=                    # required for Qdrant Cloud, blank for local
QDRANT_COLLECTION_PREFIX=msmarco

# --- LLM ---
GROQ_API_KEY=
GROQ_MODEL_PRIMARY=llama-3.3-70b-versatile
GROQ_MODEL_FALLBACK=llama-3.1-8b-instant

# --- Dataset ---
HF_TOKEN=
HF_DATASET=ai4bharat/MSMARCO-XI

# --- App config ---
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
RETRIEVAL_LATENCY_BUDGET_MS=200
GROUNDEDNESS_THRESHOLD=0.72
RATE_LIMIT_PER_MIN=20
```

## 16.1 Rules
- Nothing prefixed `NEXT_PUBLIC_` may hold a secret — those are shipped to the browser.
- Set all of the above in Vercel Project Settings → Environment Variables for Production, Preview, and Development separately (Preview can point at a smaller/dev Qdrant collection to save cost).
- `RETRIEVAL_LATENCY_BUDGET_MS` and `GROUNDEDNESS_THRESHOLD` are read at runtime by the harness/guardrails — tune without redeploying code, just update env + redeploy config.
