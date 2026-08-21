"use client";

import React, { useState } from "react";

export interface LatencyBreakdown {
  sttMs?: number;
  embedMs?: number;
  retrievalMs?: number;
  generationMs?: number;
  totalMs?: number;
}

interface LatencyChipsProps {
  latency?: LatencyBreakdown;
  traceId?: string;
}

export function LatencyChips({ latency, traceId }: LatencyChipsProps) {
  const [copiedTrace, setCopiedTrace] = useState(false);
  if (!latency) return null;

  const handleCopyTrace = () => {
    if (!traceId) return;
    navigator.clipboard.writeText(traceId);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  const retrievalSubPipelineMs =
    (typeof latency.embedMs === "number" ? latency.embedMs : 0) +
    (typeof latency.retrievalMs === "number" ? latency.retrievalMs : 0);

  const isRetrievalUnderBudget = retrievalSubPipelineMs <= 200;
  const hasRetrievalMetrics =
    typeof latency.embedMs === "number" || typeof latency.retrievalMs === "number";

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#141A18]/90 border border-white/[0.08] shadow-lg font-mono text-xs text-[#9AA6A2] backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest mr-0.5">
          Telemetry:
        </span>

        {/* STT Latency */}
        {typeof latency.sttMs === "number" && latency.sttMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>STT:</span>
            <strong className="font-semibold text-white">{latency.sttMs}ms</strong>
          </div>
        )}

        {/* Embed Latency */}
        {typeof latency.embedMs === "number" && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Embed:</span>
            <strong className="font-semibold text-white">{latency.embedMs}ms</strong>
          </div>
        )}

        {/* Retrieval Latency */}
        {typeof latency.retrievalMs === "number" && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Retrieve:</span>
            <strong className="font-semibold text-white">{latency.retrievalMs}ms</strong>
          </div>
        )}

        {/* Retrieval SLA Budget Flag (Embed + Retrieve vs 200ms Target) */}
        {hasRetrievalMetrics && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-semibold transition-all ${
              isRetrievalUnderBudget
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950"
                : "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-950"
            }`}
            title={`Retrieval Budget SLA: Target < 200ms (Current: Embed ${latency.embedMs ?? 0}ms + Retrieve ${latency.retrievalMs ?? 0}ms)`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRetrievalUnderBudget ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-[11px]">
              Retrieval SLA: <strong className="text-white">{retrievalSubPipelineMs}ms</strong>
            </span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 font-bold">
              {isRetrievalUnderBudget ? "<200ms SLA" : ">200ms SLA"}
            </span>
          </div>
        )}

        {/* Generation Latency */}
        {typeof latency.generationMs === "number" && latency.generationMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span>Generate:</span>
            <strong className="font-semibold text-white">{latency.generationMs}ms</strong>
          </div>
        )}

        {/* Total E2E Latency */}
        {typeof latency.totalMs === "number" && latency.totalMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Total E2E:</span>
            <strong className="font-bold text-emerald-200">{latency.totalMs}ms</strong>
          </div>
        )}
      </div>

      {/* Copyable Trace ID */}
      {traceId && (
        <button
          type="button"
          onClick={handleCopyTrace}
          className="inline-flex items-center gap-1.5 text-[11px] text-[#9AA6A2] hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-all cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
          title={`Click to copy full trace ID: ${traceId}`}
        >
          <span className="font-mono">Trace: {traceId.slice(0, 8)}...</span>
          {copiedTrace ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied</span>
            </span>
          ) : (
            <svg className="w-3.5 h-3.5 text-[#9AA6A2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

