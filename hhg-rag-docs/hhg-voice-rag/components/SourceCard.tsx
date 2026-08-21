"use client";

import React from "react";

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
  fixed: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  overlap: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  semantic: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  structural: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
};

export function SourceCard({ index, chunk, highlighted }: SourceCardProps) {
  const badgeStyle = STRATEGY_COLORS[chunk.strategy] || STRATEGY_COLORS.fixed;

  return (
    <div
      id={`source-card-${index + 1}`}
      className={`rounded-xl border p-4 transition-all duration-300 ${
        highlighted
          ? "bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/30"
          : "bg-[#141A18] border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-xs font-mono font-bold text-[#F5F7F6]">
            {index + 1}
          </span>
          <span className="text-xs font-mono text-[#9AA6A2] truncate max-w-[140px]">
            {chunk.docId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[11px] font-mono font-medium rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
          >
            {chunk.strategy}
          </span>
          <span className="text-[11px] font-mono text-emerald-400/90 font-medium">
            RRF: {chunk.score.toFixed(4)}
          </span>
        </div>
      </div>

      <p className="text-sm text-[#9AA6A2] leading-relaxed line-clamp-4 font-sans">
        {chunk.text}
      </p>
    </div>
  );
}
