"use client";

import React from "react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-4xl flex flex-col gap-10">
        {/* Title */}
        <div className="flex flex-col gap-3 pb-6 border-b border-white/[0.08]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Architecture & Specifications</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Sub-Second Indic Voice RAG Pipeline
          </h1>
          <p className="text-base text-[#9AA6A2] leading-relaxed font-sans">
            A production-grade, latency-optimized Retrieval-Augmented Generation system for Indian languages. Engineered with 4 parallel vector chunking strategies, hard latency budgets, multi-tiered guardrails, and real-time observability.
          </p>
        </div>

        {/* Architecture Flow Diagram */}
        <div className="rounded-3xl bg-[#141A18]/90 border border-white/[0.08] p-6 sm:p-8 shadow-xl flex flex-col gap-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            <span>End-to-End System Pipeline</span>
          </h2>

          <div className="rounded-2xl bg-black/70 border border-white/5 p-6 font-mono text-xs text-emerald-300/90 overflow-x-auto leading-relaxed">
            <pre>{`┌──────────────┐     audio      ┌────────────────┐     STT     ┌────────────────┐
│  Browser /   │ ─────────────> │ /api/transcribe│ ──────────> │ Sarvam AI STT  │
│  User Mic    │ <───────────── │   (proxy)      │ <────────── │  (saarika:2.5) │
└──────────────┘   transcript   └────────────────┘             └────────────────┘
       │
       │ confirmed query
       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           Next.js Harness Orchestrator                        │
│                                                                               │
│  1. Pre-Check Guardrails (Empty, Unsafe, Prompt Injection Sanitization)       │
│  2. Embedding (Jina v3 Multilingual - 1024-dim Vector)                       │
│  3. Parallel 4-Collection Retrieval (Budget: 4000ms):                         │
│     ├── msmarco_fixed       (512-char window)                                │
│     ├── msmarco_overlap     (256-char + 64-char overlap)                     │
│     ├── msmarco_semantic    (sentence-level similarity breakpoints)          │
│     └── msmarco_structural  (paragraph & delimiter boundaries)              │
│  4. Reciprocal Rank Fusion (RRF k=60) + Cosine Groundedness Check             │
│  5. Groq LPU Generation (Qwen 27B / Llama 70B with 8B automatic fallback)    │
│  6. Post-Check Guardrails (Inline Citation Validation [1], [2])              │
└───────────────────────────────────────────────────────────────────────────────┘
       │
       │ Server-Sent Events (SSE Token Stream)
       ▼
┌──────────────┐
│ Streaming UI │  (Interactive Answer + Live Latency Chips + Source Breakdown)
└──────────────┘`}</pre>
          </div>
        </div>

        {/* 4 Chunking Strategies Deep-Dive */}
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-white">
            The 4 Vector Chunking Strategies
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#141A18]/90 border border-blue-500/25 p-6 flex flex-col gap-2 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-300">1. Fixed-Size Chunking</span>
                <span className="text-xs font-mono text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/30 font-bold">
                  msmarco_fixed
                </span>
              </div>
              <p className="text-xs text-[#9AA6A2] leading-relaxed font-sans">
                Deterministic 512-character windows. Guarantees uniform vector density and rapid indexing without linguistic parsing overhead.
              </p>
            </div>

            <div className="rounded-2xl bg-[#141A18]/90 border border-purple-500/25 p-6 flex flex-col gap-2 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-purple-300">2. Overlap Window Chunking</span>
                <span className="text-xs font-mono text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30 font-bold">
                  msmarco_overlap
                </span>
              </div>
              <p className="text-xs text-[#9AA6A2] leading-relaxed font-sans">
                256-character chunks with a 64-character sliding overlap. Eliminates information loss at sentence boundaries and preserves contextual transitions.
              </p>
            </div>

            <div className="rounded-2xl bg-[#141A18]/90 border border-emerald-500/25 p-6 flex flex-col gap-2 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-300">3. Semantic Chunking</span>
                <span className="text-xs font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                  msmarco_semantic
                </span>
              </div>
              <p className="text-xs text-[#9AA6A2] leading-relaxed font-sans">
                Identifies semantic topic transitions using sentence embedding distance thresholds. Groups coherent conceptual blocks together.
              </p>
            </div>

            <div className="rounded-2xl bg-[#141A18]/90 border border-amber-500/25 p-6 flex flex-col gap-2 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-300">4. Structural Chunking</span>
                <span className="text-xs font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                  msmarco_structural
                </span>
              </div>
              <p className="text-xs text-[#9AA6A2] leading-relaxed font-sans">
                Splits passages on natural Hindi and English syntactic delimiters (पूर्ण विराम ।, newlines, headers, list items) maintaining clean grammatical units.
              </p>
            </div>
          </div>
        </div>

        {/* Guardrails and Safety */}
        <div className="rounded-3xl bg-[#141A18]/90 border border-white/[0.08] p-6 sm:p-8 flex flex-col gap-4 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white">
            Multi-Tiered Guardrails & Refusal Protocol
          </h2>
          <p className="text-sm text-[#9AA6A2] leading-relaxed font-sans">
            The system employs a strict 3-phase guardrail pipeline:
          </p>

          <ul className="flex flex-col gap-3 text-sm text-[#9AA6A2] font-sans">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong className="text-white">Pre-Retrieval Input Filter:</strong> Rejects noise, empty transcripts, unsafe keywords, and jailbreak / prompt-injection attempts (&quot;ignore instructions&quot;) before burning downstream compute.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong className="text-white">Groundedness Cosine Floor:</strong> Computes the maximum similarity of retrieved context. If all retrieved passages fall below the groundedness threshold, the LLM call is bypassed entirely, preventing hallucinations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong className="text-white">Post-Generation Citation Check:</strong> Verifies that claims in the output reference at least one verified source with inline bracket citations <code className="text-emerald-400 font-mono">[1]</code>.</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 backdrop-blur-xl">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Experience the Voice Pipeline</h3>
            <p className="text-xs sm:text-sm text-[#9AA6A2] font-sans">Test voice queries, citations, and observe live latency metrics.</p>
          </div>
          <Link
            href="/"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-600/30 active:scale-95 shrink-0"
          >
            Launch Chat →
          </Link>
        </div>
      </div>
    </div>
  );
}
