"use client";

import React, { useState, useRef } from "react";
import { MicButton } from "@/components/MicButton";
import { TranscriptEditor } from "@/components/TranscriptEditor";
import { AnswerStream } from "@/components/AnswerStream";
import { SourceCard, SourceChunkItem } from "@/components/SourceCard";
import { LatencyChips, LatencyBreakdown } from "@/components/LatencyChips";
import { RefusalBanner } from "@/components/RefusalBanner";
import { DebugPanel } from "@/components/DebugPanel";

const EXAMPLE_QUERIES = [
  { label: "National Bird of India", query: "National Bird of India.", tag: "National Symbols", tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { label: "भारत की राजधानी", query: "भारत की राजधानी क्या है?", tag: "भूगोल", tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { label: "योग दिवस", query: "अंतर्राष्ट्रीय योग दिवस कब मनाया जाता है?", tag: "स्वास्थ्य", tagColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { label: "सौर ऊर्जा", query: "सौर ऊर्जा कैसे काम करती है?", tag: "विज्ञान", tagColor: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { label: "डिजिटल इंडिया", query: "डिजिटल इंडिया मिशन का उद्देश्य क्या है?", tag: "योजनाएं", tagColor: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  { label: "इसरो मिशन", query: "इसरो के प्रमुख मिशन कौन से हैं?", tag: "अंतरिक्ष", tagColor: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "transcribing" | "querying" | "done" | "refused" | "error"
  >("idle");
  const [chunks, setChunks] = useState<SourceChunkItem[]>([]);
  const [latency, setLatency] = useState<LatencyBreakdown | undefined>(undefined);
  const [traceId, setTraceId] = useState<string>("");
  const [guardrailReason, setGuardrailReason] = useState<string | undefined>(undefined);
  const [refusalMessage, setRefusalMessage] = useState<string | undefined>(undefined);
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleTranscript = (transcriptText: string, sttMs: number, passedTraceId: string) => {
    if (!transcriptText || !transcriptText.trim()) {
      setStatus("idle");
      return;
    }
    setQuery(transcriptText);
    setTraceId(passedTraceId);
    setLatency((prev) => ({ ...prev, sttMs }));
    handleQuerySubmit(transcriptText, sttMs, passedTraceId);
  };

  const handleQuerySubmit = async (
    customQuery?: string,
    sttMsPassed?: number,
    traceIdPassed?: string
  ) => {
    const activeQuery = (customQuery !== undefined ? customQuery : query).trim();
    if (!activeQuery || isStreaming) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsStreaming(true);
    setStatus("querying");
    setAnswer("");
    setChunks([]);
    setGuardrailReason(undefined);
    setRefusalMessage(undefined);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: activeQuery,
          sttMs: sttMsPassed ?? latency?.sttMs ?? 0,
          traceId: traceIdPassed || traceId || undefined,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server error (${response.status})`);
      }

      if (!response.body) {
        throw new Error("No response body returned from query API.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let localRefused = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsStreaming(false);
          if (!localRefused) {
            setStatus("done");
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;

          const lines = eventStr.split("\n");
          let eventType = "message";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.substring(6).trim();
            }
          }

          if (!dataStr) continue;

          let parsed;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventType === "guardrail") {
            if (parsed.status === "refused") {
              localRefused = true;
              setStatus("refused");
              setGuardrailReason(parsed.reason);
              setRefusalMessage(parsed.message);
              setAnswer(parsed.message || "Query refused by system guardrail.");
              setIsStreaming(false);
            }
          } else if (eventType === "retrieval") {
            if (Array.isArray(parsed.chunks)) {
              setChunks(parsed.chunks);
            }
          } else if (eventType === "token") {
            if (!localRefused && parsed.text) {
              setAnswer((prev) => prev + parsed.text);
            }
          } else if (eventType === "done") {
            if (parsed.latency) {
              setLatency(parsed.latency);
            }
            if (parsed.traceId) {
              setTraceId(parsed.traceId);
            }
            if (!localRefused) {
              if (parsed.fullAnswer) {
                setAnswer(parsed.fullAnswer);
              }
              setStatus("done");
            }
          } else if (eventType === "error") {
            throw new Error(parsed.message || "Pipeline error");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Query failed:", err);
        setStatus("error");
        setRefusalMessage((err as Error).message);
        setIsStreaming(false);
      }
    }
  };

  const handleCitationClick = (citationIndex: number) => {
    setHighlightedChunkIndex(citationIndex);
    const elem = document.getElementById(`source-card-${citationIndex}`);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex flex-col items-center py-10 px-4 sm:px-6 relative">
      {/* Background Ambient Glow Orbs */}
      <div className="glow-orb-1" />
      <div className="glow-orb-2" />

      <div className="w-full max-w-5xl flex flex-col gap-9 relative z-10">
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center gap-4 pt-2">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono shadow-lg shadow-emerald-950/40 backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span>Indic Voice Pipeline: Sarvam STT → Multi-Vector Fusion → Groq LPU</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
            Sub-Second <span className="gradient-text-emerald">Indic Voice RAG</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl font-sans leading-relaxed">
            Ask any question in Hindi, English, or Indic dialects via voice or text. Real-time citations across 4 parallel vector chunking strategies on Qdrant Cloud.
          </p>
        </div>

        {/* Main Glass Interface Card */}
        <div className="w-full flex flex-col items-center gap-6 sm:gap-7 glass-panel rounded-3xl p-6 sm:p-9 shadow-2xl relative overflow-hidden">
          {/* Top Emerald Accent Flare */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

          {/* Voice Microphone Controller */}
          <MicButton onTranscript={handleTranscript} disabled={isStreaming} />

          {/* Text/Transcript Search Input */}
          <TranscriptEditor
            query={query}
            onChange={setQuery}
            onSubmit={() => handleQuerySubmit()}
            isLoading={isStreaming}
          />

          {/* Clean Suggestion Chips — Fixed spacing & clear badges */}
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-center gap-2.5 pt-3 border-t border-white/[0.06]">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 shrink-0">
              <span>💡 Suggestions:</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {EXAMPLE_QUERIES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(example.query);
                    handleQuerySubmit(example.query);
                  }}
                  disabled={isStreaming}
                  className="glass-pill inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white cursor-pointer disabled:opacity-40"
                >
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${example.tagColor}`}>
                    {example.tag}
                  </span>
                  <span className="font-medium">{example.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Latency Telemetry Panel */}
        {latency && (
          <div className="w-full animate-fade-in">
            <LatencyChips latency={latency} traceId={traceId} />
          </div>
        )}

        {/* Refusal Banner */}
        {status === "refused" && (
          <RefusalBanner reason={guardrailReason} message={refusalMessage} />
        )}

        {/* Error Notice */}
        {status === "error" && (
          <div className="w-full rounded-2xl bg-red-950/80 border border-red-500/40 p-5 text-red-200 text-sm font-sans flex items-center gap-3 shadow-2xl backdrop-blur-xl">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{refusalMessage || "Something went wrong while processing your request."}</span>
          </div>
        )}

        {/* Main Content Grid: Answer on Left (7 cols), Sources on Right (5 cols) */}
        {(answer || isStreaming || chunks.length > 0) && status !== "refused" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            {/* Answer Column */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <AnswerStream
                answer={answer}
                isStreaming={isStreaming}
                onCitationClick={handleCitationClick}
              />
            </div>

            {/* Retrieved Sources Column */}
            <div className="lg:col-span-5 flex flex-col gap-4 glass-panel rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Retrieved Context ({chunks.length})
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 shadow-sm">
                  RRF Rank Fusion
                </span>
              </div>

              <div className="flex flex-col gap-3.5 max-h-[560px] overflow-y-auto pr-1.5">
                {chunks.map((chunk, idx) => (
                  <SourceCard
                    key={idx}
                    index={idx}
                    chunk={chunk}
                    highlighted={highlightedChunkIndex === idx + 1}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Observability & Debug Panel */}
        {(traceId || latency) && (
          <DebugPanel
            traceId={traceId}
            latency={latency}
            chunks={chunks}
            guardrailStatus={status === "refused" ? "refused" : "pass"}
            guardrailReason={guardrailReason}
          />
        )}
      </div>
    </div>
  );
}
