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
  { label: "भारत की राजधानी", query: "भारत की राजधानी क्या है?", tag: "भूगोल" },
  { label: "योग दिवस", query: "अंतर्राष्ट्रीय योग दिवस कब मनाया जाता है?", tag: "स्वास्थ्य" },
  { label: "सौर ऊर्जा", query: "सौर ऊर्जा कैसे काम करती है?", tag: "विज्ञान" },
  { label: "डिजिटल इंडिया", query: "डिजिटल इंडिया मिशन का उद्देश्य क्या है?", tag: "योजनाएं" },
  { label: "इसरो मिशन", query: "इसरो के प्रमुख मिशन कौन से हैं?", tag: "अंतरिक्ष" },
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
    // Auto-trigger query flow
    handleQuerySubmit(transcriptText, sttMs, passedTraceId);
  };

  const handleQuerySubmit = async (
    customQuery?: string,
    sttMs: number = 0,
    customTraceId?: string
  ) => {
    const textToQuery = (customQuery || query).trim();
    if (!textToQuery) return;

    // Reset state for new query
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("querying");
    setAnswer("");
    setChunks([]);
    setGuardrailReason(undefined);
    setRefusalMessage(undefined);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToQuery,
          sttMs,
          traceId: customTraceId || traceId || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response stream available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let localRefused = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventLine = block.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));

          if (!dataLine) continue;
          const eventType = eventLine ? eventLine.replace("event: ", "").trim() : "message";
          const rawData = dataLine.replace("data: ", "").trim();

          let parsed: any = {};
          try {
            parsed = JSON.parse(rawData);
          } catch {
            continue;
          }

          console.log(`[SSE] event=${eventType}`, parsed);

          if (eventType === "guardrail") {
            if (parsed.status === "refused") {
              localRefused = true;
              setStatus("refused");
              setGuardrailReason(parsed.reason);
              setRefusalMessage(parsed.message);
              setIsStreaming(false);
            }
          } else if (eventType === "retrieval") {
            setChunks(parsed.chunks || []);
          } else if (eventType === "token") {
            if (!localRefused) {
              setAnswer((prev) => prev + (parsed.text || ""));
            }
          } else if (eventType === "done") {
            setLatency(parsed.latency);
            setTraceId(parsed.traceId);
            setIsStreaming(false);
            if (!localRefused) {
              // Only overwrite answer from done event if it's meaningful
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
    <div className="min-h-[calc(100vh-4.5rem)] flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-5xl flex flex-col gap-10">
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Indic Voice Pipeline: Sarvam STT → Multi-Chunk Fusion → Groq LPU</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
            Sub-Second <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">Indic Voice RAG</span>
          </h1>

          <p className="text-sm sm:text-base text-[#9AA6A2] max-w-2xl font-sans leading-relaxed">
            Ask any question in Hindi or English using voice or text. Grounded in the MSMARCO-XI dataset via 4 parallel vector chunking strategies with strict sub-second latency budgets.
          </p>
        </div>

        {/* Input Interface Card */}
        <div className="w-full flex flex-col items-center gap-6 sm:gap-7 bg-gradient-to-b from-[#141A18]/90 to-[#0F1413]/90 border border-white/[0.08] rounded-3xl p-4 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

          {/* Voice Microphone Controller */}
          <MicButton onTranscript={handleTranscript} disabled={isStreaming} />

          {/* Text/Transcript Editor */}
          <TranscriptEditor
            query={query}
            onChange={setQuery}
            onSubmit={() => handleQuerySubmit()}
            isLoading={isStreaming}
          />

          {/* Quick Example Queries */}
          <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-white/5">
            <span className="text-xs text-[#9AA6A2]/70 font-mono mr-1 flex items-center gap-1">
              <span>💡 Suggestions:</span>
            </span>
            {EXAMPLE_QUERIES.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(example.query);
                  handleQuerySubmit(example.query);
                }}
                disabled={isStreaming}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 text-xs text-[#9AA6A2] hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 cursor-pointer disabled:opacity-40"
              >
                <span className="text-[10px] font-mono text-[#9AA6A2]/50 bg-black/30 px-1 py-0.5 rounded">
                  {example.tag}
                </span>
                <span>{example.label}</span>
              </button>
            ))}
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

        {/* Error State */}
        {status === "error" && (
          <div className="w-full rounded-2xl bg-red-950/60 border border-red-500/40 p-5 text-red-200 text-sm font-sans flex items-center gap-3">
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
            <div className="lg:col-span-5 flex flex-col gap-4 bg-[#141A18]/60 border border-white/[0.08] rounded-3xl p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                  <span className="text-xs font-mono font-bold text-[#F5F7F6] uppercase tracking-wider">
                    Retrieved Context ({chunks.length})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  RRF Rank Fusion
                </span>
              </div>

              <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1">
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
