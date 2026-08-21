import { HarnessContext } from "./types";

export interface BenchmarkRecord {
  traceId: string;
  query: string;
  timestamp: number;
  stageTimings: Record<string, number>;
  totalMs: number;
  refused: boolean;
  refusalReason?: string;
  degraded?: boolean;
}

const MAX_STORE_SIZE = 500;
const traceStore: BenchmarkRecord[] = [];

/**
 * Creates a fresh HarnessContext with a new or passed traceId.
 */
export function createHarnessContext(query: string, traceId?: string): HarnessContext {
  return {
    traceId: traceId || crypto.randomUUID(),
    query,
    startedAt: Date.now(),
    stageTimings: {},
  };
}

/**
 * Records a completed stage duration in the context.
 */
export function recordStageTiming(
  ctx: HarnessContext,
  stage: string,
  durationMs: number
): void {
  ctx.stageTimings[stage] = durationMs;
}

/**
 * Flushes the completed pipeline context into the in-memory benchmark ring buffer.
 */
export function flushTrace(
  ctx: HarnessContext,
  extra: { refused?: boolean; refusalReason?: string; degraded?: boolean } = {}
): BenchmarkRecord {
  const totalMs = Date.now() - ctx.startedAt;
  const record: BenchmarkRecord = {
    traceId: ctx.traceId,
    query: ctx.query,
    timestamp: Date.now(),
    stageTimings: { ...ctx.stageTimings },
    totalMs,
    refused: extra.refused ?? false,
    refusalReason: extra.refusalReason,
    degraded: extra.degraded ?? false,
  };

  traceStore.push(record);
  if (traceStore.length > MAX_STORE_SIZE) {
    traceStore.shift();
  }

  return record;
}

function calculatePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Computes benchmark percentiles (P50, P70, P100) for a given stage or total.
 */
export function getBenchmarkStats(
  sampleSize: number = 100,
  stage: "retrieval" | "generation" | "embed" | "stt" | "total" = "total"
): {
  sampleSize: number;
  stage: string;
  p50Ms: number;
  p70Ms: number;
  p100Ms: number;
  generatedAt: string;
  recordsCount: number;
} {
  const recent = traceStore.slice(-sampleSize);
  const latencies = recent.map((r) => {
    if (stage === "total") return r.totalMs;
    return r.stageTimings[stage] ?? 0;
  }).filter((val) => val > 0);

  return {
    sampleSize,
    recordsCount: latencies.length,
    stage,
    p50Ms: calculatePercentile(latencies, 50),
    p70Ms: calculatePercentile(latencies, 70),
    p100Ms: calculatePercentile(latencies, 100),
    generatedAt: new Date().toISOString(),
  };
}

export function getAllTraces(): BenchmarkRecord[] {
  return [...traceStore];
}
