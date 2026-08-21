"use client";

import React from "react";

interface RefusalBannerProps {
  reason?: string;
  message?: string;
}

export function RefusalBanner({ reason, message }: RefusalBannerProps) {
  return (
    <div className="w-full rounded-2xl bg-amber-950/30 border border-amber-500/30 p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-amber-300">
              Guardrail Triggered / सुरक्षा प्रतिबंध
            </span>
            {reason && (
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {reason}
              </span>
            )}
          </div>

          <p className="text-sm text-amber-200/90 leading-relaxed font-sans mt-1">
            {message ||
              "I couldn't find grounded information about that in this dataset, so I don't want to guess. Try rephrasing, or ask about science, history, geography, health, or technology."}
          </p>
        </div>
      </div>
    </div>
  );
}
