"use client";

import React from "react";

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
  if (!answer && !isStreaming) return null;

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
            className="inline-flex items-center justify-center px-1.5 py-0.5 mx-1 text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded cursor-pointer transition-colors"
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
    <div className="w-full rounded-2xl bg-[#141A18] border border-white/10 p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-medium text-emerald-400 uppercase tracking-wider">
            Grounded Answer / प्रमाणित उत्तर
          </span>
        </div>
        {isStreaming && (
          <span className="text-xs text-amber-400/90 font-mono animate-pulse">
            Generating tokens...
          </span>
        )}
      </div>

      <div className="text-[#F5F7F6] text-lg leading-relaxed whitespace-pre-wrap font-sans">
        {renderFormattedText(answer)}
        {isStreaming && (
          <span className="inline-block w-2 h-5 ml-1 bg-emerald-400 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
