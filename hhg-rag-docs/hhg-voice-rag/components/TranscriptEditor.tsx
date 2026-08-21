"use client";

import React from "react";

interface TranscriptEditorProps {
  query: string;
  onChange: (query: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export function TranscriptEditor({
  query,
  onChange,
  onSubmit,
  isLoading,
}: TranscriptEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="relative flex items-center w-full rounded-2xl bg-[#141A18] border border-white/10 shadow-lg focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <input
          id="query-input"
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="बोलें या प्रश्न टाइप करें... (e.g. भारत की राजधानी क्या है?)"
          disabled={isLoading}
          className="w-full px-5 py-4 bg-transparent text-[#F5F7F6] text-base placeholder-[#9AA6A2]/60 focus:outline-none"
        />

        <div className="pr-3 flex items-center gap-2">
          {query.trim() && (
            <button
              id="submit-query-btn"
              type="button"
              onClick={onSubmit}
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>खोज रहे हैं...</span>
              ) : (
                <>
                  <span>पूछें</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
