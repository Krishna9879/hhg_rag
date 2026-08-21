"use client";

import React, { useState, useEffect } from "react";

interface BenchmarkStats {
  sampleSize: number;
  recordsCount: number;
  stage: string;
  p50Ms: number;
  p70Ms: number;
  p100Ms: number;
  generatedAt: string;
}

export default function BenchmarkPage() {
  const [stats, setStats] = useState<BenchmarkStats | null>(null);
  const [stage, setStage] = useState<"total" | "retrieval" | "generation" | "embed" | "stt">("total");
  const [isRunning, setIsRunning] = useState(false);
  const [jobProgress, setJobProgress] = useState<{ completed: number; total: number } | null>(null);
  const [csvUrl, setCsvUrl] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/benchmark?stage=${stage}&n=100`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch benchmark stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, [stage]);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    setJobProgress({ completed: 0, total: 50 });
    setCsvUrl(null);

    try {
      const res = await fetch("/api/benchmark/run", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start benchmark job");

      const data = await res.json();
      const jobId = data.jobId;

      // Poll job status
      const pollTimer = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/benchmark/run?jobId=${jobId}`);
          if (pollRes.ok) {
            const jobData = await pollRes.json();
            setJobProgress({
              completed: jobData.completedQueries,
              total: jobData.totalQueries,
            });

            if (jobData.status === "done") {
              clearInterval(pollTimer);
              setIsRunning(false);
              setCsvUrl(jobData.resultCsvUrl || "/reports/latest.csv");
              fetchStats();
            } else if (jobData.status === "error") {
              clearInterval(pollTimer);
              setIsRunning(false);
              alert("Benchmark execution encountered an error.");
            }
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 1500);
    } catch (err) {
      console.error("Benchmark launch error:", err);
      setIsRunning(false);
      alert("Failed to start benchmark.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Latency Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Latency Benchmark & Telemetry
            </h1>
            <p className="text-sm text-[#9AA6A2] font-sans mt-1">
              Live P50 / P70 / P100 percentile distributions across all RAG pipeline stages.
            </p>
          </div>

          <button
            id="run-benchmark-btn"
            type="button"
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
          >
            {isRunning ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Evaluating ({jobProgress?.completed}/{jobProgress?.total})...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Run 50-Query Benchmark</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar when running */}
        {isRunning && jobProgress && (
          <div className="w-full bg-[#141A18]/90 border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-2 shadow-lg animate-pulse backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-mono text-[#9AA6A2]">
              <span>Running automated evaluation against 50 evaluation queries...</span>
              <span className="text-emerald-400 font-bold">
                {Math.round((jobProgress.completed / jobProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${(jobProgress.completed / jobProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Download CSV Link */}
        {csvUrl && (
          <div className="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg backdrop-blur-xl">
            <span className="text-sm text-emerald-200">
              Benchmark complete! Results exported to <strong>{csvUrl}</strong>
            </span>
            <a
              href={csvUrl}
              download="benchmark-report.csv"
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition-colors shadow"
            >
              Download CSV
            </a>
          </div>
        )}

        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(["total", "retrieval", "generation", "embed", "stt"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                stage === s
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "bg-[#141A18]/80 text-[#9AA6A2] hover:text-white border border-white/[0.08] hover:border-white/20"
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Latency Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-3xl bg-[#141A18]/90 border border-white/[0.08] p-6 shadow-xl flex flex-col gap-2 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/40" />
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              P50 Latency (Median)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-white">
                {stats ? stats.p50Ms : "--"}
              </span>
              <span className="text-sm font-mono text-[#9AA6A2]">ms</span>
            </div>
            <span className="text-xs text-[#9AA6A2]/70 font-mono mt-1">
              50% of requests finish faster than this
            </span>
          </div>

          <div className="rounded-3xl bg-[#141A18]/90 border border-white/[0.08] p-6 shadow-xl flex flex-col gap-2 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/40" />
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              P70 Latency
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-white">
                {stats ? stats.p70Ms : "--"}
              </span>
              <span className="text-sm font-mono text-[#9AA6A2]">ms</span>
            </div>
            <span className="text-xs text-[#9AA6A2]/70 font-mono mt-1">
              70% of requests finish faster than this
            </span>
          </div>

          <div className="rounded-3xl bg-[#141A18]/90 border border-white/[0.08] p-6 shadow-xl flex flex-col gap-2 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500/40" />
            <span className="text-xs font-mono font-semibold text-purple-400 uppercase tracking-wider">
              P100 (Max / Worst-Case)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-white">
                {stats ? stats.p100Ms : "--"}
              </span>
              <span className="text-sm font-mono text-[#9AA6A2]">ms</span>
            </div>
            <span className="text-xs text-[#9AA6A2]/70 font-mono mt-1">
              Maximum observed latency in window
            </span>
          </div>
        </div>

        {/* Target Latency Budgets Table */}
        <div className="rounded-3xl bg-[#141A18]/90 border border-white/[0.08] p-6 sm:p-8 shadow-xl flex flex-col gap-4 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Architectural Latency Budgets vs SLA</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-[#9AA6A2]">
              <thead>
                <tr className="border-b border-white/10 text-white/80">
                  <th className="pb-3">Stage</th>
                  <th className="pb-3">Hard Timeout Budget</th>
                  <th className="pb-3">Retry Strategy</th>
                  <th className="pb-3">Graceful Fallback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 text-white font-medium">STT (Sarvam AI)</td>
                  <td className="py-3 text-amber-400 font-semibold">5000ms</td>
                  <td className="py-3">1 retry (backoff [0, 150ms])</td>
                  <td className="py-3">Manual text prompt fallback</td>
                </tr>
                <tr>
                  <td className="py-3 text-white font-medium">Embedding (Jina / E5)</td>
                  <td className="py-3 text-blue-400 font-semibold">2000ms</td>
                  <td className="py-3">1 retry</td>
                  <td className="py-3">Clean AbortSignal cancellation</td>
                </tr>
                <tr>
                  <td className="py-3 text-white font-medium">Qdrant Vector Retrieval</td>
                  <td className="py-3 text-purple-400 font-semibold">4000ms</td>
                  <td className="py-3">Parallel 4-collection search</td>
                  <td className="py-3">Proceed with surviving collections</td>
                </tr>
                <tr>
                  <td className="py-3 text-white font-medium">Fusion & Rerank (RRF)</td>
                  <td className="py-3 text-teal-400 font-semibold">20ms</td>
                  <td className="py-3">In-memory CPU execution</td>
                  <td className="py-3">Reciprocal Rank Fusion (K=60)</td>
                </tr>
                <tr>
                  <td className="py-3 text-white font-medium">LLM Generation (Groq)</td>
                  <td className="py-3 text-emerald-400 font-semibold">2500ms</td>
                  <td className="py-3">1 retry</td>
                  <td className="py-3">Auto model downgrade (70B → 8B)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
