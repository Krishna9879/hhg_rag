# 6. Database / Vector Store Schema + Metadata Design

## 6.1 Qdrant Collections
Four collections (one per chunking strategy, see doc 05), all sharing this point schema shape:

```json
{
  "id": "uuid-v5(docId + strategy + chunkIndex)",
  "vector": [1024 floats],
  "payload": {
    "docId": "string",
    "strategy": "fixed | overlap | semantic | structural",
    "chunkIndex": 0,
    "text": "chunk text (max ~512 tokens)",
    "tokenCount": 240,
    "queryType": "definition | comparison | howto | factoid | other",
    "isSelected": true,
    "sourceDataset": "ai4bharat/MSMARCO-XI",
    "createdAt": "ISO timestamp",
    "overlapWith": ["uuid of adjacent chunk"],
    "breakpointScore": 0.83
  }
}
```

- `vector`: 1024-dim (multilingual-e5-large) — index type **HNSW**, `m=16`, `ef_construct=128` (tuned for recall/latency balance at this corpus size).
- `distance`: Cosine.
- Payload indexed fields (for filtered search): `strategy`, `queryType`, `isSelected`.

## 6.2 Collection Sizing (per strategy)
| Collection | Approx. chunk count* | Notes |
|---|---|---|
| `msmarco_fixed` | ~N (baseline) | 1 chunk per 256-token window |
| `msmarco_overlap` | ~1.3×N | Overlap increases count |
| `msmarco_semantic` | ~0.8×N | Fewer, larger, topic-coherent chunks |
| `msmarco_structural` | =passage count | 1:1 with MSMARCO passages |

*Exact counts depend on the sampled subset of MSMARCO-XI used (see §6.4 — sampling for hackathon scope).

## 6.3 Metadata Design Rationale
- `strategy` lets us both fuse across collections **and** run isolated per-strategy benchmarks (doc 18) to prove the "vast chunking" claim with numbers, not just code.
- `queryType` is populated at ingestion time from MSMARCO-XI's query metadata (where available) or inferred via a lightweight classifier, enabling metadata-aware filtering at retrieval time.
- `isSelected` reuses MSMARCO's own relevance-judgment label as a free retrieval-quality signal / eval ground truth.
- `overlapWith` / `breakpointScore` exist purely for the debug panel + written docs, to make the chunking method inspectable, not just claimed.

## 6.4 Scope Note
MSMARCO-XI is large. For a hackathon timeline, ingest a **stratified sample** (e.g. 5,000–20,000 passages covering a spread of query types) rather than the full corpus — document this explicitly in the README so it reads as a deliberate scoping decision, not a shortcut.

## 6.5 Ingestion Script Contract (`scripts/ingest.ts`)
- Idempotent: re-running with the same input produces the same point IDs (deterministic UUIDv5), so it's safe to re-run.
- CLI flags: `--strategy=all|fixed|overlap|semantic|structural`, `--limit=N`, `--collection-prefix=msmarco`.
- Emits a summary JSON (`ingest-report.json`) with per-strategy chunk counts and embedding time — feeds directly into doc 18's benchmark report.
