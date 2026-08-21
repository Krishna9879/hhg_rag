"use client";

import React, { useState } from "react";

export interface SourceChunkItem {
  docId: string;
  text: string;
  score: number;
  strategy: string;
}

interface SourceCardProps {
  index: number;
  chunk: SourceChunkItem;
  highlighted?: boolean;
}

const STRATEGY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  fixed: {
    label: "FIXED (512)",
    bg: "bg-blue-500/20",
    text: "text-blue-300",
    border: "border-blue-500/40",
    icon: "🔲",
  },
  overlap: {
    label: "OVERLAP (256+64)",
    bg: "bg-purple-500/20",
    text: "text-purple-300",
    border: "border-purple-500/40",
    icon: "📑",
  },
  semantic: {
    label: "SEMANTIC (BREAKPOINT)",
    bg: "bg-emerald-500/20",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
    icon: "🧠",
  },
  structural: {
    label: "STRUCTURAL (DELIM)",
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/40",
    icon: "📜",
  },
};

export function SourceCard({ index, chunk, highlighted }: SourceCardProps) {
  const [copied, setCopied] = useState(false);
  const normalizedStrategy = (chunk.strategy || "fixed").toLowerCase();
  const cfg = STRATEGY_CONFIG[normalizedStrategy] || STRATEGY_CONFIG.fixed;

  const handleCopy = () => {
    navigator.clipboard.writeText(chunk.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`source-card-${index + 1}`}
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 relative group ${
        highlighted
          ? "bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-900/20 scale-[1.02]"
          : "bg-[#141A18]/90 border-white/10 hover:border-white/20 hover:bg-[#18201D]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-xs font-mono font-black text-[#F5F7F6] shadow-sm">
            {index + 1}
          </span>
          <span className="text-xs font-mono font-medium text-[#9AA6A2] truncate max-w-[110px] sm:max-w-[160px]">
            {chunk.docId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Strategy Tag Pill */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-lg border shadow-sm ${cfg.bg} ${cfg.text} ${cfg.border}`}
            title={`Chunking Strategy: ${chunk.strategy}`}
          >
            <span>{cfg.icon}</span>
            <span>{cfg.label}</span>
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded-lg text-[#9AA6A2]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy passage text"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-[#F5F7F6]/85 leading-relaxed font-sans line-clamp-4">
        {chunk.text}
      </p>

      {/* RRF Score Bar */}
      <div className="mt-3 pt-2 flex items-center justify-between text-[11px] font-mono text-[#9AA6A2]/80 border-t border-white/5">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>RRF Rank Score:</span>
        </span>
        <span className="font-bold text-emerald-400">
          {(chunk.score * 100).toFixed(2)}% ({chunk.score.toFixed(4)})
        </span>
      </div>
    </div>
  );
}

