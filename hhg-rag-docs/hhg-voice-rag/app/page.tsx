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
  "भारत की राजधानी क्या है?",
  "अंतर्राष्ट्रीय योग दिवस कब मनाया जाता है?",
  "सौर ऊर्जा कैसे काम करती है?",
  "डिजिटल इंडिया मिशन का उद्देश्य क्या है?",
  "इसरो के प्रमुख मिशन कौन से हैं?",
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

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.replace("event: ", "").trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.replace("data: ", "").trim();
            }
          }

          if (!dataStr) continue;
          const parsed = JSON.parse(dataStr);

          if (eventType === "guardrail") {
            if (parsed.status === "refused") {
              setStatus("refused");
              setGuardrailReason(parsed.reason);
              setRefusalMessage(parsed.message);
            }
          } else if (eventType === "retrieval") {
            if (parsed.chunks) {
              setChunks(parsed.chunks);
            }
            if (parsed.retrievalLatencyMs) {
              setLatency((prev) => ({
                ...prev,
                retrievalMs: parsed.retrievalLatencyMs,
              }));
            }
          } else if (eventType === "token") {
            if (parsed.text) {
              setAnswer((prev) => prev + parsed.text);
            }
          } else if (eventType === "done") {
            if (parsed.fullAnswer) {
              setAnswer(parsed.fullAnswer);
            }
            if (parsed.latency) {
              setLatency(parsed.latency);
            }
            if (parsed.traceId) {
              setTraceId(parsed.traceId);
            }
            setIsStreaming(false);
            if (status !== "refused") {
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
      }
    } finally {
      setIsStreaming(false);
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Pipeline: Sarvam STT → Multi-Chunk Fusion → Groq LLM
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#F5F7F6] tracking-tight">
            High-Performance Indic Voice RAG
          </h1>
          <p className="text-sm sm:text-base text-[#9AA6A2] max-w-2xl">
            Ask any question in Hindi or English using voice or text. Answers are strictly grounded in the MSMARCO-XI dataset via 4 parallel vector chunking strategies with hard sub-second latency budgets.
          </p>
        </div>

        {/* Input Interface */}
        <div className="w-full flex flex-col items-center gap-6 bg-[#141A18]/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <MicButton onTranscript={handleTranscript} disabled={isStreaming} />

          <TranscriptEditor
            query={query}
            onChange={setQuery}
            onSubmit={() => handleQuerySubmit()}
            isLoading={isStreaming}
          />

          {/* Quick Example Queries */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-[#9AA6A2] font-mono mr-1">Try:</span>
            {EXAMPLE_QUERIES.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(example);
                  handleQuerySubmit(example);
                }}
                disabled={isStreaming}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#9AA6A2] hover:text-[#F5F7F6] border border-white/5 hover:border-white/15 transition-all cursor-pointer disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Latency Telemetry Chips */}
        {latency && (
          <div className="w-full">
            <LatencyChips latency={latency} traceId={traceId} />
          </div>
        )}

        {/* Refusal Banner */}
        {status === "refused" && (
          <RefusalBanner reason={guardrailReason} message={refusalMessage} />
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="w-full rounded-2xl bg-red-950/40 border border-red-500/30 p-5 text-red-200 text-sm">
            <strong>Error:</strong> {refusalMessage || "Something went wrong while processing your request."}
          </div>
        )}

        {/* Main Content Grid: Answer on Left, Sources on Right */}
        {(answer || isStreaming || chunks.length > 0) && status !== "refused" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            {/* Answer Column */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <AnswerStream
                answer={answer}
                isStreaming={isStreaming}
                onCitationClick={handleCitationClick}
              />
            </div>

            {/* Retrieved Sources Column */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-[#9AA6A2] uppercase tracking-wider">
                    Retrieved Context ({chunks.length})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#9AA6A2]/70">
                  Fused via RRF
                </span>
              </div>

              <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
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
