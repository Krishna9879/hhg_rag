# 17. Deployment Guide

## 17.1 Vercel (App)
1. Push repo to GitHub (public, per submission requirement).
2. Import project in Vercel, framework auto-detected as Next.js.
3. Set all env vars from doc 16 in Project Settings (Production + Preview).
4. Choose a deployment region close to your Qdrant Cloud + Groq's serving region (reduces cross-service latency — matters for doc 11's budget).
5. Deploy. Vercel gives you the **live working link** required in the submission form.
6. Set up a cron (Vercel Cron or an external pinger) hitting `/api/health` every few minutes during the judging window to avoid cold starts.

## 17.2 Qdrant Cloud (Vector DB)
1. Create a cluster (free tier is enough for a sampled MSMARCO-XI subset).
2. Same region as §17.1.
3. Run `scripts/ingest.ts` once, pointed at the cloud `QDRANT_URL`/`QDRANT_API_KEY`.
4. Verify collection counts match `ingest-report.json` via the Qdrant Cloud dashboard.

## 17.3 Sarvam AI (STT)
1. Get an API key from Sarvam's developer console.
2. Confirm rate limits are sufficient for demo-day traffic (judges + team testing); if not, add the ElevenLabs fallback path (already designed for in doc 04/09).

## 17.4 Groq (LLM)
1. Get an API key, confirm access to `llama-3.3-70b-versatile` and an 8B fallback model.
2. Watch Groq's rate limits (requests/min, tokens/min) — the harness's auto-downgrade (doc 09) also serves as a rate-limit mitigation, not just a latency one.

## 17.5 GitHub Repo
- Public repo (submission requires a GitHub repo link).
- Include: full `/docs` folder (this set), `README.md` with quickstart, `.env.example`, `ingest-report.json` from your actual ingestion run, `reports/latest.csv` from your actual benchmark run.
- Do **not** commit `.env.local`, raw dataset dumps, or `node_modules`.

## 17.6 Pre-Submission Checklist
- [ ] Live link loads and works end-to-end from a fresh (incognito) browser.
- [ ] Mic permission flow works on both desktop and mobile browsers.
- [ ] `/api/benchmark` returns real numbers matching `reports/latest.csv`.
- [ ] `/benchmark` and `/about` pages render correctly in production.
- [ ] Refusal path demonstrably works (test with an off-topic query on the live link).
- [ ] Both videos recorded, uploaded to Instagram + X by every team member, `#RAGInGoa` on every post, ≥1 public Instagram account.
- [ ] GitHub repo public, docs complete, no secrets committed.
- [ ] Submission form filled: `https://forms.gle/MNvCjcv23Hn2Eeu58`.
- [ ] Build is genuinely final — **no resubmissions allowed**.
