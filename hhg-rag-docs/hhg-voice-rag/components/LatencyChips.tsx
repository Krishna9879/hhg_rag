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
  if (!latency) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#9AA6A2]">
      {typeof latency.sttMs === "number" && latency.sttMs > 0 && (
        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
          STT: <strong className="text-amber-400 font-semibold">{latency.sttMs}ms</strong>
        </span>
      )}

      {typeof latency.embedMs === "number" && latency.embedMs > 0 && (
        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
          Embed: <strong className="text-blue-400 font-semibold">{latency.embedMs}ms</strong>
        </span>
      )}

      {typeof latency.retrievalMs === "number" && latency.retrievalMs > 0 && (
        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
          Retrieval: <strong className="text-purple-400 font-semibold">{latency.retrievalMs}ms</strong>
        </span>
      )}

      {typeof latency.generationMs === "number" && latency.generationMs > 0 && (
        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
          Generation: <strong className="text-teal-400 font-semibold">{latency.generationMs}ms</strong>
        </span>
      )}

      {typeof latency.totalMs === "number" && latency.totalMs > 0 && (
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
          Total E2E: <strong>{latency.totalMs}ms</strong>
        </span>
      )}

      {traceId && (
        <span
          className="ml-auto text-[11px] text-[#9AA6A2]/60 hover:text-[#9AA6A2] cursor-pointer transition-colors"
          title={`Trace ID: ${traceId}`}
          onClick={() => {
            navigator.clipboard.writeText(traceId);
            alert("Trace ID copied to clipboard!");
          }}
        >
          Trace: {traceId.slice(0, 8)}...
        </span>
      )}
    </div>
  );
}
