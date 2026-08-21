"use client";

import React from "react";

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
  const [copiedTrace, setCopiedTrace] = React.useState(false);
  if (!latency) return null;

  const handleCopyTrace = () => {
    if (!traceId) return;
    navigator.clipboard.writeText(traceId);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#141A18]/90 border border-white/[0.08] shadow-lg font-mono text-xs text-[#9AA6A2] backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest mr-1">
          Telemetry:
        </span>

        {typeof latency.sttMs === "number" && latency.sttMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>STT:</span>
            <strong className="font-semibold text-white">{latency.sttMs}ms</strong>
          </div>
        )}

        {typeof latency.embedMs === "number" && latency.embedMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Embed:</span>
            <strong className="font-semibold text-white">{latency.embedMs}ms</strong>
          </div>
        )}

        {typeof latency.retrievalMs === "number" && latency.retrievalMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Retrieve:</span>
            <strong className="font-semibold text-white">{latency.retrievalMs}ms</strong>
          </div>
        )}

        {typeof latency.generationMs === "number" && latency.generationMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span>Generate:</span>
            <strong className="font-semibold text-white">{latency.generationMs}ms</strong>
          </div>
        )}

        {typeof latency.totalMs === "number" && latency.totalMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Total E2E:</span>
            <strong className="font-bold text-emerald-200">{latency.totalMs}ms</strong>
          </div>
        )}
      </div>

      {traceId && (
        <button
          type="button"
          onClick={handleCopyTrace}
          className="inline-flex items-center gap-1.5 text-[11px] text-[#9AA6A2]/70 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
          title={`Click to copy trace ID: ${traceId}`}
        >
          <span>Trace: {traceId.slice(0, 8)}...</span>
          {copiedTrace ? (
            <span className="text-emerald-400 font-bold">✓</span>
          ) : (
            <svg className="w-3 h-3 text-[#9AA6A2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
