"use client";

import React, { useState } from "react";
import { SourceChunkItem } from "./SourceCard";
import { LatencyBreakdown } from "./LatencyChips";

interface DebugPanelProps {
  traceId?: string;
  latency?: LatencyBreakdown;
  chunks?: SourceChunkItem[];
  guardrailStatus?: string;
  guardrailReason?: string;
}

export function DebugPanel({
  traceId,
  latency,
  chunks,
  guardrailStatus,
  guardrailReason,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);

  const debugData = {
    traceId,
    timestamp: new Date().toISOString(),
    guardrail: {
      status: guardrailStatus || "pass",
      reason: guardrailReason || null,
    },
    latency,
    retrievedChunksCount: chunks?.length || 0,
    chunks: chunks?.map((c) => ({
      docId: c.docId,
      strategy: c.strategy,
      rrfScore: c.score,
    })),
  };

  const handleCopyTrace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!traceId) return;
    navigator.clipboard.writeText(traceId);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl bg-[#141A18] border border-white/10 overflow-hidden shadow-lg">
      <div
        id="toggle-debug-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#9AA6A2] hover:text-[#F5F7F6] bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold uppercase tracking-wider">
            Debug & Observability Panel
          </span>
          {traceId && (
            <button
              type="button"
              onClick={handleCopyTrace}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-emerald-400 border border-white/10 transition-colors"
              title="Click to copy full trace ID"
            >
              <span>{traceId.slice(0, 8)}...</span>
              {copiedTrace ? (
                <span className="text-emerald-300 font-bold">✓ Copied</span>
              ) : (
                <svg className="w-3 h-3 text-[#9AA6A2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}
        </div>

        <span className="text-[11px] text-[#9AA6A2]/70">
          {isOpen ? "Hide Raw Telemetry JSON" : "Show Raw Telemetry JSON"}
        </span>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-white/5 bg-black/40">
          <pre className="text-[11px] font-mono text-emerald-400/90 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

