import { NextRequest, NextResponse } from "next/server";
import { getBenchmarkStats } from "@/lib/harness/trace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const n = parseInt(searchParams.get("n") || "100", 10);
  const stage = (searchParams.get("stage") || "total") as
    | "retrieval"
    | "generation"
    | "embed"
    | "stt"
    | "total";

  const stats = getBenchmarkStats(n, stage);

  return NextResponse.json(stats, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
