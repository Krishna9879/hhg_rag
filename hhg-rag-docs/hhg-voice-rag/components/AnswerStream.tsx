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

  // Highlight inline citations like [1], [2] as interactive tags
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNum = parseInt(match[1], 10);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onCitationClick && onCitationClick(citationNum)}
            className="inline-flex items-center justify-center px-2 py-0.5 mx-1 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-500/40 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
            title={`View Source [${citationNum}]`}
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-[#141A18] to-[#0E1312] border border-emerald-500/25 p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
      {/* Subtle top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
          <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-widest">
            Verified Grounded Answer / प्रमाणित उत्तर
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="text-xs text-amber-400 font-mono animate-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Streaming tokens...
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg text-xs font-mono text-[#9AA6A2] hover:text-[#F5F7F6] bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
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
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Answer content */}
      <div className="text-[#F5F7F6] text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-sans tracking-normal">
        {renderFormattedText(answer)}
        {isStreaming && (
          <span className="inline-block w-2 h-5 ml-1.5 bg-emerald-400 animate-pulse align-middle rounded-sm" />
        )}
      </div>
    </div>
  );
}
