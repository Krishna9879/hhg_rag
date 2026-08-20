export type HarnessErrorType =
  | "UpstreamTimeout"
  | "UpstreamError"
  | "ValidationError"
  | "GuardrailRefusal"
  | "InternalError";

export class HarnessError extends Error {
  type: HarnessErrorType;
  statusCode?: number;
  details?: unknown;

  constructor(type: HarnessErrorType, message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "HarnessError";
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export type StageResult<T> =
  | { ok: true; data: T; latencyMs: number }
  | { ok: false; error: HarnessError; latencyMs: number; attempts: number };

export interface HarnessContext {
  traceId: string;
  query: string;
  startedAt: number;
  stageTimings: Record<string, number>;
}

export interface PipelineResult {
  ok: boolean;
  answer?: string;
  chunks?: Array<{
    docId: string;
    text: string;
    score: number;
    strategy: string;
  }>;
  latency: {
    sttMs: number;
    embedMs: number;
    retrievalMs: number;
    generationMs: number;
    totalMs: number;
  };
  traceId: string;
  error?: {
    type: HarnessErrorType;
    message: string;
  };
}
