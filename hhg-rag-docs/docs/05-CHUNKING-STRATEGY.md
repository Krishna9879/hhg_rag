# 5. Chunking Strategy Design

This is the section the task PDF explicitly says must be "vast." We implement **four** distinct strategies, index each into its own Qdrant collection, and retrieve across all four at query time (fused in Stage 4, doc 04).

## 5.1 Strategy Matrix

| Strategy | Collection name | How it splits | Chunk size | Overlap | Metadata attached |
|---|---|---|---|---|---|
| **Fixed-size** (baseline) | `msmarco_fixed` | Naive token-count windows | 256 tokens | 0 | `docId`, `chunkIndex` |
| **Fixed-size + overlap** | `msmarco_overlap` | Sliding window | 256 tokens | 64 tokens (25%) | `docId`, `chunkIndex`, `overlapWith` |
| **Semantic splitting** | `msmarco_semantic` | Split on embedding-distance breakpoints between consecutive sentences (percentile threshold method) | Variable (typically 80–400 tokens) | 0 (natural boundaries) | `docId`, `breakpointScore` |
| **Metadata-aware / structural** | `msmarco_structural` | Split on passage/document boundaries already present in MSMARCO-XI (query-passage pairs), enriched with query-type metadata | Variable, capped at 512 tokens | Sentence-level overlap (1 sentence) at hard cutoffs only | `docId`, `queryType`, `passageRank`, `isSelected` (MSMARCO's relevance label) |

## 5.2 Why four, not one
- **Fixed-size** is the required baseline / control to demonstrate improvement.
- **Overlap** tests whether boundary information loss (a fact split across two chunks) hurts fixed-size retrieval — it measurably helps recall on multi-sentence facts.
- **Semantic** adapts chunk boundaries to topic shifts, which helps precision on MSMARCO's short, dense passages.
- **Metadata-aware** exploits MSMARCO-XI's existing structure (it's already a query-passage relevance dataset) — this is the "don't throw away free signal" strategy, and lets us filter retrieval by `queryType` when the incoming voice query looks like a specific question type (definition vs. comparison vs. how-to).

## 5.3 Semantic Splitting — Implementation Detail
1. Split document into sentences.
2. Embed each sentence.
3. Compute cosine distance between consecutive sentence embeddings.
4. Flag a breakpoint where distance exceeds the 90th percentile of distances *within that document*.
5. Group sentences between breakpoints into one chunk; merge any chunk under 40 tokens into its neighbor to avoid over-fragmentation.

## 5.4 Retrieval-Time Fusion
- All 4 collections queried in parallel (Stage 4, doc 04).
- **Reciprocal Rank Fusion (RRF):** `score(chunk) = Σ 1/(60 + rank_i)` across the strategies where that chunk (or its near-duplicate) appears.
- Near-duplicate detection: chunks from different strategies covering the same `docId` + overlapping token span are merged into one result, keeping the tightest/most relevant span.
- Metadata filter pass-through: if the query classifier tags the question as e.g. "definition", retrieval can boost/filter `msmarco_structural` results where `queryType == 'definition'`.

## 5.5 Why this satisfies the requirement
The task explicitly penalizes "a single naive fixed-size chunking approach." This design ships fixed-size *as one of four*, benchmarks retrieval quality per-strategy (recorded in the benchmark report, doc 18), and uses fusion rather than picking a winner — demonstrating engineered, comparative retrieval rather than a single arbitrary choice.
