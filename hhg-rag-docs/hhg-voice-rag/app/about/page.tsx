"use client";

import React from "react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-4xl flex flex-col gap-10">
        {/* Title */}
        <div className="flex flex-col gap-3 pb-6 border-b border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono w-fit">
            System Specifications & Architecture
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#F5F7F6] tracking-tight">
            Engineering a Sub-Second Indic Voice RAG
          </h1>
          <p className="text-base text-[#9AA6A2] leading-relaxed">
            A production-grade, latency-optimized Retrieval-Augmented Generation system for Indian languages. Built with four parallel chunking strategies, hard latency budgets, multi-tiered guardrails, and real-time observability.
          </p>
        </div>

        {/* Architecture Flow Diagram */}
        <div className="rounded-3xl bg-[#141A18] border border-white/10 p-6 sm:p-8 shadow-xl flex flex-col gap-6">
          <h2 className="text-xl font-bold text-[#F5F7F6] flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            End-to-End System Pipeline
          </h2>

          <div className="rounded-2xl bg-black/60 border border-white/5 p-6 font-mono text-xs text-emerald-300/90 overflow-x-auto leading-relaxed">
            <pre>{`┌──────────────┐     audio      ┌────────────────┐     STT     ┌────────────────┐
│  Browser /   │ ─────────────> │ /api/transcribe│ ──────────> │ Sarvam AI STT  │
│  User Mic    │ <───────────── │   (proxy)      │ <────────── │   (Hindi/EN)   │
└──────────────┘   transcript   └────────────────┘             └────────────────┘
       │
       │ confirmed query
       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           Next.js Harness Orchestrator                        │
│                                                                               │
│  1. Pre-Check Guardrails (Empty, Unsafe, Prompt Injection Sanitization)       │
│  2. Embedding (Jina / E5 Multilingual - 1024-dim Vector)                     │
│  3. Parallel 4-Collection Retrieval:                                          │
│     ├── msmarco_fixed       (512-char window)                                │
│     ├── msmarco_overlap     (256-char + 64-char overlap)                     │
│     ├── msmarco_semantic    (sentence-level similarity breakpoints)          │
│     └── msmarco_structural  (paragraph & delimiter boundaries)              │
│  4. Reciprocal Rank Fusion (RRF k=60) + Cosine Groundedness Check             │
│  5. Groq LPU Generation (Qwen / Llama 3.3 70B with 8B automatic downgrade)   │
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
          <h2 className="text-2xl font-bold text-[#F5F7F6]">
            The 4 Vector Chunking Strategies
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#141A18] border border-blue-500/20 p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-400">1. Fixed-Size Chunking</span>
                <span className="text-xs font-mono text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  msmarco_fixed
                </span>
              </div>
              <p className="text-xs text-[#9AA6A2] leading-relaxed">
                Deterministic 512-character windows. Guarantees uniform vector density and rapid indexing without linguistic parsing overhead.
              </p>
            </div>

            <div className="rounded-2xl bg-[#141A18] border border-purple-500/20 p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-purple-400">2. Overlap Window Chunking</span>
                <span className="text-xs font-mono text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  msmarco_overlap
                </span>
              </div>
              <p className="text-xs text-[#9AA6A2] leading-relaxed">
                256-character chunks with a 64-character sliding overlap. Eliminates information loss at sentence boundaries and preserves contextual transitions.
              </p>
            </div>

            <div className="rounded-2xl bg-[#141A18] border border-emerald-500/20 p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-400">3. Semantic Chunking</span>
                <span className="text-xs font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  msmarco_semantic
                </span>
              </div>
              <p className="text-xs text-[#9AA6A2] leading-relaxed">
                Identifies semantic topic transitions using sentence embedding distance thresholds. Groups coherent conceptual blocks together.
              </p>
            </div>

            <div className="rounded-2xl bg-[#141A18] border border-amber-500/20 p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-400">4. Structural Chunking</span>
                <span className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  msmarco_structural
                </span>
              </div>
              <p className="text-xs text-[#9AA6A2] leading-relaxed">
                Splits passages on natural Hindi and English syntactic delimiters (पूर्ण विराम ।, newlines, headers, list items) maintaining clean grammatical units.
              </p>
            </div>
          </div>
        </div>

        {/* Guardrails and Safety */}
        <div className="rounded-3xl bg-[#141A18] border border-white/10 p-6 sm:p-8 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-[#F5F7F6]">
            Multi-Tiered Guardrails & Refusal Protocol
          </h2>
          <p className="text-sm text-[#9AA6A2] leading-relaxed">
            The system employs a strict 3-phase guardrail pipeline:
          </p>

          <ul className="flex flex-col gap-3 text-sm text-[#9AA6A2]">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Pre-Retrieval Input Filter:</strong> Rejects noise, empty transcripts, unsafe keywords, and jailbreak / prompt-injection attempts (&quot;ignore instructions&quot;) before burning any downstream compute.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Groundedness Cosine Floor:</strong> Computes the maximum similarity of retrieved context. If all retrieved passages fall below the groundedness threshold, the LLM call is bypassed entirely, preventing parametric hallucinations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Post-Generation Citation Check:</strong> Verifies that claims in the output reference at least one verified source with inline bracket citations <code className="text-emerald-400 font-mono">[1]</code>.</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30">
          <div>
            <h3 className="text-base font-bold text-white">Experience the Voice Pipeline</h3>
            <p className="text-xs text-[#9AA6A2]">Test voice queries, citations, and observe live latency metrics.</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-xl transition-colors"
          >
            Launch Chat →
          </Link>
        </div>
      </div>
    </div>
  );
}
