import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runPipeline } from "@/lib/harness/orchestrator";
import { getBenchmarkStats } from "@/lib/harness/trace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BenchmarkJob {
  jobId: string;
  status: "running" | "done" | "error";
  totalQueries: number;
  completedQueries: number;
  startTime: number;
  finishTime?: number;
  resultCsvUrl?: string;
  summary?: any;
}

const activeJobs = new Map<string, BenchmarkJob>();

export async function POST(req: NextRequest) {
  const jobId = crypto.randomUUID();
  const queriesPath = path.join(process.cwd(), "data", "eval-queries.json");

  if (!fs.existsSync(queriesPath)) {
    return NextResponse.json(
      { error: "data/eval-queries.json not found" },
      { status: 404 }
    );
  }

  const queries: string[] = JSON.parse(fs.readFileSync(queriesPath, "utf-8"));

  const job: BenchmarkJob = {
    jobId,
    status: "running",
    totalQueries: queries.length,
    completedQueries: 0,
    startTime: Date.now(),
  };

  activeJobs.set(jobId, job);

  // Run benchmark sequentially in background
  (async () => {
    const records: Array<{
      query: string;
      ok: boolean;
      embedMs: number;
      retrievalMs: number;
      generationMs: number;
      totalMs: number;
    }> = [];

    const reportsDir = path.join(process.cwd(), "public", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      try {
        const res = await runPipeline(q);
        records.push({
          query: q,
          ok: res.ok,
          embedMs: res.latency.embedMs,
          retrievalMs: res.latency.retrievalMs,
          generationMs: res.latency.generationMs,
          totalMs: res.latency.totalMs,
        });
      } catch (err) {
        records.push({
          query: q,
          ok: false,
          embedMs: 0,
          retrievalMs: 0,
          generationMs: 0,
          totalMs: 0,
        });
      }
      job.completedQueries = i + 1;
    }

    // Write CSV
    const csvHeader = "query,ok,embedMs,retrievalMs,generationMs,totalMs\n";
    const csvRows = records
      .map(
        (r) =>
          `"${r.query.replace(/"/g, '""')}",${r.ok},${r.embedMs},${r.retrievalMs},${r.generationMs},${r.totalMs}`
      )
      .join("\n");

    const csvPath = path.join(reportsDir, "latest.csv");
    fs.writeFileSync(csvPath, csvHeader + csvRows, "utf-8");

    job.status = "done";
    job.finishTime = Date.now();
    job.resultCsvUrl = "/reports/latest.csv";
    job.summary = getBenchmarkStats(queries.length, "total");
  })().catch((err) => {
    console.error("Benchmark job failed:", err);
    job.status = "error";
  });

  return NextResponse.json(
    { jobId, status: "started", totalQueries: queries.length },
    { status: 202 }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { error: "jobId query param required" },
      { status: 400 }
    );
  }

  const job = activeJobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job, { status: 200 });
}
