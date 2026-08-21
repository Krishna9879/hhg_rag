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

  return (
    <div className="w-full rounded-2xl bg-[#141A18] border border-white/10 overflow-hidden shadow-lg">
      <button
        id="toggle-debug-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 flex items-center justify-between text-xs font-mono text-[#9AA6A2] hover:text-[#F5F7F6] bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer"
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
            Debug / Observability Panel {traceId ? `(${traceId.slice(0, 8)})` : ""}
          </span>
        </div>

        <span className="text-[11px] text-[#9AA6A2]/70">
          {isOpen ? "Hide Raw JSON" : "Show Raw JSON"}
        </span>
      </button>

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
