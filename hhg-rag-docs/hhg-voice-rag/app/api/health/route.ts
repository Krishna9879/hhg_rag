import { NextResponse } from "next/server";
import { getEnvSafe } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnvSafe();
  const status: Record<string, "ok" | "error" | "unconfigured"> = {
    sarvam: "unconfigured",
    qdrant: "unconfigured",
    groq: "unconfigured",
    embeddings: "unconfigured",
  };

  // Perform cheap checks
  if (env.SARVAM_API_KEY) {
    try {
      // Cheap ping to sarvam: check the URL or a simple metadata endpoint
      const res = await fetch(`${env.SARVAM_API_URL || "https://api.sarvam.ai"}/status`, {
        headers: { "api-key": env.SARVAM_API_KEY },
        signal: AbortSignal.timeout(2000),
      }).catch(() => null);

      if (res && (res.status === 200 || res.status === 404)) {
        // Sarvam might not have a /status endpoint (404 is still a response from their server proving connectivity)
        status.sarvam = "ok";
      } else {
        status.sarvam = "error";
      }
    } catch {
      status.sarvam = "error";
    }
  }

  if (env.QDRANT_URL) {
    try {
      const headers: Record<string, string> = {};
      if (env.QDRANT_API_KEY) {
        headers["api-key"] = env.QDRANT_API_KEY;
      }
      const res = await fetch(`${env.QDRANT_URL}/readyz`, {
        headers,
        signal: AbortSignal.timeout(2000),
      }).catch(() => null);

      if (res && res.status === 200) {
        status.qdrant = "ok";
      } else {
        status.qdrant = "error";
      }
    } catch {
      status.qdrant = "error";
    }
  }

  if (env.GROQ_API_KEY) {
    // For Groq, checking configuration is the primary liveness check without wasting tokens
    status.groq = "ok";
  }

  if (env.EMBEDDING_API_URL) {
    status.embeddings = "ok";
  }

  const isAllOk = Object.values(status).every((s) => s === "ok" || s === "unconfigured");

  return NextResponse.json(
    {
      status: isAllOk ? "ok" : "error",
      services: status,
      timestamp: new Date().toISOString(),
      envErrors: env.errors,
    },
    { status: isAllOk ? 200 : 500 }
  );
}
