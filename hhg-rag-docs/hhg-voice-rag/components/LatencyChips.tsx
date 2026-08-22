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
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl glass-panel shadow-xl font-mono text-xs text-slate-300">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-300">TELEMETRY</span>
        </div>

        {/* STT Latency */}
        {typeof latency.sttMs === "number" && latency.sttMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-slate-400">STT:</span>
            <strong className="font-bold text-white">{latency.sttMs}ms</strong>
          </div>
        )}

        {/* Embed Latency */}
        {typeof latency.embedMs === "number" && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-slate-400">Embed:</span>
            <strong className="font-bold text-white">{latency.embedMs}ms</strong>
          </div>
        )}

        {/* Retrieval Latency */}
        {typeof latency.retrievalMs === "number" && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-slate-400">Retrieve:</span>
            <strong className="font-bold text-white">{latency.retrievalMs}ms</strong>
          </div>
        )}

        {/* Retrieval SLA Budget Flag (Target < 200ms) */}
        {hasRetrievalMetrics && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold transition-all shadow-md ${
              isRetrievalUnderBudget
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40"
                : "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-amber-950/40"
            }`}
            title={`Retrieval SLA: Target < 200ms (Embed ${latency.embedMs ?? 0}ms + Retrieve ${latency.retrievalMs ?? 0}ms)`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRetrievalUnderBudget ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-amber-400"
              }`}
            />
            <span>
              Retrieval SLA: <strong className="text-white">{retrievalSubPipelineMs}ms</strong>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                isRetrievalUnderBudget
                  ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30"
                  : "bg-amber-500/30 text-amber-200 border border-amber-400/30"
              }`}
            >
              {isRetrievalUnderBudget ? "<200ms SLA" : ">200ms SLA"}
            </span>
          </div>
        )}

        {/* Generation Latency */}
        {typeof latency.generationMs === "number" && latency.generationMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-300 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span className="text-slate-400">Generate:</span>
            <strong className="font-bold text-white">{latency.generationMs}ms</strong>
          </div>
        )}

        {/* Total E2E Latency */}
        {typeof latency.totalMs === "number" && latency.totalMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Total E2E:</span>
            <strong className="font-extrabold text-emerald-200">{latency.totalMs}ms</strong>
          </div>
        )}
      </div>

      {/* Copyable Trace ID */}
      {traceId && (
        <button
          type="button"
          onClick={handleCopyTrace}
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-xl border border-white/[0.1] transition-all cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
          title={`Click to copy trace ID: ${traceId}`}
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
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
