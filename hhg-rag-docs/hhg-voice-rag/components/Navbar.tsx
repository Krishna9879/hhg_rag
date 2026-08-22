"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Voice RAG Chat" },
    { href: "/benchmark", label: "Latency Benchmark" },
    { href: "/about", label: "Architecture & About" },
  ];

  return (
    <header className="w-full border-b border-white/[0.08] bg-[#070A09]/70 backdrop-blur-2xl sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3.5 group shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:scale-105 group-hover:shadow-emerald-500/50 transition-all duration-300 ring-1 ring-white/20">
            <svg className="w-5 h-5 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                HHG Voice RAG
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                v1.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tracking-tight hidden sm:block">
              Indic Speech-to-Speech & Multi-Strategy RAG
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-inner">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/90 to-teal-500/90 text-white shadow-md shadow-emerald-950/50 border border-emerald-400/30"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
