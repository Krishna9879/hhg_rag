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
      <div className="relative flex items-center w-full rounded-2xl bg-black/40 border border-white/[0.12] shadow-2xl focus-within:border-emerald-500/80 focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all backdrop-blur-xl group">
        {/* Left Search Icon */}
        <div className="pl-4 sm:pl-5 text-emerald-400/70 flex items-center pointer-events-none shrink-0 group-focus-within:text-emerald-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          id="query-input"
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="बोलें या यहाँ प्रश्न टाइप करें... (e.g. National Bird of India / भारत की राजधानी)"
          disabled={isLoading}
          className="w-full px-3 sm:px-4 py-3.5 sm:py-4 bg-transparent text-white text-sm sm:text-base placeholder-slate-500 focus:outline-none font-sans min-w-0 font-medium"
        />

        <div className="pr-2.5 sm:pr-3 flex items-center gap-2 shrink-0">
          {/* Clear Button */}
          {query.trim() && !isLoading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Clear input"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Submit Button */}
          {query.trim() && (
            <button
              id="submit-query-btn"
              type="button"
              onClick={onSubmit}
              disabled={isLoading || !query.trim()}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/60 hover:shadow-emerald-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0 border border-emerald-400/30"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Ask RAG</span>
                  <kbd className="hidden sm:inline-block text-[10px] font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/20 text-emerald-200">
                    ↵
                  </kbd>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
