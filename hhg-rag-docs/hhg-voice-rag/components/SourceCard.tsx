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

const STRATEGY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fixed: { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30" },
  overlap: { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30" },
  semantic: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" },
  structural: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30" },
};

export function SourceCard({ index, chunk, highlighted }: SourceCardProps) {
  const [copied, setCopied] = useState(false);
  const badgeStyle = STRATEGY_COLORS[chunk.strategy] || STRATEGY_COLORS.fixed;

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
          <span className="text-xs font-mono font-medium text-[#9AA6A2] truncate max-w-[130px] sm:max-w-[180px]">
            {chunk.docId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
          >
            {chunk.strategy}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-[#9AA6A2]/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Copy passage"
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
      <div className="mt-3 pt-2 flex items-center justify-between text-[11px] font-mono text-[#9AA6A2]/80">
        <span>RRF Relevance</span>
        <span className="font-bold text-emerald-400">
          {(chunk.score * 100).toFixed(2)}% ({chunk.score.toFixed(4)})
        </span>
      </div>
    </div>
  );
}
