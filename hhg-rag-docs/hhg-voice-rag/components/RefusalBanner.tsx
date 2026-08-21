"use client";

import React from "react";

interface RefusalBannerProps {
  reason?: string;
  message?: string;
}

export function RefusalBanner({ reason, message }: RefusalBannerProps) {
  const isUngrounded = reason === "ungrounded" || !reason;
  const isUnsafe = reason === "unsafe";

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-amber-950/40 to-[#141A18]/90 border border-amber-500/35 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-fade-in">
      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      <div className="flex flex-col sm:flex-row items-start gap-5">
        {/* Guardrail Shield Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 shadow-lg shadow-amber-950/50">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-bold text-amber-200 tracking-tight">
              Safety & Groundedness Guardrail Activated
            </h3>
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {isUngrounded
                ? "RULE: COSINE_GROUNDEDNESS_FLOOR"
                : isUnsafe
                ? "RULE: PRE_CHECK_SAFETY_FILTER"
                : `RULE: ${reason?.toUpperCase()}`}
            </span>
          </div>

          <p className="text-sm sm:text-base text-[#F5F7F6]/90 leading-relaxed font-sans mt-0.5">
            {message ||
              "मुझे इस डेटासेट में इससे संबंधित प्रमाणित जानकारी नहीं मिली। कृपया कोई अन्य प्रश्न पूछें। (I couldn't find grounded information about that in this dataset.)"}
          </p>

          <div className="mt-3 pt-3 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-300/70">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Zero Hallucination Guarantee: Generation skipped to protect factual integrity</span>
            </span>
            <span className="text-[11px] text-[#9AA6A2]/80">
              Try asking about Indian geography, history, UPI, ISRO, or health
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

