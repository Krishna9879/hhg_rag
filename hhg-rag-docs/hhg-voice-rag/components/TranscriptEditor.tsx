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
      <div className="relative flex items-center w-full rounded-2xl bg-[#141A18]/90 border border-white/10 shadow-xl focus-within:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/15 transition-all">
        {/* Left Search Icon */}
        <div className="pl-5 text-[#9AA6A2]/70 flex items-center pointer-events-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
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
          placeholder="बोलें या यहाँ प्रश्न टाइप करें... (e.g. भारत की राजधानी क्या है?)"
          disabled={isLoading}
          className="w-full px-4 py-4 bg-transparent text-[#F5F7F6] text-base placeholder-[#9AA6A2]/50 focus:outline-none font-sans"
        />

        <div className="pr-3 flex items-center gap-2">
          {/* Clear Button */}
          {query.trim() && !isLoading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 rounded-lg text-[#9AA6A2] hover:text-white hover:bg-white/10 transition-colors"
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
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
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
                  <kbd className="hidden sm:inline-block text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/20">
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
