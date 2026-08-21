import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "@/lib/sarvam";
import { HarnessError } from "@/lib/harness/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required in 'audio' field." },
        {
          status: 400,
          headers: { "X-Trace-Id": traceId },
        }
      );
    }

    const result = await transcribe(audioFile);
    const sttLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        transcript: result.transcript,
        confidence: result.confidence,
        language: result.language,
        sttLatencyMs,
        traceId,
      },
      {
        status: 200,
        headers: { "X-Trace-Id": traceId },
      }
    );
  } catch (error) {
    const sttLatencyMs = Date.now() - startTime;
    console.error("[/api/transcribe] Error:", error);

    if (error instanceof HarnessError) {
      const status = error.type === "UpstreamTimeout" ? 504 : 502;
      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          sttLatencyMs,
          traceId,
        },
        {
          status,
          headers: { "X-Trace-Id": traceId },
        }
      );
    }

    return NextResponse.json(
      {
        error: (error as Error).message || "Internal server error",
        sttLatencyMs,
        traceId,
      },
      {
        status: 500,
        headers: { "X-Trace-Id": traceId },
      }
    );
  }
}
