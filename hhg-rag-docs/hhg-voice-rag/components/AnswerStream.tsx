"use client";

import React, { useState } from "react";

interface AnswerStreamProps {
  answer: string;
  isStreaming?: boolean;
  onCitationClick?: (citationIndex: number) => void;
}

export function AnswerStream({
  answer,
  isStreaming,
  onCitationClick,
}: AnswerStreamProps) {
  const [copied, setCopied] = useState(false);

  if (!answer && !isStreaming) return null;

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Highlight inline citations like [1], [2], 【1】 as interactive glowing tags
  const renderFormattedText = (text: string) => {
    // Normalize Asian brackets 【1】 to [1]
    const normalized = text.replace(/【(\d+)】/g, "[$1]");
    const parts = normalized.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNum = parseInt(match[1], 10);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onCitationClick && onCitationClick(citationNum)}
            className="inline-flex items-center justify-center px-2 py-0.5 mx-1 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-500/40 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm shadow-emerald-950 align-baseline"
            title={`View Grounded Source [${citationNum}]`}
          >
            [{citationNum}]
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-full rounded-3xl glass-panel-elevated p-6 sm:p-8 shadow-2xl relative overflow-visible group">
      {/* Top Emerald Accent Glow */}
      <div className="absolute -top-px left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/60 ring-2 ring-emerald-400/30" />
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
            Verified Grounded Answer / प्रमाणित उत्तर
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="text-xs text-amber-400 font-mono animate-pulse flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Streaming tokens...
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Answer</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Answer content */}
      <div className="text-slate-100 text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-sans tracking-normal pb-2">
        {renderFormattedText(answer)}
        {isStreaming && (
          <span className="inline-block w-2.5 h-5 ml-1.5 bg-emerald-400 animate-pulse align-middle rounded-sm shadow-sm shadow-emerald-400" />
        )}
      </div>
    </div>
  );
}
