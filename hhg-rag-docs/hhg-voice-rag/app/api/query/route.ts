import { NextRequest } from "next/server";
import { z } from "zod";
import { runPipelineStream } from "@/lib/harness/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  query: z.string().min(1, "Query is required"),
  traceId: z.string().optional(),
  sttMs: z.number().optional(),
});

// Simple in-memory IP rate limiter: 20 req/min
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60_000 });
    return true;
  }

  if (entry.count >= 30) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please wait a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    const raw = await req.json();
    body = querySchema.parse(raw);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request payload", details: (err as any).errors || err }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const traceId = body.traceId || req.headers.get("x-trace-id") || crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`[/api/query] Starting pipeline for query: "${body.query.substring(0, 60)}..." traceId=${traceId}`);
        const pipeline = runPipelineStream(
          body.query,
          { traceId, sttMs: body.sttMs },
          req.signal
        );

        for await (const event of pipeline) {
          if (event.type === "guardrail") {
            console.log(`[/api/query] [${traceId}] GUARDRAIL:`, JSON.stringify(event.data));
          } else if (event.type === "retrieval") {
            const rd = event.data as any;
            console.log(`[/api/query] [${traceId}] RETRIEVAL: ${rd.chunks?.length ?? 0} chunks, latency=${rd.retrievalLatencyMs}ms`);
          } else if (event.type === "done") {
            const dd = event.data as any;
            console.log(`[/api/query] [${traceId}] DONE: totalMs=${dd.latency?.totalMs} answer="${(dd.fullAnswer || '').substring(0, 80)}..."`);
          } else if (event.type === "error") {
            console.log(`[/api/query] [${traceId}] ERROR:`, JSON.stringify(event.data));
          }
          const sseChunk = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(sseChunk));
        }
      } catch (error) {
        const errorChunk = `event: error\ndata: ${JSON.stringify({
          message: (error as Error).message || "Stream failed",
        })}\n\n`;
        controller.enqueue(encoder.encode(errorChunk));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Trace-Id": traceId,
    },
  });
}
