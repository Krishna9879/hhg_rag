import { createHarnessContext, flushTrace } from "./trace";
import { runEmbedStage } from "./stages/embed";
import { runRetrieveStage } from "./stages/retrieve";
import { runFuseStage, FusedChunk } from "./stages/fuse";
import { runGenerateStage, runGenerateStreamStage } from "./stages/generate";
import { runPreCheckGuardrail } from "../guardrails/preCheck";
import { runGroundednessGuardrail } from "../guardrails/groundedness";
import { runPostCheckGuardrail } from "../guardrails/postCheck";
import { HarnessContext, PipelineResult } from "./types";

export interface PipelineOptions {
  traceId?: string;
  sttMs?: number;
}

export type PipelineEvent =
  | { type: "guardrail"; data: { status: "pass" | "refused"; reason: string | null; message?: string } }
  | { type: "retrieval"; data: { chunks: Array<{ docId: string; text: string; score: number; strategy: string }>; retrievalLatencyMs: number } }
  | { type: "token"; data: { text: string } }
  | { type: "done"; data: { fullAnswer: string; latency: { sttMs: number; embedMs: number; retrievalMs: number; generationMs: number; totalMs: number }; traceId: string } }
  | { type: "error"; data: { message: string } };

/**
 * Runs the full non-streaming RAG harness pipeline end-to-end.
 */
export async function runPipeline(
  query: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const ctx = createHarnessContext(query, options.traceId);
  const sttMs = options.sttMs ?? 0;

  // 1. Input Guardrail
  const preCheck = runPreCheckGuardrail(query);
  if (!preCheck.pass) {
    flushTrace(ctx, { refused: true, refusalReason: preCheck.reason });
    return {
      ok: false,
      answer: preCheck.message,
      latency: {
        sttMs,
        embedMs: 0,
        retrievalMs: 0,
        generationMs: 0,
        totalMs: Date.now() - ctx.startedAt + sttMs,
      },
      traceId: ctx.traceId,
      error: {
        type: "GuardrailRefusal",
        message: preCheck.message || "Query refused by guardrail",
      },
    };
  }

  // 2. Embedding Stage
  const embedRes = await runEmbedStage(ctx, query);
  if (!embedRes.ok) {
    flushTrace(ctx, { refused: false });
    return {
      ok: false,
      latency: {
        sttMs,
        embedMs: embedRes.latencyMs,
        retrievalMs: 0,
        generationMs: 0,
        totalMs: Date.now() - ctx.startedAt + sttMs,
      },
      traceId: ctx.traceId,
      error: {
        type: embedRes.error.type,
        message: embedRes.error.message,
      },
    };
  }

  // 3. Retrieval Stage
  const retrieveRes = await runRetrieveStage(ctx, embedRes.data);
  if (!retrieveRes.ok) {
    flushTrace(ctx, { refused: false });
    return {
      ok: false,
      latency: {
        sttMs,
        embedMs: embedRes.latencyMs,
        retrievalMs: retrieveRes.latencyMs,
        generationMs: 0,
        totalMs: Date.now() - ctx.startedAt + sttMs,
      },
      traceId: ctx.traceId,
      error: {
        type: retrieveRes.error.type,
        message: retrieveRes.error.message,
      },
    };
  }

  // 4. Fusion Stage
  const fuseRes = await runFuseStage(ctx, retrieveRes.data.resultsByStrategy);
  if (!fuseRes.ok) {
    flushTrace(ctx, { refused: false });
    return {
      ok: false,
      latency: {
        sttMs,
        embedMs: embedRes.latencyMs,
        retrievalMs: retrieveRes.latencyMs,
        generationMs: 0,
        totalMs: Date.now() - ctx.startedAt + sttMs,
      },
      traceId: ctx.traceId,
      error: {
        type: fuseRes.error.type,
        message: fuseRes.error.message,
      },
    };
  }
  const fusedChunks: FusedChunk[] = fuseRes.data.chunks;

  // 5. Groundedness Guardrail
  const groundedness = runGroundednessGuardrail(fuseRes.data.maxSimilarity);
  if (!groundedness.pass) {
    flushTrace(ctx, { refused: true, refusalReason: groundedness.reason });
    return {
      ok: true,
      answer: groundedness.message,
      chunks: fusedChunks.map((c: FusedChunk) => ({
        docId: c.docId,
        text: c.text,
        score: c.rrfScore,
        strategy: c.strategy,
      })),
      latency: {
        sttMs,
        embedMs: embedRes.latencyMs,
        retrievalMs: retrieveRes.latencyMs,
        generationMs: 0,
        totalMs: Date.now() - ctx.startedAt + sttMs,
      },
      traceId: ctx.traceId,
    };
  }

  // 6. Generation Stage
  const genRes = await runGenerateStage(ctx, query, fusedChunks);
  if (!genRes.ok) {
    flushTrace(ctx, { refused: false });
    return {
      ok: false,
      latency: {
        sttMs,
        embedMs: embedRes.latencyMs,
        retrievalMs: retrieveRes.latencyMs,
        generationMs: genRes.latencyMs,
        totalMs: Date.now() - ctx.startedAt + sttMs,
      },
      traceId: ctx.traceId,
      error: {
        type: genRes.error.type,
        message: genRes.error.message,
      },
    };
  }

  // 7. PostCheck Output Guardrail
  const postCheck = runPostCheckGuardrail(genRes.data.fullAnswer, fusedChunks);

  flushTrace(ctx, { refused: false, degraded: retrieveRes.data.degraded });

  return {
    ok: true,
    answer: postCheck.remediatedAnswer,
    chunks: fusedChunks.map((c: FusedChunk) => ({
      docId: c.docId,
      text: c.text,
      score: c.rrfScore,
      strategy: c.strategy,
    })),
    latency: {
      sttMs,
      embedMs: embedRes.latencyMs,
      retrievalMs: retrieveRes.latencyMs,
      generationMs: genRes.latencyMs,
      totalMs: Date.now() - ctx.startedAt + sttMs,
    },
    traceId: ctx.traceId,
  };
}

/**
 * Runs the full streaming RAG harness pipeline, yielding Server-Sent Events.
 */
export async function* runPipelineStream(
  query: string,
  options: PipelineOptions = {},
  signal?: AbortSignal
): AsyncGenerator<PipelineEvent, void, unknown> {
  const ctx = createHarnessContext(query, options.traceId);
  const sttMs = options.sttMs ?? 0;

  // 1. Input Guardrail
  const preCheck = runPreCheckGuardrail(query);
  if (!preCheck.pass) {
    yield {
      type: "guardrail",
      data: { status: "refused", reason: preCheck.reason || "unsafe", message: preCheck.message },
    };
    yield {
      type: "done",
      data: {
        fullAnswer: preCheck.message || "Query refused by guardrail.",
        latency: {
          sttMs,
          embedMs: 0,
          retrievalMs: 0,
          generationMs: 0,
          totalMs: Date.now() - ctx.startedAt + sttMs,
        },
        traceId: ctx.traceId,
      },
    };
    flushTrace(ctx, { refused: true, refusalReason: preCheck.reason });
    return;
  }

  yield { type: "guardrail", data: { status: "pass", reason: null } };

  // 2. Embedding Stage
  const embedRes = await runEmbedStage(ctx, query);
  if (!embedRes.ok) {
    yield { type: "error", data: { message: embedRes.error.message } };
    flushTrace(ctx, { refused: false });
    return;
  }

  // 3. Retrieval Stage
  const retrieveRes = await runRetrieveStage(ctx, embedRes.data);
  if (!retrieveRes.ok) {
    yield { type: "error", data: { message: retrieveRes.error.message } };
    flushTrace(ctx, { refused: false });
    return;
  }

  // 4. Fusion Stage
  const fuseRes = await runFuseStage(ctx, retrieveRes.data.resultsByStrategy);
  if (!fuseRes.ok) {
    yield { type: "error", data: { message: fuseRes.error.message } };
    flushTrace(ctx, { refused: false });
    return;
  }
  const fusedChunks: FusedChunk[] = fuseRes.data.chunks;

  yield {
    type: "retrieval",
    data: {
      chunks: fusedChunks.map((c: FusedChunk) => ({
        docId: c.docId,
        text: c.text,
        score: Number(c.rrfScore.toFixed(4)),
        strategy: c.strategy,
      })),
      retrievalLatencyMs: retrieveRes.latencyMs + fuseRes.latencyMs,
    },
  };

  // 5. Groundedness Guardrail
  const groundedness = runGroundednessGuardrail(fuseRes.data.maxSimilarity);
  if (!groundedness.pass) {
    yield {
      type: "guardrail",
      data: { status: "refused", reason: "ungrounded", message: groundedness.message },
    };
    yield {
      type: "done",
      data: {
        fullAnswer: groundedness.message || "No grounded answer available.",
        latency: {
          sttMs,
          embedMs: embedRes.latencyMs,
          retrievalMs: retrieveRes.latencyMs,
          generationMs: 0,
          totalMs: Date.now() - ctx.startedAt + sttMs,
        },
        traceId: ctx.traceId,
      },
    };
    flushTrace(ctx, { refused: true, refusalReason: "ungrounded" });
    return;
  }

  // 6. Generation Stage (Streaming)
  const genStart = Date.now();
  let fullAnswer = "";

  try {
    for await (const token of runGenerateStreamStage(ctx, query, fusedChunks, signal)) {
      fullAnswer += token;
      yield { type: "token", data: { text: token } };
    }
  } catch (err) {
    yield { type: "error", data: { message: `Streaming error: ${(err as Error).message}` } };
    return;
  }

  const generationMs = Date.now() - genStart;

  // 7. PostCheck Output Guardrail
  const postCheck = runPostCheckGuardrail(fullAnswer, fusedChunks);

  yield {
    type: "done",
    data: {
      fullAnswer: postCheck.remediatedAnswer,
      latency: {
        sttMs,
        embedMs: embedRes.latencyMs,
        retrievalMs: retrieveRes.latencyMs,
        generationMs,
        totalMs: Date.now() - ctx.startedAt + sttMs,
      },
      traceId: ctx.traceId,
    },
  };

  flushTrace(ctx, { refused: false, degraded: retrieveRes.data.degraded });
}
